import { Router } from "express";
import { QuestionController } from "../controllers/question.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { checkUserPremium } from "../middlewares/premium.middleware.js";

const questionRouter = Router();

questionRouter.get(
  "/questions",
  authenticateUser,
  QuestionController.getAllQuestions,
);

questionRouter.get(
  "/questions/summary/:id",
  authenticateUser,
  checkUserPremium,
  QuestionController.getSummary,
);

questionRouter.post(
  "/questions/media/upload",
  authenticateUser,
  upload.single("file"),
  QuestionController.uploadMediaToCloud,
);
questionRouter.post(
  "/questions/media/delete",
  authenticateUser,
  QuestionController.deleteMediaFromCloud,
);

questionRouter.post(
  "/questions",
  authenticateUser,
  QuestionController.createQuestion,
);

questionRouter.get(
  "/questions/:id",
  authenticateUser,
  QuestionController.getSpecificQuestion,
);

questionRouter.patch(
  "/questions/:id",
  authenticateUser,
  QuestionController.updateQuestion,
);

questionRouter.get(
  "/questions/suggestions/search",
  authenticateUser,
  QuestionController.getQuestionSuggestions,
);

questionRouter.delete(
  "/questions/:id",
  authenticateUser,
  QuestionController.deleteQuestion,
);

export { questionRouter };
