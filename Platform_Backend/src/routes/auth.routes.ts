import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200)
});

router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Enter a valid email and password." });
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.platformUser.findUnique({ where: { email } });
    if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }
    const token = jwt.sign({ role: user.role }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
    await prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) { return next(error); }
});

router.get("/me", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.platformUser.findUnique({
      where: { id: req.auth!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
    });
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Administrator account is unavailable." });
    return res.json({ success: true, user });
  } catch (error) { return next(error); }
});

export default router;
