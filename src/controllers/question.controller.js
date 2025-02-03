import { prisma } from "../config/db/index.js";
import { formatApiResponse } from "../utils/helper.js";
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
          votes: {
            select: {
              value: true,
            },
          },
          answers: true,
        },
      });

      const formattedQuestion = {
        ...newQuestion,
        upvoteCount: 0,
        downvoteCount: 0,
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

      const formattedQuestions = questions.map((question) => {
        let voteCount = question.votes.reduce((count, vote) => {
          return count + vote.value;
        }, 0);

        return {
          ...question,
          votes: voteCount,
        };
      });

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
          votes: {
            select: {
              value: true,
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

      const upvoteCount = question.votes.reduce((acc, vote) => {
        return vote.value === 1 ? acc + 1 : acc;
      }, 0);

      const downvoteCount = question.votes.reduce((acc, vote) => {
        return vote.value === -1 ? acc + 1 : acc;
      }, 0);

      const formattedQuestion = {
        ...question,
        upvoteCount,
        downvoteCount,
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
}

export { QuestionController };
