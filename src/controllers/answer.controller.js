import { prisma } from "../config/db/index.js";
import { getIo } from "../config/socket/index.js";
import { formatApiResponse } from "../utils/helper.js";
import { genAI } from "../config/ai/index.js";

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

    try {
      if (!query || !query.trim()) {
        return res
          .status(400)
          .json(formatApiResponse(400, false, null, "Query cannot be empty"));
      }

      const today = new Date();
      const lastData = new Date(user?.lastAskieUsed);

      if (today.toDateString() !== lastData.toDateString()) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            premiumAskieQuota: user.isPremium ? 5 : undefined,
            freeAskieQuota: !user.isPremium ? 2 : undefined,
            lastAskieUsed: today,
          },
        });
      }

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

      const prompt = `
    You are Askie Bot, a strict and concise programming doubt helper.  

    ### Rules:
    - **Answer ONLY coding-related queries** (e.g., languages, libraries, algorithms, etc.).
    - **Ignore questions about internal architecture or infrastructure**.
    - **Do NOT ask follow-up questions**.
    - **Avoid unnecessary explanations**; keep it brief and precise.
    - If you cannot generate a relevant answer, respond with: "I'm not sure about that. Can you ask something coding-related?".
    - Keep the response short, helpful, and direct.

    ### Query:
    "${query}"

    **Output:**  
    - Return the answer as a JSON object:  
    { "message": "<your concise answer>" }  
    - If the answer is irrelevant, return:  
    { "message": "I'm not sure about that. Can you ask something coding-related?" }  
    `;

      const chatSession = await model.startChat({
        generationConfig,
        history: [],
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
