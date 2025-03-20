import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { paymentLimiter } from "../middlewares/limiters.middleware.js";

const paymentRouter = Router();

paymentRouter.post(
  "/create",
  paymentLimiter,
  authenticateUser,
  PaymentController.createOrder,
);
paymentRouter.post("/webhook", PaymentController.handleWebhook);
paymentRouter.get(
  "/premium/verify",
  authenticateUser,
  PaymentController.verifyPremiumUser,
);

export { paymentRouter };
