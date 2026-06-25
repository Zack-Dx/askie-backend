import { GoogleGenerativeAI } from "@google/generative-ai";
import { CONFIG } from "../env/index.js";
export const GEMINI_MODEL = "gemini-2.5-flash";
export const genAI = new GoogleGenerativeAI(CONFIG.AI_KEY);
