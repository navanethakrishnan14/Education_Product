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


const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().min(2).max(40),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(40),
  workspaceUrl: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "Enter a valid school subdomain."),
  plan: z.string().trim().min(1).max(60).optional(),
  activationStatus: z.string().trim().max(30).optional()
}).passthrough();

router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchoolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the required school fields.", errors: parsed.error.flatten().fieldErrors });
    const input = parsed.data;
    const existing = await prisma.schoolTenant.findUnique({ where: { workspaceUrl: input.workspaceUrl } });
    if (existing) return res.status(409).json({ success: false, message: "That school subdomain is already in use." });
    const details = { ...input };
    const school = await prisma.schoolTenant.create({
      data: {
        name: input.name,
        workspaceUrl: input.workspaceUrl.toLowerCase(),
        status: input.activationStatus?.toLowerCase() === "active" ? "active" : input.activationStatus?.toLowerCase() === "suspended" ? "suspended" : "inactive",
        planName: input.plan || "Free Trial",
        details
      }
    });
    return res.status(201).json({ success: true, message: "School tenant created.", data: school });
  } catch (error) { return next(error); }
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
