import { Router } from "express";
import { QuestionController } from "../controllers/question.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const questionRouter = Router();

questionRouter.get("/questions", QuestionController.getAllQuestions);

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

questionRouter.delete(
  "/questions/:id",
  authenticateUser,
  QuestionController.deleteQuestion,
);

export { questionRouter };
