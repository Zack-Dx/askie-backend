import { CONFIG } from "../config/env/index.js";
import { prisma } from "../config/db/index.js";
// import { oauth2Client } from "../config/auth/index.js";
import { formatApiResponse, generateAccessToken } from "../utils/helper.js";

class AuthController {
  static async signInWithGoogle(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res
          .status(400)
          .json(formatApiResponse(400, false, null, "Token is required"));
      }

      const userInfo = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      ).then((res) => {
        return res.json();
      });

      // const ticket = await oauth2Client.verifyIdToken({
      //   idToken: token,
      //   audience: CONFIG.GOOGLE_CLIENT_ID,
      // });

      // const { sub, email, name, picture } = ticket.getPayload();
      const { sub, email, name, picture } = userInfo;

      let user = await prisma.user.findUnique({
        where: { email: email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId: sub,
            email,
            name,
            picture,
          },
        });
      }

      const accessToken = generateAccessToken(user);

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      });

      return res.status(200).json(
        formatApiResponse(
          200,
          true,
          {
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
          "Login Success",
        ),
      );
    } catch (error) {
      console.error("Error during google login:", error);
      // if (error.message.includes("Token used too late")) {
      //   return res
      //     .status(401)
      //     .json(
      //       formatApiResponse(
      //         401,
      //         false,
      //         null,
      //         "Token expired, please login again",
      //       ),
      //     );
      // }

      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }

  static async signInWithGithub(req, res) {
    try {
      const { code } = req.body;

      const tokenResponse = await fetch(
        `https://github.com/login/oauth/access_token?client_id=${CONFIG.GITHUB_CLIENT_ID}&client_secret=${CONFIG.GITHUB_CLIENT_SECRET}&code=${code}`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
        },
      );

      const tokenData = await tokenResponse.json();
      const accessTokenGithub = tokenData.access_token;

      if (!accessTokenGithub) {
        return res
          .status(401)
          .json(formatApiResponse(401, false, null, "Invalid GitHub code"));
      }

      const userResponse = await fetch("https://api.github.com/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessTokenGithub}`,
          Accept: "application/json",
        },
      });

      const emailResponse = await fetch("https://api.github.com/user/emails", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessTokenGithub}`,
          Accept: "application/json",
        },
      });

      const emails = await emailResponse.json();
      const primaryEmailObj = emails.find((email) => {
        return email.primary && email.verified;
      });
      const primaryEmail = primaryEmailObj ? primaryEmailObj.email : null;

      if (!primaryEmail) {
        return res
          .status(400)
          .json(
            formatApiResponse(
              400,
              false,
              null,
              "Could not retrieve a verified email from GitHub",
            ),
          );
      }

      const userData = await userResponse.json();
      const { avatar_url: picture, id: githubId } = userData;

      let user = await prisma.user.findUnique({
        where: { email: primaryEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: primaryEmail,
            name: userData.login,
            picture,
            githubId: String(githubId),
          },
        });
      }

      const accessToken = generateAccessToken(user);

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
      });

      return res.status(200).json(
        formatApiResponse(
          200,
          true,
          {
            email: user.email,
            name: user.name,
            picture: user.picture,
          },
          "Login Success",
        ),
      );
    } catch (error) {
      console.error("Error during GitHub login:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }

  static async signOut(req, res) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
      });

      return res
        .status(200)
        .json(formatApiResponse(200, true, null, "Logout successful"));
    } catch (error) {
      console.error("Error during logout:", error);
      return res
        .status(500)
        .json(formatApiResponse(500, false, null, "Internal Server Error"));
    }
  }
}

export { AuthController };
