import {
  calculateAccountAgeInDays,
  formatApiResponse,
} from "../utils/helper.js";

class UserController {
  static async profile(req, res) {
    try {
      const user = req.user;

      if (user) {
        return res.status(200).json(
          formatApiResponse(
            200,
            true,
            {
              email: user.email,
              name: user.name,
              picture: user.picture,
              role: user.role,
              linkedinUrl: user.linkedinUrl,
              githubUrl: user.githubUrl,
              portfolioUrl: user.portfolioUrl,
              twitterUrl: user.twitterUrl,
              questionsAsked: user.questionsAsked,
              answersProvided: user.answersProvided,
              accountAge: calculateAccountAgeInDays(user.createdAt),
              location: user.location,
              about: user.about,
              isPublic: user.isPublic,
            },
            "User profile retrieved successfully",
          ),
        );
      }

      return res
        .status(404)
        .json(formatApiResponse(404, false, null, "User profile not found"));
    } catch (error) {
      console.error("Error retrieving user profile:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
}

export { UserController };
