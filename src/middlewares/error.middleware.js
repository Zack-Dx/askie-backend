import { formatApiResponse } from "../utils/helper.js";

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  const statusCode = err.statusCode || 500;
  const status = false;
  const message = err.message || "Internal Server Error";
  const data = err.data || null;

  const response = formatApiResponse(statusCode, status, data, message);
  res.status(statusCode).json(response);
};
