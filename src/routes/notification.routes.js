import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const notificationRouter = Router();

notificationRouter.get(
  "/notifications",
  authenticateUser,
  NotificationController.getNotifications,
);

notificationRouter.post(
  "/notifications/mark-all-as-read",
  authenticateUser,
  NotificationController.markAllNotificationsAsRead,
);

export { notificationRouter };
