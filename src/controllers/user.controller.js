class UserController {
  static async profile(req, res) {
    try {
      const user = req.user;

      if (user) {
        return res.status(200).json({
          statusCode: 200,
          success: true,
          data: {
            email: user.email,
            name: user.name,
            picture: user.picture,
            role: user.role,
            linkedinUrl: user.linkedinUrl || null,
            githubUrl: user.githubUrl || null,
            portfolioUrl: user.portfolioUrl || null,
            twitterUrl: user.twitterUrl || null,
            questionsAsked: user.questionsAsked,
            answersProvided: user.answersProvided,
            accountAge: user.accountAge || null,
            location: user.location || null,
            about: user.about || null,
            isPublic: user.isPublic,
          },
          message: "User profile retrieved successfully",
        });
      }

      return res.status(404).json({
        statusCode: 404,
        success: false,
        data: null,
        message: "User profile not found",
      });
    } catch (error) {
      console.error("Error retrieving user profile:", error);
      return res.status(500).json({
        statusCode: 500,
        success: false,
        data: null,
        message: "Internal Server Error",
      });
    }
  }
}

export { UserController };
