import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { AnswerController } from "../controllers/answer.controller.js";

const answerRouter = Router();

answerRouter.post(
  "/questions/:questionId/answers",
  authenticateUser,
  AnswerController.createAnswer,
);

// answerRouter.get(
//   "/questions/:questionId/answers",
//   authenticateUser,
//   AnswerController.getAnswersForQuestion,
// );

answerRouter.get(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.getAnswer,
);

answerRouter.patch(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.updateAnswer,
);

answerRouter.delete(
  "/answers/:answerId",
  authenticateUser,
  AnswerController.deleteAnswer,
);

answerRouter.post(
  "/askie-answer",
  authenticateUser,
  AnswerController.askieAnswer,
);

export { answerRouter };
