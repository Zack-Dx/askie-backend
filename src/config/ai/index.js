import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from "../env/index.js";

export const genAI = new GoogleGenerativeAI(CONFIG.AI_KEY);
