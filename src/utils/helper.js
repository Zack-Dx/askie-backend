import jwt from "jsonwebtoken";
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
