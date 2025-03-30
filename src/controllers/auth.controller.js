import { CONFIG } from "../config/env/index.js";
import { prisma } from "../config/db/index.js";
// import { oauth2Client } from "../config/auth/index.js";

import {
  calculateAccountAgeInDays,
  comparePassword,
  formatApiResponse,
  generateAccessToken,
  hashPassword,
} from "../utils/helper.js";

class AuthController {
  static async signIn(req, res, next) {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res
          .status(404)
          .json(
            formatApiResponse(
              404,
              false,
              null,
              "Unable to authorize. Please check username/password combination",
            ),
          );
      }

      if (!user.password) {
        return res
          .status(400)
          .json(
            formatApiResponse(
              400,
              false,
              null,
              "Unable to authorize. Please check username/password combination",
            ),
          );
      }

      const isMatch = await comparePassword(password, user.password);

      if (!isMatch) {
        return res
          .status(401)
          .json(
            formatApiResponse(
              401,
              false,
              null,
              "Unable to authorize. Please check username/password combination",
            ),
          );
      }

      const accessToken = generateAccessToken(user);

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
        domain:
          CONFIG.NODE_ENV === "production" ? CONFIG.BACKEND_HOST : "localhost",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sameSite: CONFIG.NODE_ENV === "production" ? "none" : "lax",
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { ...user, accountAge: calculateAccountAgeInDays(user.createdAt) },
            "Login Successful",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async signInWithGoogle(req, res, next) {
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
        domain:
          CONFIG.NODE_ENV === "production" ? CONFIG.BACKEND_HOST : "localhost",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sameSite: CONFIG.NODE_ENV === "production" ? "none" : "lax",
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { ...user, accountAge: calculateAccountAgeInDays(user.createdAt) },
            "Login Successful",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async signInWithGithub(req, res, next) {
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
        domain:
          CONFIG.NODE_ENV === "production" ? CONFIG.BACKEND_HOST : "localhost",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sameSite: CONFIG.NODE_ENV === "production" ? "none" : "lax",
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { ...user, accountAge: calculateAccountAgeInDays(user.createdAt) },
            "Login Successful",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async signUpUser(req, res, next) {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json(
          formatApiResponse(
            400,
            false,
            null,
            "Name, email, and password are required",
          ),
        );
    }

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res
          .status(400)
          .json(
            formatApiResponse(
              400,
              false,
              null,
              "User with this email already exists",
            ),
          );
      }

      const hashedPass = await hashPassword(password);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPass,
          picture:
            "https://res.cloudinary.com/dvj8ajii0/image/upload/w_1000,c_fill,ar_1:1,g_auto,r_max,bo_5px_solid_red,b_rgb:262c35/v1729144694/download_v7f0vi.png",
        },
      });

      const accessToken = generateAccessToken(user);

      res.cookie("token", accessToken, {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
        domain:
          CONFIG.NODE_ENV === "production" ? CONFIG.BACKEND_HOST : "localhost",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
        sameSite: CONFIG.NODE_ENV === "production" ? "none" : "lax",
      });

      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            { ...user, accountAge: calculateAccountAgeInDays(user.createdAt) },
            "User signed up successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }

  static async signOut(_, res, next) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: CONFIG.NODE_ENV === "production",
        domain:
          CONFIG.NODE_ENV === "production" ? CONFIG.BACKEND_HOST : "localhost",
        sameSite: CONFIG.NODE_ENV === "production" ? "none" : "lax",
      });

      return res
        .status(200)
        .json(formatApiResponse(200, true, null, "Logout successful"));
    } catch (error) {
      next(error);
    }
  }
}

export { AuthController };
