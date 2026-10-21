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

router.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid user query parameters." });
    const { search, page, limit } = parsed.data;
    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { role: { contains: search, mode: "insensitive" as const } }
      ]
    } : {};
    const [items, total] = await Promise.all([
      prisma.tenantUser.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        select: {
          id: true, name: true, email: true, role: true, isActive: true, createdAt: true,
          schoolTenant: { select: { id: true, name: true, workspaceUrl: true, status: true } }
        }
      }),
      prisma.tenantUser.count({ where })
    ]);
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
