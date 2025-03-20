import rateLimit from "express-rate-limit";

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 4,
  message: "Too many payment requests. Try again later.",
});

export { paymentLimiter };
