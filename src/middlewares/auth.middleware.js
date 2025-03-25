import { prisma } from "../config/db/index.js";
import {
  calculateAccountAgeInDays,
  formatApiResponse,
  verifyAccessToken,
} from "../utils/helper.js";

async function authenticateUser(req, res, next) {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const isMobile = /mobile|android|iphone|ipad|ipod|windows phone/i.test(
      userAgent,
    );
    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies?.token;

    if (isMobile) {
      console.log("\n🔥 Mobile Request Detected 🔥");
      console.log("📱 User-Agent:", userAgent);
      console.log(
        "🔑 Authorization Header:",
        req.headers.authorization || "N/A",
      );
      console.log("🍪 Cookie Token:", req.cookies?.token || "N/A");
      console.log("✅ Final Token Used:", token || "N/A");
    }

    if (!token) {
      return res
        .status(401)
        .json(
          formatApiResponse(
            401,
            false,
            null,
            "Access denied. No authentication token provided.",
          ),
        );
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res
        .status(401)
        .json(
          formatApiResponse(
            401,
            false,
            null,
            "Access denied. Invalid or expired token",
          ),
        );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res
        .status(404)
        .json(
          formatApiResponse(404, false, null, "User not found. Please sign in"),
        );
    }

    req.user = {
      ...user,
      accountAge: calculateAccountAgeInDays(user.createdAt),
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res
      .status(500)
      .json(
        formatApiResponse(
          500,
          false,
          null,
          "An unexpected error occurred during authentication",
        ),
      );
  }
}

export { authenticateUser };
