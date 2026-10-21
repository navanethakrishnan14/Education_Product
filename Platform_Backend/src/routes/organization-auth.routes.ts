import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

// Organization Management sign-in uses the official email/password configured
// through the one-time password setup link. Other roles use Tenant_backend.
router.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Enter the official organization email and password." });
    }

    const email = parsed.data.email.toLowerCase();
    const tenant = await prisma.schoolTenant.findUnique({
      where: { officialEmail: email }
    });

    if (!tenant || !tenant.adminPasswordHash || !tenant.passwordSetAt ||
        !(await bcrypt.compare(parsed.data.password, tenant.adminPasswordHash))) {
      return res.status(401).json({ success: false, message: "Invalid official email or password." });
    }

    if (tenant.status.toLowerCase() !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your password is set, but this organization is not active yet. Ask the platform administrator to activate the organization before signing in."
      });
    }

    const token = jwt.sign(
      { role: "MANAGEMENT", tenantId: tenant.id, tenantCode: tenant.code, tenantType: tenant.tenantType },
      env.JWT_SECRET,
      { subject: tenant.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: tenant.id,
        tenantId: tenant.id,
        tenantCode: tenant.code,
        name: tenant.name,
        email: tenant.officialEmail,
        role: "MANAGEMENT",
        tenantType: tenant.tenantType
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
