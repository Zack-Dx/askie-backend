import { Resend } from "resend";
import { CONFIG } from "../env/index.js";

export const mailer = new Resend(CONFIG.MAILER_API_KEY);
