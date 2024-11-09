import { prisma } from "../config/db/index.js";
import { formatApiResponse } from "../utils/helper.js";

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const userId = req.user.id;
      const notifications = await prisma.notification.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
      });

      if (!notifications.length) {
        return res
          .status(200)
          .json(formatApiResponse(200, true, [], "No notifications found"));
      }

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            notifications,
            "Notifications retrieved successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async markAllNotificationsAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await prisma.notification.updateMany({
        where: { userId: userId, read: false },
        data: { read: true },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            null,
            "All notifications marked as read successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
}

export { NotificationController };
