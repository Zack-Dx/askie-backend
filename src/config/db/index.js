import { PrismaClient } from "@prisma/client";
import Redis from "ioredis";
import { CONFIG } from "../env/index.js";

export const prisma = new PrismaClient({});
export const cacheClient = new Redis(CONFIG.CACHE_DB_URI);
