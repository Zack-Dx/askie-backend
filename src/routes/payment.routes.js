import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const paymentRouter = Router();

paymentRouter.post("/create", authenticateUser, PaymentController.createOrder);
paymentRouter.post("/webhook", PaymentController.handleWebhook);

export { paymentRouter };
