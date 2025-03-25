import { prisma } from "../config/db/index.js";
import { getIo } from "../config/socket/index.js";
import { formatApiResponse } from "../utils/helper.js";
import { genAI } from "../config/ai/index.js";
import crypto from "node:crypto";

class AnswerController {
  static async createAnswer(req, res, next) {
    const { questionId } = req.params;
    const { content } = req.body;
    const username = req.user.name;
    const userId = req.user.id;

    try {
      const question = await prisma.question.findUnique({
        where: { id: questionId },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      const answer = await prisma.answer.create({
        data: {
          content,
          userId,
          questionId: questionId,
        },
      });

      const createdAnswer = await prisma.answer.findFirst({
        where: { id: answer.id },
        include: {
          user: {
            select: {
              name: true,
              picture: true,
              id: true,
            },
          },
        },
      });

      const notification = await prisma.notification.create({
        data: {
          userId: question.userId,
          content: `${username} replied to your question ${question.title}`,
          href: `/view/question/${question.id}`,
          answerId: answer.id,
        },
      });

      const io = getIo();
      if (io) {
        io.to(`user-${question.userId}`).emit("new_notification", notification);
      }

      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            { ...createdAnswer, votes: 0, selfVote: 0 },
            "Answer created successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async getAnswer(req, res, next) {
    const { questionId } = req.params;
    try {
      const question = await prisma.question.findUnique({
        where: { id: Number(questionId) },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      const answers = await prisma.answer.findMany({
        where: { questionId: Number(questionId) },
        include: {
          user: {
            select: {
              name: true,
              picture: true,
              id: true,
            },
          },
        },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            answers,
            "Answers retrieved successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async updateAnswer(req, res, next) {
    const { answerId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
      });

      if (!answer) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Answer not found"));
      }

      if (answer.userId !== userId) {
        return res
          .status(403)
          .json(
            formatApiResponse(
              403,
              false,
              null,
              "You do not have permission to update this answer",
            ),
          );
      }

      const updatedAnswer = await prisma.answer.update({
        where: { id: answerId },
        data: { content },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            updatedAnswer,
            "Answer updated successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async deleteAnswer(req, res, next) {
    const { answerId } = req.params;
    const userId = req.user.id;
    try {
      const answer = await prisma.answer.findUnique({
        where: { id: answerId },
      });

      if (!answer) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Answer not found"));
      }
      if (answer.userId !== userId) {
        return res
          .status(403)
          .json(
            formatApiResponse(
              403,
              false,
              null,
              "You do not have permission to delete this answer",
            ),
          );
      }

      await prisma.answer.delete({
        where: { id: answerId },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(200, true, null, "Answer deleted successfully"),
        );
    } catch (error) {
      next(error);
    }
  }
  static async askieAnswer(req, res, next) {
    const { query } = req.body;
    const user = req.user;

    const PREMIUM_QUERY_LIMIT = 50;
    const REGULAR_QUERY_LIMIT = 10;

    try {
      if (!query || !query.trim()) {
        return res
          .status(400)
          .json(formatApiResponse(400, false, null, "Query cannot be empty"));
      }

      const today = new Date();
      const lastData = new Date(user?.lastAskieUsed);

      // Reset quota if a new day
      if (today.toDateString() !== lastData.toDateString()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            premiumAskieQuota: user.isPremium ? PREMIUM_QUERY_LIMIT : undefined,
            freeAskieQuota: !user.isPremium ? REGULAR_QUERY_LIMIT : undefined,
            lastAskieUsed: today,
          },
        });
      }

      // Check quota
      if (user.isPremium) {
        if (user.premiumAskieQuota <= 0) {
          return res
            .status(400)
            .json(
              formatApiResponse(400, false, null, "Daily Usage Limit Reached."),
            );
        }
      } else {
        if (user.freeAskieQuota <= 0) {
          return res
            .status(400)
            .json(
              formatApiResponse(400, false, null, "Free Usage Limit Reached."),
            );
        }
      }

      const generationConfig = {
        temperature: 0.5,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 300,
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
      });

      let sessionId = null;
      let history = [];

      // 💡 Fetch session history by both sessionId and userId
      const lastSession = await prisma.chatSession.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      sessionId = lastSession ? lastSession.sessionId : crypto.randomUUID();

      const chatHistory = await prisma.chatSession.findMany({
        where: {
          OR: [
            { sessionId },
            { userId: user.id }, // Fetching all user-related history
          ],
        },
        orderBy: { createdAt: "asc" },
        take: 10,
      });

      history = chatHistory.map((msg) => {
        return {
          role: msg.role === "user" ? "user" : "model", // ✅ Correct role mapping
          parts: [{ text: msg.message }],
        };
      });

      const prompt = `
You are Askie Bot, a friendly and knowledgeable technical assistant, capable of answering **programming and tech-related queries** and handling **follow-ups naturally**.

### 🎯 **Your Role:**
- **Primary Focus:** Help with coding problems, algorithms, libraries, frameworks, tools, environments, and general technical knowledge.
- **Personality:** Friendly, concise, and always helpful.
- **Answer Style:** 
  - **Direct:** Provide clear solutions or explanations.
  - **Brief Code Examples:** Include relevant code snippets.
  - **Conversational:** Use a warm and engaging tone.
  - **Contextual:** Continue the conversation smoothly, especially for follow-up questions.

### ✅ **Rules:**
1. **Answer all programming and tech-related questions**, including:
   - Languages, libraries, frameworks, and APIs.
   - Algorithms, data structures, and best practices.
   - Tools, compilers, IDEs, environments, and technical terms.
   - General coding knowledge, debugging tips, and optimizations.
2. **Friendly and conversational:**  
   - Respond warmly to greetings like:  
     \`"hello", "hi", "hey", "good morning", "good evening", "how are you?"\`  
   - Example response:  
     \`"Hey! 👋 How can I help you with programming or tech-related queries today?"\`
3. **Recognize broad and ambiguous tech queries**:  
   - Examples:  
     \`"React", "Redis", "compiler", "runtime", "Docker", "SQL"\`  
   - ✅ Treat them as valid tech queries and provide a brief definition or explanation.  
4. **Handle follow-up questions intelligently:**  
   - If the follow-up is related to the previous query, provide more details or expand the explanation.  
   - Example:  
     - **User:** "React"  
     - **Bot:** "React is a JavaScript library for building user interfaces."  
     - **User:** "Tell me more about it"  
     - ✅ **Bot:** "React uses a virtual DOM for efficient rendering, supports component-based architecture, and offers hooks for managing state and side effects."  
5. **Handle loosely phrased or vague tech questions**:  
   - Make a reasonable attempt to answer them rather than rejecting them.  
   - Do NOT dismiss them unless clearly off-topic.  
6. **Include brief, working code snippets** if applicable.
7. **Explain when necessary**, but keep it concise and easy to understand.
8. **For clearly off-topic questions** (e.g., geography, trivia), respond with:  
   \`"I'm not sure about that. Can you ask something programming or tech-related?"\`

### 💡 **Answer Formatting:**
- Always return the answer as a JSON object:  
\`\`\`json
{ "message": "<your concise answer or code snippet>" }
\`\`\`

### 🚀 **Example Queries and Responses:**
- **Query:** "React"  
  **Output:**  
\`\`\`json
{ "message": "React is a popular JavaScript library for building user interfaces, primarily for single-page applications." }
\`\`\`

- **Query:** "Tell me more about it" (follow-up)  
  **Output:**  
\`\`\`json
{ "message": "React uses a virtual DOM for efficient rendering, supports component-based architecture, and offers hooks for managing state and side effects." }
\`\`\`

- **Query:** "Redis"  
  **Output:**  
\`\`\`json
{ "message": "Redis is an open-source, in-memory data store used as a cache, message broker, or database." }
\`\`\`

- **Query:** "How do I reverse a string in Python?"  
  **Output:**  
\`\`\`json
{ "message": "You can reverse a string using slicing: \`reversed_str = my_string[::-1]\`" }
\`\`\`

- **Query:** "hello"  
  **Output:**  
\`\`\`json
{ "message": "Hey! 👋 How can I help you with programming or tech-related queries today?" }
\`\`\`

- **Query:** "What is the capital of France?"  
  **Output:**  
\`\`\`json
{ "message": "I'm not sure about that. Can you ask something programming or tech-related?" }
\`\`\`

### 🚀 **User Query:**  
"${query}"

**Output:**  
- ✅ **For tech-related queries**, return:  
\`\`\`json
{ "message": "<your concise answer or code snippet>" }
\`\`\`
- ✅ **For follow-ups**, provide additional relevant details:  
\`\`\`json
{ "message": "<expanded explanation or details>" }
\`\`\`
- ✅ **For greetings**, return:  
\`\`\`json
{ "message": "Hey! 👋 How can I help you with programming or tech-related queries today?" }
\`\`\`
- ❌ **For clearly irrelevant questions**, return:  
\`\`\`json
{ "message": "I'm not sure about that. Can you ask something programming or tech-related?" }
\`\`\`
`;

      const chatSession = await model.startChat({
        generationConfig,
        history,
      });

      const result = await chatSession.sendMessage(prompt);
      let responseText = result.response.text().trim();

      let message =
        "I'm not sure about that. Can you ask something coding-related?";

      try {
        responseText = responseText.replace(/^```json|```$/g, "").trim();
        const aiResponse = JSON.parse(responseText);

        if (aiResponse.message && typeof aiResponse.message === "string") {
          message = aiResponse.message;
        }
      } catch (error) {
        console.error("Error parsing AI response:", error);
      }

      // Store user query and AI response
      await prisma.chatSession.create({
        data: {
          userId: user.id,
          sessionId,
          message: query,
          role: "user",
        },
      });

      await prisma.chatSession.create({
        data: {
          userId: user.id,
          sessionId,
          message,
          role: "model", // ✅ Use "model" instead of "assistant"
        },
      });

      // Update quota
      await prisma.user.update({
        where: { id: user.id },
        data: {
          premiumAskieQuota: user.isPremium ? { decrement: 1 } : undefined,
          freeAskieQuota: !user.isPremium ? { decrement: 1 } : undefined,
        },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { message },
            "Answer retrieved successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
}

export { AnswerController };
