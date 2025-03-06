import Razorpay from "razorpay";
import { CONFIG } from "../env/index.js";

const razorpayInstance = new Razorpay({
  key_id: CONFIG.PAYMENT_KEY_ID,
  key_secret: CONFIG.PAYMENT_SECRET_KEY,
});

export { razorpayInstance };
