import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/signin/google", AuthController.signInWithGoogle);
authRouter.post("/signin/github", AuthController.signInWithGithub);
authRouter.post("/signout", authenticateUser, AuthController.signOut);

export { authRouter };
