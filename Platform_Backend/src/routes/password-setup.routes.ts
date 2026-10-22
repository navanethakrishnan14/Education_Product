import { Router } from "express";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const router = Router();
const schema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(8).max(128).regex(/[a-z]/, "Use at least one lowercase letter.")
    .regex(/[A-Z]/, "Use at least one uppercase letter.")
    .regex(/[0-9]/, "Use at least one number.")
    .regex(/[^A-Za-z0-9]/, "Use at least one special character.")
});

router.get("/validate", async (req, res, next) => {
  try {
    const parsed = z.object({ token: z.string().min(32).max(256) }).safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "This password setup link is missing a valid token. Open the full link from your email." });
    }

    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const tenant = await prisma.schoolTenant.findFirst({
      where: { passwordSetupTokenHash: tokenHash },
      select: {
        name: true,
        officialEmail: true,
        workspaceUrl: true,
        passwordSetupExpiresAt: true
      }
    });

    if (!tenant) {
      return res.status(400).json({ success: false, message: "This password setup link is invalid or has already been used. Ask the platform administrator to send a new email." });
    }
    if (!tenant.passwordSetupExpiresAt || tenant.passwordSetupExpiresAt <= new Date()) {
      return res.status(410).json({ success: false, message: "This password setup link has expired. Ask the platform administrator to send a new email." });
    }

    return res.json({
      success: true,
      data: {
        organizationName: tenant.name,
        officialEmail: tenant.officialEmail,
        workspaceUrl: tenant.workspaceUrl,
        expiresAt: tenant.passwordSetupExpiresAt
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.", errors: parsed.error.flatten().fieldErrors });
    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const tenant = await prisma.schoolTenant.findFirst({
      where: { passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: { gt: new Date() } },
      select: { id: true, name: true, officialEmail: true }
    });
    if (!tenant) return res.status(400).json({ success: false, message: "This setup link is invalid or has expired. Ask the platform administrator to send a new one." });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const updated = await prisma.schoolTenant.updateMany({
      where: { id: tenant.id, passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: { gt: new Date() } },
      data: { adminPasswordHash: passwordHash, passwordSetAt: new Date(), status: "active", passwordSetupTokenHash: null, passwordSetupExpiresAt: null }
    });
    if (updated.count !== 1) return res.status(400).json({ success: false, message: "This setup link has already been used or has expired. Ask the platform administrator for a new link." });
    return res.json({ success: true, message: "Password created successfully. You can now continue to your organization login.", data: { organizationName: tenant.name, email: tenant.officialEmail } });
  } catch (error) { return next(error); }
});

export default router;
