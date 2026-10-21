import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

router.get("/", async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid school query parameters." });
    const { search, status, page, limit } = parsed.data;
    const where = {
      ...(status ? { status } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { workspaceUrl: { contains: search, mode: "insensitive" as const } }
      ] } : {})
    };
    const [items, total] = await Promise.all([
      prisma.schoolTenant.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        include: { _count: { select: { users: true } } }
      }),
      prisma.schoolTenant.count({ where })
    ]);
    return res.json({
      success: true,
      data: items.map(({ _count, ...school }) => ({ ...school, userCount: _count.users })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) { return next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const school = await prisma.schoolTenant.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { users: true } } }
    });
    if (!school) return res.status(404).json({ success: false, message: "School tenant not found." });
    const { _count, ...data } = school;
    return res.json({ success: true, data: { ...data, userCount: _count.users } });
  } catch (error) { return next(error); }
});

export default router;
