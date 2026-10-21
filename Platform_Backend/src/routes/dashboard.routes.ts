import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/overview", async (_req, res, next) => {
  try {
    const [schools, tenantUsers, activeSchools, activeTenantUsers, admins] = await Promise.all([
      prisma.schoolTenant.count(),
      prisma.tenantUser.count(),
      prisma.schoolTenant.count({ where: { status: "active" } }),
      prisma.tenantUser.count({ where: { isActive: true } }),
      prisma.platformUser.count({ where: { isActive: true } })
    ]);

    return res.json({
      success: true,
      data: {
        registeredSchools: schools,
        tenantUsers,
        activeSchools,
        activeTenantUsers,
        platformAdmins: admins,
        platformHealth: "healthy",
        database: "connected"
      }
    });
  } catch (error) { return next(error); }
});

export default router;
