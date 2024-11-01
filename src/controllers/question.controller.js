import { prisma } from "../config/db/index.js";
import { formatApiResponse } from "../utils/helper.js";
class QuestionController {
  static async createQuestion(req, res) {
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

      const newQuestion = await prisma.question.create({
        data: {
          title,
          content,
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
            },
          },
        },
      });

      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            newQuestion,
            "Question created successfully",
          ),
        );
    } catch (error) {
      console.error("Error creating question:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async getAllQuestions(req, res) {
    try {
      const questions = await prisma.question.findMany({
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
        orderBy: {
          createdAt: "desc",
        },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            questions,
            "Questions retrieved successfully",
          ),
        );
    } catch (error) {
      console.error("Error retrieving questions:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async getSpecificQuestion(req, res) {
    try {
      const { id } = req.params;
      const question = await prisma.question.findUnique({
        where: { id: parseInt(id) },
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
          answers: true,
        },
      });
      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }
      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            question,
            "Question retrieved successfully",
          ),
        );
    } catch (error) {
      console.error("Error retrieving question:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, content } = req.body;

      const question = await prisma.question.findUnique({
        where: { id: parseInt(id) },
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
        where: { id: parseInt(id) },
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
      console.error("Error updating question:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const question = await prisma.question.findUnique({
        where: { id: parseInt(id) },
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

      await prisma.question.delete({
        where: { id: parseInt(id) },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(200, true, null, "Question deleted successfully"),
        );
    } catch (error) {
      console.error("Error deleting question:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
}

export { QuestionController };
