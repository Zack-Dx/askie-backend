import { prisma } from "../config/db/index.js";
import { formatApiResponse } from "../utils/helper.js";

class NotificationController {
  static async getNotifications(req, res) {
    try {
      const userId = req.user.id;

      const notifications = await prisma.notification.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
      });

      if (!notifications.length) {
        return res
          .status(200)
          .json(
            formatApiResponse(200, "success", [], "No notifications found"),
          );
      }

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            "success",
            notifications,
            "Notifications retrieved successfully",
          ),
        );
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, "error", null, "Internal Server Error"));
    }
  }
}

export { NotificationController };
