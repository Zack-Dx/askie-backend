import { prisma } from "../config/db/index.js";
import { formatApiResponse, getVoteCount } from "../utils/helper.js";

class VoteController {
  static async voteQuestion(req, res, next) {
    const { id } = req.params;
    const userId = req.user.id;
    const { value } = req.body;

    if (![1, -1].includes(value)) {
      return res
        .status(400)
        .json(
          formatApiResponse(400, false, "Invalid vote value. Use 1 or -1."),
        );
    }

    try {
      const question = await prisma.question.findFirst({ where: { id } });

      if (!question) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "Question not found"));
      }

      const existingVote = await prisma.vote.findFirst({
        where: { userId, questionId: id },
      });

      if (existingVote) {
        if (existingVote.value === value) {
          await prisma.vote.delete({ where: { id: existingVote.id } });
          return res
            .status(200)
            .json(
              formatApiResponse(
                200,
                true,
                { votes: await getVoteCount(id, "question"), selfVote: 0 },
                "Vote removed successfully",
              ),
            );
        } else {
          await prisma.vote.update({
            where: { id: existingVote.id },
            data: { value },
          });

          return res.status(200).json(
            formatApiResponse(
              200,
              true,
              {
                votes: await getVoteCount(id, "question"),
                selfVote: value === 1 ? 1 : -1,
              },
              value === 1 ? "Upvoted" : "Downvoted",
            ),
          );
        }
      }

      await prisma.vote.create({
        data: { value, questionId: id, userId },
      });

      return res.status(201).json(
        formatApiResponse(
          201,
          true,
          {
            votes: await getVoteCount(id, "question"),
            selfVote: value === 1 ? 1 : -1,
          },
          value === 1 ? "Upvoted" : "Downvoted",
        ),
      );
    } catch (error) {
      next(error);
    }
  }

  //   static async voteAnswer(req, res, next) {
  //     try {
  //     } catch (error) {
  //       next(error);
  //     }
  //   }
}

export { VoteController };
