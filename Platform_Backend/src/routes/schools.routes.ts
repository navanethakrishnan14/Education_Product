import { Router } from "express";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";
import { isEmailConfigured, sendPasswordSetupEmail } from "../lib/mailer";

const router = Router();
router.use(requireAuth);

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});


const tenantTypeSchema = z.enum(["school", "college", "institution"]);
const tenantPrefix: Record<z.infer<typeof tenantTypeSchema>, string> = {
  school: "SCH",
  college: "COL",
  institution: "INS"
};

const createSchoolSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: z.string().trim().regex(/^(SCH|COL|INS)-\d{4}-\d{4,}$/, "Code must use the format SCH-YYYY-0001, COL-YYYY-0001 or INS-YYYY-0001."),
  tenantType: tenantTypeSchema.default("school"),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(40),
  workspaceUrl: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i, "Enter a valid tenant subdomain."),
  plan: z.string().trim().min(1).max(60).optional(),
  activationStatus: z.string().trim().max(30).optional()
}).passthrough();

router.post("/code", async (req, res, next) => {
  try {
    const parsed = z.object({ tenantType: tenantTypeSchema.default("school") }).safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Choose a valid tenant type: school, college or institution." });
    }

    const tenantType = parsed.data.tenantType;
    const year = new Date().getFullYear();
    const counter = await prisma.tenantCodeCounter.upsert({
      where: { tenantType_year: { tenantType, year } },
      create: { tenantType, year, lastNumber: 1 },
      update: { lastNumber: { increment: 1 } }
    });
    const code = tenantPrefix[tenantType] + "-" + year + "-" + String(counter.lastNumber).padStart(4, "0");
    return res.json({ success: true, data: { code } });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const parsed = createSchoolSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the required school fields.", errors: parsed.error.flatten().fieldErrors });
    const input = parsed.data;
    if (!isEmailConfigured()) return res.status(503).json({ success: false, message: "Email delivery is not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM to Platform_Backend/.env before creating tenants." });
    const officialEmail = input.email.toLowerCase();
    if (!input.code.startsWith(tenantPrefix[input.tenantType] + "-")) {
      return res.status(400).json({ success: false, message: "The code prefix does not match the selected tenant type." });
    }
    const duplicateCode = await prisma.schoolTenant.findUnique({ where: { code: input.code } });
    if (duplicateCode) return res.status(409).json({ success: false, message: "This tenant code is already registered. Refresh the form to generate another code." });
    const duplicateEmail = await prisma.schoolTenant.findUnique({ where: { officialEmail } });
    if (duplicateEmail) return res.status(409).json({ success: false, message: "This Official Email is already registered to an organization." });
    const existing = await prisma.schoolTenant.findUnique({ where: { workspaceUrl: input.workspaceUrl } });
    if (existing) return res.status(409).json({ success: false, message: "That school subdomain is already in use." });
    const details = { ...input, email: officialEmail };
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const school = await prisma.schoolTenant.create({
      data: {
        name: input.name,
        code: input.code,
        tenantType: input.tenantType,
        workspaceUrl: input.workspaceUrl.toLowerCase(),
        status: input.activationStatus?.toLowerCase() === "active" ? "active" : input.activationStatus?.toLowerCase() === "suspended" ? "suspended" : "inactive",
        planName: input.plan || "Free Trial",
        officialEmail,
        passwordSetupTokenHash: tokenHash,
        passwordSetupExpiresAt: expiresAt,
        details: details as Prisma.InputJsonValue
      }
    });
    const setupUrl = new URL("/set-password", env.FRONTEND_URL);
    setupUrl.searchParams.set("token", rawToken);
    try {
      await sendPasswordSetupEmail({ to: officialEmail, organizationName: school.name, setupUrl: setupUrl.toString() });
    } catch (_emailError) {
      await prisma.schoolTenant.delete({ where: { id: school.id } });
      return res.status(502).json({ success: false, message: "The organization was not saved because the password setup email could not be sent. Check SMTP settings and try again." });
    }
    const { passwordSetupTokenHash: _tokenHash, passwordSetupExpiresAt: _expiresAt, adminPasswordHash: _passwordHash, ...safeSchool } = school;
    return res.status(201).json({ success: true, message: "Organization created. A password setup link was sent to the Official Email.", data: { ...safeSchool, passwordSetupEmailSent: true } });
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
