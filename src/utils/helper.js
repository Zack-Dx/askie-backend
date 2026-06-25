import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "node:fs/promises";
import mediaUploader from "../config/media/index.js";
import { CONFIG } from "../config/env/index.js";
import { prisma } from "../config/db/index.js";
import { GEMINI_MODEL, genAI } from "../config/ai/index.js";
import { mailer } from "../config/mailer/index.js";

export function formatApiResponse(statusCode, status, data, message) {
  return {
    status,
    statusCode,
    message,
    data,
  };
}

export function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    CONFIG.JWT_SECRET,
    { expiresIn: "1d" },
  );
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error("Invalid or expired token:", error);
    return null;
  }
}

export async function comparePassword(dbPass, userPass) {
  return await bcrypt.compare(dbPass, userPass);
}

export async function hashPassword(password, salt = 10) {
  return await bcrypt.hash(password, salt);
}

export const calculateAccountAgeInDays = (createdAt) => {
  const currentDate = new Date();
  const creationDate = new Date(createdAt);

  const timeDifference = currentDate - creationDate;

  const accountAgeInDays = Math.floor(timeDifference / (1000 * 60 * 60 * 24));

  return accountAgeInDays;
};

export const removeFileFromDisk = async (path) => {
  try {
    const fileExists = await fs
      .access(path)
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
    if (fileExists) {
      await fs.unlink(path);
    }
  } catch (error) {
    console.error(`Error while deleting file at path ${path}:`, error);
    throw error;
  }
};

export const uploadMediaToCloud = async (path, options) => {
  return await mediaUploader.uploader.upload(path, options);
};
export const deleteMediaFromCloud = async (imageUrl, folder) => {
  try {
    if (!imageUrl) throw new Error("Image URL is required");
    const publicId = imageUrl.split("/").pop().split(".")[0];

    const result = await mediaUploader.uploader.destroy(
      `${folder}/${publicId}`,
    );
    return result;
  } catch (error) {
    console.error("Error deleting media from Cloudinary:", error);
    throw error;
  }
};

export const getVoteCount = async (_id, type) => {
  if (!_id || !type) {
    throw new Error("Something went wrong while getting vote count");
  }

  const voteCounts = await prisma.vote.groupBy({
    by: ["value"],
    where: {
      questionId: type === "question" ? _id : undefined,
      answerId: type === "answer" ? _id : undefined,
    },
    _count: {
      id: true,
    },
  });

  const upvotes =
    voteCounts.find(({ value }) => {
      return value === 1;
    })?._count.id || 0;
  const downvotes =
    voteCounts.find(({ value }) => {
      return value === -1;
    })?._count.id || 0;

  return upvotes - downvotes;
};

export const getSelfVoteValue = async (_id, userId, type) => {
  if (!_id || !type || !userId) {
    throw new Error("Something went wrong while getting self vote value");
  }

  const vote = await prisma.vote.findFirst({
    where: {
      questionId: type === "question" ? _id : undefined,
      answerId: type === "answer" ? _id : undefined,
      userId: userId,
    },
  });

  if (!vote) {
    return 0;
  }

  return vote.value && vote.userId === userId ? vote.value : 0;
};

export const extractImageUrls = (content) => {
  const regex = /<img[^>]+src="([^">]+)"/g;
  let match;
  const urls = [];
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  return urls;
};

export const backendActiveJobber = () => {
  const PING_INTERVAL = 3 * 60 * 1000;

  setInterval(async () => {
    try {
      const response = await fetch(`https://${CONFIG.BACKEND_HOST}/health`);

      if (!response.ok) {
        throw new Error(`Ping failed with status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `[${new Date().toLocaleTimeString()}] Backend Check Successful:`,
        data,
      );
    } catch (error) {
      console.error(
        `[${new Date().toLocaleTimeString()}] Backend Ping Failed:`,
        error.message,
      );
    }
  }, PING_INTERVAL);
};

export const answerFactChecker = async (
  questionTitle,
  questionContent,
  answerContent,
) => {
  const prompt = `
### 🎯 **Smart Fact-Checking Task**
You are an AI fact-checker with expert-level accuracy. Your job is to thoroughly verify the accuracy, consistency, and relevance of an answer against the provided question and its context.  

### ✅ **Input Data**
- **Question Title:** ${questionTitle.trim()}  
- **Question Content:** ${questionContent.trim()}  
- **Answer Content:** ${answerContent.trim()}  

### 🔥 **Verification Steps**
1. **Contextual Matching:**  
   - Ensure the answer directly addresses the question.  
   - Verify whether it provides a factual and relevant response.  
   - Identify any unrelated or incorrect information.  

2. **Consistency Check:**  
   - Confirm the consistency between the answer and the provided question content.  
   - Detect factual contradictions or inaccuracies.  

3. **Relevance Analysis:**  
   - Evaluate how directly the answer solves or responds to the question.  
   - Detect irrelevant or generic responses.  

### 🔥 **Scoring Criteria**
- **0-20:** 🚫 Completely inaccurate or irrelevant.  
- **21-40:** ⚠️ Mostly inaccurate with partial relevance.  
- **41-60:** 🟡 Partially accurate but incomplete or inconsistent.  
- **61-80:** ✅ Mostly accurate with minor inconsistencies.  
- **81-100:** 🎯 Highly accurate, relevant, and consistent.  

### 🚀 **Output Format:**
\`\`\`json
{ "score": <integer from 0 to 100> }
\`\`\`
`;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const generationConfig = {
    maxOutputTokens: 350,
    temperature: 0.05,
  };

  const chatSession = await model.startChat({
    generationConfig,
    history: [],
  });

  const result = await chatSession.sendMessage(prompt);

  let responseText = await result.response.text().trim();
  responseText = responseText.replace(/^```json|```$/g, "").trim();

  const aiResponse = (() => {
    try {
      return JSON.parse(responseText);
    } catch {
      return { score: null };
    }
  })();

  return aiResponse.score && typeof aiResponse.score === "number"
    ? aiResponse.score
    : null;
};

export const isEmptyOrWhitespace = (value) => {
  if (!value) return true;

  const sanitized = value
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, "")
    .replace(/\s+/g, "")
    .trim();

  return sanitized === "";
};

export const saveSignInMetaData = async (userId, metadata) => {
  try {
    await prisma.loginLog.create({
      data: {
        userId: userId,
        ip: metadata?.ip || null,
        city: metadata?.city || null,
        region: metadata?.region || null,
        region_code: metadata?.region_code || null,
        country_code: metadata?.country_code || null,
        country_code_iso3: metadata?.country_code_iso3 || null,
        country: metadata?.country_name || null,
        country_name: metadata?.country_name || null,
        country_capital: metadata?.country_capital || null,
        country_tld: metadata?.country_tld || null,
        continent_code: metadata?.continent_code || null,
        in_eu: metadata?.in_eu || null,
        postal: metadata?.postal || null,
        latitude: metadata?.latitude || null,
        longitude: metadata?.longitude || null,
        timezone: metadata?.timezone || null,
        utc_offset: metadata?.utc_offset || null,
        country_calling_code: metadata?.country_calling_code || null,
        currency: metadata?.currency || null,
        currency_name: metadata?.currency_name || null,
        languages: metadata?.languages || null,
        asn: metadata?.asn || null,
        org: metadata?.org || null,
        userAgent: metadata?.userAgent || null,
        provider: metadata?.provider || null,
      },
    });
  } catch (error) {
    console.error("Failed to save login metadata:", error);
  }
};

export const mailUser = async (userEmail, subject, content) => {
  if (!userEmail || !content || userEmail === CONFIG.DEMO_MAIL) {
    return;
  }
  await mailer.emails.send({
    from: CONFIG.MAIL_FROM,
    to: userEmail,
    subject: subject,
    html: content,
  });
};
