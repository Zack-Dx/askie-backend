import { genAI } from "../config/ai/index.js";
import { prisma } from "../config/db/index.js";
import {
  deleteMediaFromCloud as deleteMedia,
  extractImageUrls,
  formatApiResponse,
  getSelfVoteValue,
  getVoteCount,
  removeFileFromDisk,
  uploadMediaToCloud,
} from "../utils/helper.js";
class QuestionController {
  static async createQuestion(req, res, next) {
    try {
      const { title, content } = req.body;
      const userId = req.user.id;

      if (!title || !content) {
        return res
          .status(400)
          .json(
            formatApiResponse(
              400,
              false,
              null,
              "Title and Content are required",
            ),
          );
      }

      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 200,
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
      });

      /* Dynamic Tag Gen*/
      let tags = [];
      try {
        const prompt = `You are an AI that generates up to 3 relevant programming-related tags for a given technical question.  

      ### Rules:  
      - Only return tags related to programming, frameworks, or libraries (e.g., JavaScript, Node.js, React, Python, Docker, etc.).  
      - If the question is unrelated to programming, return an empty array "[]".  
      - Do NOT include general or vague tags like "help," "question," or "issue."  
      - The output format must be valid JSON, containing only an array of tag names.  

      ### Example Output:
      ["Node.js", "Streams", "Memory Management"]

      ### Question:
      Title: "${title}"  
      Content: "${content}"  

      Only return the JSON array with tag names and nothing else.`;

        const chatSession = await model.startChat({
          generationConfig,
          history: [],
        });

        const result = await chatSession.sendMessage(prompt);
        let responseText = result.response.text().trim();

        // JSON Formatting
        try {
          responseText = responseText.replace(/^```json|```$/g, "").trim();
          tags = JSON.parse(responseText);

          if (!Array.isArray(tags)) throw new Error("Invalid JSON format");

          tags = tags.slice(0, 3).map((tag) => {
            return tag.toLowerCase().replace(/\b\w/g, (char) => {
              return char.toUpperCase();
            });
          });
        } catch (error) {
          console.error("Error parsing AI-generated tags:", error);
          tags = [];
        }
      } catch (error) {
        console.error("Error generating tags:", error);
        tags = [];
      }

      let context = "";
      /* Question Context Generation */
      try {
        const contextPrompt = `Generate a concise one-line summary for the given technical question.

      ### Example:
      **Question:**
      Title: "How to optimize a Node.js stream for large file processing?"  
      Content: "I'm working with Node.js streams to process a large file. However, I'm facing memory issues. How can I optimize it?"

      **Output:**
      "Optimizing Node.js streams for large file processing"

      **Question:**
      Title: "${title}"  
      Content: "${content}"  

      **Output:**`;

        const contextSession = await model.startChat({
          generationConfig,
          history: [],
        });

        const contextResult = await contextSession.sendMessage(contextPrompt);
        context = contextResult.response.text().trim();
        context = context.replace(/^"(.*)"$/, "$1");
      } catch (error) {
        console.error("Failed to generate question context", error);
        context = "";
      }

      const newQuestion = await prisma.question.create({
        data: {
          title,
          content,
          context,
          user: { connect: { id: userId } },
        },
        include: {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
              tagId: true,
            },
          },
          user: {
            select: {
              name: true,
              picture: true,
              id: true,
              isPremium: true,
            },
          },
          answers: true,
        },
      });

      if (tags.length !== 0) {
        for (const tagName of tags) {
          let tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });

          await prisma.questionTag.create({
            data: {
              questionId: newQuestion.id,
              tagId: tag.id,
            },
          });
        }
      }

      const formattedQuestion = {
        ...newQuestion,
        upvoteCount: 0,
        downvoteCount: 0,
        votes: 0,
        selfVote: 0,
      };

      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            formattedQuestion,
            "Question created successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async getAllQuestions(req, res, next) {
    try {
      const questions = await prisma.question.findMany({
        include: {
          answers: true,
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              picture: true,
              id: true,
              isPremium: true,
            },
          },
          votes: {
            select: {
              value: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const formattedQuestions = await Promise.all(
        questions.map(async (question) => {
          let voteCount = await getVoteCount(question.id, "question");

          return {
            ...question,
            votes: voteCount,
            selfVote: await getSelfVoteValue(
              question.id,
              req.user.id,
              "question",
            ),
          };
        }),
      );

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            formattedQuestions,
            "Questions retrieved successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async getSpecificQuestion(req, res, next) {
    const userId = req.user.id;
    try {
      const { id } = req.params;
      const question = await prisma.question.findUnique({
        where: { id },
        include: {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                  id: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
              picture: true,
              id: true,
              isPremium: true,
            },
          },
          votes: {
            select: {
              value: true,
            },
          },
          answers: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              user: {
                select: {
                  name: true,
                  picture: true,
                  id: true,
                  isPremium: true,
                },
              },
            },
          },
        },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      const questionWithAnswersvote = await Promise.all(
        question?.answers?.map(async (answer) => {
          const voteCount = await getVoteCount(answer.id, "answer");
          const self = await getSelfVoteValue(answer.id, userId, "answer");
          return { ...answer, votes: voteCount, selfVote: self };
        }),
      );

      const formattedQuestion = {
        ...question,
        answers: questionWithAnswersvote,
        votes: await getVoteCount(question.id, "question"),
        selfVote: await getSelfVoteValue(question.id, req.user.id, "question"),
      };

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            formattedQuestion,
            "Question retrieved successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async updateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, content } = req.body;

      const question = await prisma.question.findUnique({
        where: { id },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }
      if (question.userId !== userId) {
        return res
          .status(403)
          .json(
            formatApiResponse(
              403,
              false,
              null,
              "Unauthorized to update this question",
            ),
          );
      }

      const updatedQuestion = await prisma.question.update({
        where: { id },
        data: {
          title: title || question.title,
          content: content || question.content,
        },
        include: {
          tags: {
            select: {
              tag: {
                select: {
                  name: true,
                },
              },
              tagId: true,
            },
          },
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
            updatedQuestion,
            "Question updated successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const question = await prisma.question.findUnique({
        where: { id },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      if (question.userId !== userId) {
        return res
          .status(403)
          .json(
            formatApiResponse(
              403,
              false,
              null,
              "Unauthorized to delete this question",
            ),
          );
      }

      const urls = extractImageUrls(question.content);

      await Promise.all(
        urls.map((url) => {
          deleteMedia(url, "askie_media");
        }),
      );

      await prisma.answer.deleteMany({
        where: { questionId: id },
      });

      await prisma.questionTag.deleteMany({
        where: { questionId: id },
      });

      await prisma.question.delete({
        where: { id },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(200, true, null, "Question deleted successfully"),
        );
    } catch (error) {
      next(error);
    }
  }

  static async uploadMediaToCloud(req, res, next) {
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json(formatApiResponse(400, false, null, "No file uploaded."));
    }
    try {
      const uploadResult = await uploadMediaToCloud(file.path, {
        folder: "askie_media",
      });
      await removeFileFromDisk(file.path);
      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            { url: uploadResult.secure_url },
            "Upload Success",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async deleteMediaFromCloud(req, res, next) {
    const imageUrl = req.body.imageUrl;

    try {
      await deleteMedia(imageUrl, "askie_media");
      return res
        .status(200)
        .json(
          formatApiResponse(200, true, { message: "File deletion success" }),
        );
    } catch (error) {
      next(error);
    }
  }
  static async getSummary(req, res, next) {
    try {
      const { id } = req.params;

      const question = await prisma.question.findUnique({
        where: { id },
        select: { content: true, title: true },
      });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      const { content, title } = question;

      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 64,
        maxOutputTokens: 300,
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite-preview-02-05",
      });

      const prompt = `
      You are an AI that generates a **concise and descriptive 2-3 line summary** for a technical question. 
      
      ### Rules:
      - Summarize the **main problem or query** clearly.
      - Use 2-3 complete sentences to describe the core issue.
      - Avoid fluff, but include the key technical details.

      ### Example:
      **Question:** 
      Title: "How to optimize Node.js streams for large file processing?"  
      Content: "I'm working with Node.js streams to process large CSV files. I'm facing memory issues when handling big files. What are the best practices for optimization?"
      
      **Output:**
      "The user is facing memory issues while processing large CSV files with Node.js streams. They are seeking best practices to optimize stream performance and avoid memory bottlenecks."

      **Question:**
      Title: "${title}"  
      Content: "${content}"  

      **Output:**
    `;

      const chatSession = await model.startChat({
        generationConfig,
        history: [],
      });

      const result = await chatSession.sendMessage(prompt);
      let summary = result.response.text().trim();

      summary = summary.replace(/^"(.*)"$/, "$1");

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { summary },
            "Summary generated successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async getQuestionSuggestions(req, res, next) {
    const { keyword } = req.query;

    try {
      if (!keyword) {
        return res
          .status(400)
          .json(formatApiResponse(400, false, null, "Keyword is required."));
      }

      const suggestions = await prisma.question.findMany({
        where: {
          OR: [
            {
              title: {
                startsWith: keyword,
                mode: "insensitive",
              },
            },
            {
              context: {
                contains: keyword,
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          context: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      });

      if (suggestions.length === 0) {
        return res
          .status(200)
          .json(
            formatApiResponse(200, true, [], "No matching questions found."),
          );
      }

      const trimmedSuggestions = suggestions.map((q) => {
        return {
          id: q.id,
          title: q.title,
          trimmedTitle:
            q.title.length > 40 ? `${q.title.substring(0, 40)}...` : q.title,
          context: q.context,
          createdAt: q.createdAt,
        };
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            trimmedSuggestions,
            "Suggestions retrieved successfully.",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
}

export { QuestionController };
