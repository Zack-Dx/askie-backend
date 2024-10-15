import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { CONFIG } from "./config/env/index.js";
import { authRouter } from "./routes/auth.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { questionRouter } from "./routes/question.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";

const app = express();

app.get("/", (req, res) => {
  res.redirect("/health");
});

app.get("/health", (req, res) => {
  return res.status(200).json({ message: "OK" });
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use(`/api/${CONFIG.API_VERSION}`, authRouter);
app.use(`/api/${CONFIG.API_VERSION}`, userRouter);
app.use(`/api/${CONFIG.API_VERSION}`, questionRouter);
app.use(`/api/${CONFIG.API_VERSION}`, notificationRouter);

app.use((_, res) => {
  return res.status(404).json({ message: "Route not found." });
});

export { app };
