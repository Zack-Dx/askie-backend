import {
  calculateAccountAgeInDays,
  formatApiResponse,
  removeFileFromDisk,
  uploadProfilePictureToCloud,
} from "../utils/helper.js";
import mediaUploader from "../config/media/index.js";
import { prisma } from "../config/db/index.js";

class UserController {
  static async profile(req, res, next) {
    try {
      const user = req.user;

      if (user) {
        return res.status(200).json(
          formatApiResponse(
            200,
            true,
            {
              id: user.id,
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
              profession: user.profession,
              isNewsSub: user.isNewsSub,
            },
            "User profile retrieved successfully",
          ),
        );
      }

      return res
        .status(404)
        .json(formatApiResponse(404, false, null, "User profile not found"));
    } catch (error) {
      next(error);
    }
  }
  static async updateUserProfileData(req, res, next) {
    const userId = req.user.id;
    const allowedFieldsToBeUpdated = [
      "name",
      "about",
      "githubUrl",
      "linkedinUrl",
      "portfolioUrl",
      "twitterUrl",
      "location",
      "isPublic",
      "profession",
    ];
    const fields = Object.keys(req.body);

    const invalidFields = fields.filter((field) => {
      return !allowedFieldsToBeUpdated.includes(field);
    });

    if (invalidFields.length > 0) {
      return res
        .status(400)
        .json(
          formatApiResponse(
            400,
            false,
            null,
            `Not allowed to update these fields: ${invalidFields.join(", ")}`,
          ),
        );
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "User not found"));
      }

      const updatedData = {};
      allowedFieldsToBeUpdated.forEach((field) => {
        if (req.body[field] !== undefined) {
          updatedData[field] = req.body[field];
        }
      });

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatedData,
      });

      // eslint-disable-next-line no-unused-vars
      const { createdAt, updatedAt, ...userProfileData } = updatedUser;
      return res.status(200).json(
        formatApiResponse(
          200,
          true,
          {
            ...userProfileData,
            accountAge: calculateAccountAgeInDays(user.createdAt),
          },
          "User profile updated successfully",
        ),
      );
    } catch (error) {
      next(error);
    }
  }
  static async updateUserProfilePicture(req, res, next) {
    const userId = req.user.id;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "User not found."));
      }

      const picture = req.file;
      if (!picture) {
        return res
          .status(400)
          .json(formatApiResponse(400, false, null, "Picture not found."));
      }

      if (user.picture) {
        const publicId = user.picture.split("/").pop().split(".")[0];
        await mediaUploader.uploader.destroy(`bugbee-users/${publicId}`);
      }

      const uploadResult = await uploadProfilePictureToCloud(
        picture.path,
        user,
      );

      await removeFileFromDisk(picture.path);

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: {
          picture: uploadResult.secure_url,
        },
      });

      return res
        .status(200)
        .json(
          formatApiResponse(
            200,
            true,
            { picture: updatedUser.picture },
            "Profile picture updated successfully.",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async newsLetter(req, res, next) {
    try {
      const { action } = req.body;
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isNewsSub: true },
      });

      if (!user) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "User not found"));
      }

      if (action === -1) {
        if (!user.isNewsSub) {
          return res
            .status(200)
            .json(formatApiResponse(200, true, null, "Already Unsubscribed"));
        }

        await prisma.user.update({
          where: { id: userId },
          data: { isNewsSub: false },
        });

        return res
          .status(200)
          .json(
            formatApiResponse(200, true, null, "Unsubscribed successfully"),
          );
      }

      if (user.isNewsSub) {
        return res
          .status(200)
          .json(formatApiResponse(200, true, null, "Already Subscribed"));
      }

      await prisma.user.update({
        where: { id: userId },
        data: { isNewsSub: true },
      });

      return res
        .status(200)
        .json(formatApiResponse(200, true, null, "Subscribed successfully"));
    } catch (error) {
      next(error);
    }
  }
}

export { UserController };
