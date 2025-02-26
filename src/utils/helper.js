import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "node:fs/promises";
import mediaUploader from "../config/media/index.js";
import { CONFIG } from "../config/env/index.js";
import { prisma } from "../config/db/index.js";

export function formatApiResponse(statusCode, status, data, message) {
  return {
    status,
    statusCode,
    message,
    data,
  };
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    CONFIG.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Invalid or expired token:", error);
    return null;
  }
}

export async function comparePassword(dbPass, userPass) {
  return await bcrypt.compare(dbPass, userPass);
}

export async function hashPassword(password, salt = 10) {
  return await bcrypt.hash(password, salt);
}

export const calculateAccountAgeInDays = (createdAt) => {
  const currentDate = new Date();
  const creationDate = new Date(createdAt);

  const timeDifference = currentDate - creationDate;

  const accountAgeInDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  return accountAgeInDays;
};

export const removeFileFromDisk = async (path) => {
  try {
    const fileExists = await fs
      .access(path)
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
    if (fileExists) {
      await fs.unlink(path);
    }
  } catch (error) {
    console.error(`Error while deleting file at path ${path}:`, error);
    throw error;
  }
};

export const uploadProfilePictureToCloud = async (path, user) => {
  return await mediaUploader.uploader.upload(path, {
    folder: "bugbee-users",
    public_id: `user_${user.id}`,
    overwrite: true,
  });
};

export const getVoteCount = async (_id, type) => {
  if (!_id || !type) {
    throw new Error("Id parameter must be provided");
  }

  const voteCounts = await prisma.vote.groupBy({
    by: ["value"],
    where: {
      questionId: type === "question" ? _id : undefined,
      answerId: type === "answer" ? _id : undefined,
    },
    _count: {
      id: true,
    },
  });

  const resultObject = {
    upvotes:
      voteCounts.find(({ value }) => {
        return value === 1;
      })?._count.id || 0,
    downvotes:
      voteCounts.find(({ value }) => {
        return value === -1;
      })?._count.id || 0,
  };

  return resultObject.upvotes;
};
