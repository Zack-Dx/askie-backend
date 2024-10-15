import { OAuth2Client } from "google-auth-library";
import { CONFIG } from "../env/index.js";

export const oauth2Client = new OAuth2Client(CONFIG.GOOGLE_CLIENT_ID);
