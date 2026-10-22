import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import schoolsRoutes from "./routes/schools.routes";
import usersRoutes from "./routes/users.routes";
import passwordSetupRoutes from "./routes/password-setup.routes";
import organizationAuthRoutes from "./routes/organization-auth.routes";

export const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    const allowed = env.CORS_ORIGIN.split(",").map((item) => item.trim()).filter(Boolean);
    if (!origin || allowed.includes("*") || allowed.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.get("/health", (_req, res) => res.json({ success: true, status: "ok", service: "edusphere-platform-api", timestamp: new Date().toISOString() }));
app.use("/api/v1/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), authRoutes);
app.use("/api/v1/password-setup", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), passwordSetupRoutes);
app.use("/api/v1/organization-auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }), organizationAuthRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/schools", schoolsRoutes);
app.use("/api/v1/users", usersRoutes);
app.use((_req, res) => res.status(404).json({ success: false, message: "The requested endpoint was not found." }));

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ success: false, message: "Invalid JSON request body." });
  }
  if (error?.message === "Origin is not allowed by CORS.") {
    return res.status(403).json({ success: false, message: error.message });
  }

  const databaseError = error as { code?: string; message?: string; meta?: { target?: string[] | string } };
  if (databaseError.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A tenant with the same unique email, workspace URL or tenant code already exists. Check the tenant details and try again."
    });
  }
  if (databaseError.code === "P2021" || databaseError.code === "P2022") {
    console.error("Platform database schema is out of date:", databaseError.code, databaseError.message);
    return res.status(503).json({
      success: false,
      message: "The Platform database schema is missing required tenant tables or columns. Stop Platform_Backend, run `npm run db:push:safe` in Platform_Backend, then restart it."
    });
  }

  if (env.NODE_ENV !== "production") {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: databaseError.message || "Unexpected Platform API error.",
      code: databaseError.code
    });
  }

  console.error("Unexpected Platform API error:", databaseError.code || "unknown");
  return res.status(500).json({ success: false, message: "An unexpected server error occurred." });
};
app.use(errorHandler);
