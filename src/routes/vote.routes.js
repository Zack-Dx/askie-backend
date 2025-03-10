import { Router } from "express";
import { VoteController } from "../controllers/vote.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const voteRouter = Router();

voteRouter.post(
  "/votes/question/:id",
  authenticateUser,
  VoteController.voteQuestion,
);
voteRouter.post(
  "/votes/answer/:id",
  authenticateUser,
  VoteController.voteAnswer,
);

export { voteRouter };
