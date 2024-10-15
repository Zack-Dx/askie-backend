import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware";
import { AnswerController } from "../controllers/answer.controller.js";

const answerRouter = Router();

answerRouter.post(
  "/questions/:questionId/answers",
  authenticateUser,
  AnswerController.createAnswer,
);

answerRouter.get(
  "/questions/:questionId/answers",
  authenticateUser,
  AnswerController.getAnswersForQuestion,
);

answerRouter.get(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.getAnswer,
);

answerRouter.put(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.updateAnswer,
);

answerRouter.delete(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.deleteAnswer,
);

export { answerRouter };
