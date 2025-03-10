import { prisma } from "../config/db/index.js";
import { formatApiResponse } from "../utils/helper.js";

class AnswerController {
  static async createAnswer(req, res) {
    const { questionId } = req.params;
    const { content } = req.body;
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

      if (question.userId != userId) {
        await prisma.notification.create({
          data: {
            content: `Your question "${question.title}" has received a new answer.`,
            userId: question.userId,
            createdAt: new Date(),
          },
        });
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
      console.error("Error creating answer:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async getAnswer(req, res) {
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
      console.error("Error fetching answers:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async updateAnswer(req, res) {
    const { answerId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    try {
      const answer = await prisma.answer.findUnique({
        where: { id: Number(answerId) },
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
        where: { id: Number(answerId) },
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
      console.error("Error updating answer:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
  static async deleteAnswer(req, res) {
    const { answerId } = req.params;
    const userId = req.user.id;
    try {
      const answer = await prisma.answer.findUnique({
        where: { id: Number(answerId) },
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
        where: { id: Number(answerId) },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(200, true, null, "Answer deleted successfully"),
        );
    } catch (error) {
      console.error("Error deleting answer:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
}

export { AnswerController };
