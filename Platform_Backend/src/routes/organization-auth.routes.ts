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

    // Temporary default until the platform adds an Active/Inactive toggle:
    // successful Management authentication ensures this tenant is marked active.
    const activeTenant = tenant.status.toLowerCase() === "active"
      ? tenant
      : await prisma.schoolTenant.update({
          where: { id: tenant.id },
          data: { status: "active" }
        });

    const token = jwt.sign(
      { role: "MANAGEMENT", tenantId: activeTenant.id, tenantCode: activeTenant.code, tenantType: activeTenant.tenantType },
      env.JWT_SECRET,
      { subject: activeTenant.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: activeTenant.id,
        tenantId: activeTenant.id,
        tenantCode: activeTenant.code,
        name: activeTenant.name,
        email: activeTenant.officialEmail,
        role: "MANAGEMENT",
        tenantType: activeTenant.tenantType
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
