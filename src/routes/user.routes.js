import { Router } from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { UserController } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const userRouter = Router();

userRouter.get("/profile", authenticateUser, UserController.profile);
userRouter.patch(
  "/profile",
  authenticateUser,
  UserController.updateUserProfileData,
);
userRouter.patch(
  "/profile/picture",
  authenticateUser,
  upload.single("picture"),
  UserController.updateUserProfilePicture,
);

export { userRouter };
