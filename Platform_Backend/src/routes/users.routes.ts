import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

type LegacyTenantUserRow = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
};

router.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid user query parameters." });
    const { search, page, limit } = parsed.data;
    const searchTerm = search || null;
    const offset = (page - 1) * limit;

    // tenant_users belongs to Tenant_backend and retains its existing public-schema
    // columns (tenant_id, full_name, password_hash, role, is_active, created_at).
    // Use read-only SQL instead of adding this legacy table to Platform Prisma.
    const [items, totals] = await Promise.all([
      prisma.$queryRaw<LegacyTenantUserRow[]>`
        SELECT
          id::text AS id,
          tenant_id::text AS "tenantId",
          full_name AS name,
          email,
          role::text AS role,
          is_active AS "isActive",
          created_at AS "createdAt"
        FROM public.tenant_users
        WHERE (
          ${searchTerm}::text IS NULL
          OR full_name ILIKE '%' || ${searchTerm} || '%'
          OR email ILIKE '%' || ${searchTerm} || '%'
          OR role::text ILIKE '%' || ${searchTerm} || '%'
        )
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT COUNT(*)::int AS total
        FROM public.tenant_users
        WHERE (
          ${searchTerm}::text IS NULL
          OR full_name ILIKE '%' || ${searchTerm} || '%'
          OR email ILIKE '%' || ${searchTerm} || '%'
          OR role::text ILIKE '%' || ${searchTerm} || '%'
        )
      `
    ]);

    const total = totals[0]?.total ?? 0;
    return res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) { return next(error); }
});

router.get("/platform-admins", async (_req, res, next) => {
  try {
    const admins = await prisma.platformUser.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true }
    });
    return res.json({ success: true, data: admins });
  } catch (error) { return next(error); }
});

export default router;
