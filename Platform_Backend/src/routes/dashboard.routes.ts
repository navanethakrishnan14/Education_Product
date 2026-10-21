import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/overview", async (_req, res, next) => {
  try {
    const [schools, tenantUserStats, activeSchools, admins] = await Promise.all([
      prisma.schoolTenant.count(),
      // Tenant users are owned by Tenant_backend in the shared public schema.
      // Read their metrics without modelling or modifying that table in Platform Prisma.
      prisma.$queryRaw<Array<{ total: number; active: number }>>`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active
        FROM public.tenant_users
      `,
      prisma.schoolTenant.count({ where: { status: "active" } }),
      prisma.platformUser.count({ where: { isActive: true } })
    ]);

    const tenantUsers = tenantUserStats[0]?.total ?? 0;
    const activeTenantUsers = tenantUserStats[0]?.active ?? 0;

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
