import { prisma } from "../config/db/index.js";
import { CONFIG } from "../config/env/index.js";
import { razorpayInstance } from "../config/payments/index.js";
import { formatApiResponse } from "../utils/helper.js";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils.js";

class PaymentController {
  static async createOrder(req, res, next) {
    const { id: userId, name, email } = req.user;
    const { membershipType } = req.body;
    try {
      if (!membershipType) {
        return res
          .status(400)
          .json(
            formatApiResponse(400, false, null, "Membership Type is required"),
          );
      }

      const validMemberships = {
        monthly: {
          name: "monthly",
          price: CONFIG.PREMIUM_MONTHLY_PRICE,
        },
        yearly: {
          name: "yearly",
          price: CONFIG.PREMIUM_YEARLY_PRICE,
        },
      };

      if (!(membershipType in validMemberships)) {
        return res
          .status(400)
          .json(
            formatApiResponse(400, false, null, "Invalid Membership Attempt"),
          );
      }

      const order = await razorpayInstance.orders.create({
        amount: validMemberships[membershipType].price * 100,
        currency: "INR",
        receipt: `receipt-${Date.now()}`,
        notes: {
          name,
          email,
          membershipType: validMemberships[membershipType].name,
        },
      });

      const payment = await prisma.payment.create({
        data: {
          userId,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          notes: order.notes,
          receipt: order.receipt,
          status: order.status,
        },
      });

      return res
        .status(201)
        .json(
          formatApiResponse(
            201,
            true,
            { payment, key_id: CONFIG.PAYMENT_KEY_ID },
            "Order created successfully",
          ),
        );
    } catch (error) {
      next(error);
    }
  }
  static async handleWebhook(req, res, next) {
    const webhookBody = req.body;
    const webhookSignature = req.get("X-Razorpay-Signature");

    try {
      const isValid = validateWebhookSignature(
        JSON.stringify(webhookBody),
        webhookSignature,
        CONFIG.PAYMENT_WEBHOOK_SECRET,
      );

      if (!isValid) {
        return res
          .status(400)
          .json(
            formatApiResponse(400, false, null, "Invalid Webhook Signature"),
          );
      }

      const { event, payload } = webhookBody;

      const paymentDetails = payload.payment.entity;

      console.log(payload.payment);

      const payment = await prisma.payment.findUnique({
        where: {
          orderId: paymentDetails.order_id,
        },
      });

      if (!payment) {
        return res
          .status(404)
          .json(
            formatApiResponse(404, false, null, "Payment record not found"),
          );
      }

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: paymentDetails.status,
        },
      });

      const user = await prisma.user.findUnique({
        where: {
          id: payment.userId,
        },
      });

      if (!user) {
        return res
          .status(404)
          .json(formatApiResponse(404, false, null, "User not found"));
      }

      if (event === "payment.captured") {
        const { membershipType } = payment.notes;

        const validMemberships = {
          monthly: {
            duration: 30, // 30 days
          },
          yearly: {
            duration: 365, // 1 year
          },
        };

        if (!validMemberships[membershipType]) {
          return res
            .status(400)
            .json(
              formatApiResponse(400, false, null, "Invalid membership type"),
            );
        }

        const premiumStartDate = new Date();
        const premiumEndDate = new Date();
        premiumEndDate.setDate(
          premiumEndDate.getDate() + validMemberships[membershipType].duration,
        );

        await prisma.user.update({
          where: { id: user.id },
          data: {
            isPremium: true,
            premiumStartDate,
            premiumEndDate,
            subscriptionPlan: membershipType,
          },
        });
      }

      return res
        .status(200)
        .json(
          formatApiResponse(200, true, null, "Webhook received successfully"),
        );
    } catch (error) {
      next(error);
    }
  }
}

export { PaymentController };
