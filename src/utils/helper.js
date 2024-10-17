import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { CONFIG } from "../config/env/index.js";

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
