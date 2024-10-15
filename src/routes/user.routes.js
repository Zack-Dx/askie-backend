import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { UserController } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/profile", authenticateUser, UserController.profile);

export { userRouter };
