import { Router, type RequestHandler } from "express";
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
  code: z.string().trim().regex(/^(SCH|COL|INS)-\d{4}-\d{4,}$/, "Code must use the format SCH-YYYY-0001, COL-YYYY-0001 or INS-YYYY-0001.").optional(),
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
    const prefix = tenantPrefix[tenantType] + "-" + year + "-";
    // Preview only: viewing, reopening, or cancelling a form never consumes a code.
    const existingCodes = await prisma.schoolTenant.findMany({
      where: { tenantType, code: { startsWith: prefix } },
      select: { code: true }
    });
    const lastUsedNumber = existingCodes.reduce((largest, tenant) => {
      const suffix = tenant.code?.startsWith(prefix) ? Number(tenant.code.slice(prefix.length)) : 0;
      return Number.isInteger(suffix) ? Math.max(largest, suffix) : largest;
    }, 0);
    const code = prefix + String(lastUsedNumber + 1).padStart(4, "0");
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
    const duplicateEmail = await prisma.schoolTenant.findUnique({ where: { officialEmail } });
    if (duplicateEmail) return res.status(409).json({ success: false, message: "This Official Email is already registered to an organization." });
    const existing = await prisma.schoolTenant.findUnique({ where: { workspaceUrl: input.workspaceUrl } });
    if (existing) return res.status(409).json({ success: false, message: "That school subdomain is already in use." });
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const year = new Date().getFullYear();
    const prefix = tenantPrefix[input.tenantType] + "-" + year + "-";

    // Allocate only when creating. A transaction lock prevents duplicate numbers
    // when two admins create the same tenant type at nearly the same time.
    const school = await prisma.$transaction(async (tx) => {
      const counterKey = { tenantType: input.tenantType, year };

      // Upsert the per-type/year counter first. Updating this unique row locks it
      // for this transaction, serializing concurrent tenant creation without
      // relying on a raw query that returns PostgreSQL's unsupported "void" type.
      await tx.tenantCodeCounter.upsert({
        where: { tenantType_year: counterKey },
        create: { ...counterKey, lastNumber: 0 },
        update: { updatedAt: new Date() }
      });

      const existingCodes = await tx.schoolTenant.findMany({
        where: { tenantType: input.tenantType, code: { startsWith: prefix } },
        select: { code: true }
      });
      const lastUsedNumber = existingCodes.reduce((largest, tenant) => {
        const suffix = tenant.code?.startsWith(prefix) ? Number(tenant.code.slice(prefix.length)) : 0;
        return Number.isInteger(suffix) ? Math.max(largest, suffix) : largest;
      }, 0);
      const nextNumber = lastUsedNumber + 1;
      const code = prefix + String(nextNumber).padStart(4, "0");

      // Reset any old counter inflated by previous form visits; only saved tenant
      // records determine the next code.
      await tx.tenantCodeCounter.update({
        where: { tenantType_year: counterKey },
        data: { lastNumber: nextNumber }
      });

      const details = { ...input, code, email: officialEmail };
      return tx.schoolTenant.create({
        data: {
          name: input.name,
          code,
          tenantType: input.tenantType,
          workspaceUrl: input.workspaceUrl.toLowerCase(),
          status: "active", // Active by default until the platform status toggle is implemented.
          planName: input.plan || "Free Trial",
          officialEmail,
          passwordSetupTokenHash: tokenHash,
          passwordSetupExpiresAt: expiresAt,
          details: details as Prisma.InputJsonValue
        }
      });
    });;
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
        where,
        select: {
          id: true, name: true, code: true, tenantType: true, workspaceUrl: true,
          status: true, planName: true, officialEmail: true, passwordSetAt: true,
          createdAt: true, updatedAt: true
        },
        orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit
      }),
      prisma.schoolTenant.count({ where })
    ]);
    return res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) { return next(error); }
});


router.post("/:id/password-setup/resend", async (req, res, next) => {
  try {
    const tenant = await prisma.schoolTenant.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, officialEmail: true, passwordSetAt: true }
    });
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found." });
    if (tenant.passwordSetAt) {
      return res.status(409).json({ success: false, message: "This organization password has already been set. Use the password reset workflow instead." });
    }
    if (!tenant.officialEmail) {
      return res.status(400).json({ success: false, message: "This tenant has no Official Email. Edit the tenant details before sending a setup email." });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ success: false, message: "Email delivery is not configured. Check SMTP settings in Platform_Backend/.env." });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.schoolTenant.update({
      where: { id: tenant.id },
      data: { passwordSetupTokenHash: tokenHash, passwordSetupExpiresAt: expiresAt }
    });

    const setupUrl = new URL("/set-password", env.FRONTEND_URL);
    setupUrl.searchParams.set("token", rawToken);
    try {
      await sendPasswordSetupEmail({
        to: tenant.officialEmail,
        organizationName: tenant.name,
        setupUrl: setupUrl.toString()
      });
    } catch (emailError) {
      await prisma.schoolTenant.updateMany({
        where: { id: tenant.id, passwordSetupTokenHash: tokenHash },
        data: { passwordSetupTokenHash: null, passwordSetupExpiresAt: null }
      });
      console.error("Unable to resend password setup email:", emailError);
      return res.status(502).json({ success: false, message: "The setup email could not be sent. Check SMTP settings and try again." });
    }

    return res.json({
      success: true,
      message: "A new password setup link has been sent to " + tenant.officialEmail + ". The link expires in 30 minutes."
    });
  } catch (error) {
    return next(error);
  }
});

const updateTenantSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  officialEmail: z.string().trim().email().max(254).optional(),
  workspaceUrl: z.string().trim().min(3).max(180).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  planName: z.string().trim().max(60).nullable().optional()
}).refine(value => Object.keys(value).length > 0, "Provide at least one field to update.");

const updateTenantHandler: RequestHandler = async (req, res, next) => {
  try {
    const parsed = updateTenantSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Check the tenant fields.", errors: parsed.error.flatten().fieldErrors });
    const current = await prisma.schoolTenant.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ success: false, message: "Tenant not found." });
    const input = parsed.data;
    const officialEmail = input.officialEmail?.toLowerCase();
    if (officialEmail && officialEmail !== current.officialEmail) {
      const duplicate = await prisma.schoolTenant.findUnique({ where: { officialEmail } });
      if (duplicate) return res.status(409).json({ success: false, message: "This Official Email is already registered." });
    }
    const workspaceUrl = input.workspaceUrl?.toLowerCase();
    if (workspaceUrl && workspaceUrl !== current.workspaceUrl) {
      const duplicate = await prisma.schoolTenant.findUnique({ where: { workspaceUrl } });
      if (duplicate) return res.status(409).json({ success: false, message: "That workspace URL is already in use." });
    }
    const updated = await prisma.schoolTenant.update({
      where: { id: current.id },
      data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(officialEmail !== undefined ? { officialEmail } : {}), ...(workspaceUrl !== undefined ? { workspaceUrl } : {}), ...(input.status !== undefined ? { status: input.status } : {}), ...(input.planName !== undefined ? { planName: input.planName } : {}) }
    });
    const { passwordSetupTokenHash: _tokenHash, passwordSetupExpiresAt: _expiresAt, adminPasswordHash: _passwordHash, ...safeTenant } = updated;
    return res.json({ success: true, data: safeTenant });
  } catch (error) { return next(error); }
};

// Edit tenant: PATCH is used by the frontend; PUT is also supported for API clients.
router.patch("/:id", updateTenantHandler);
router.put("/:id", updateTenantHandler);
router.delete("/:id", async (req, res, next) => {
  try {
    const tenant = await prisma.schoolTenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) return res.status(404).json({ success: false, message: "Tenant not found." });
    await prisma.schoolTenant.delete({ where: { id: tenant.id } });
    return res.json({ success: true, message: "Tenant deleted successfully." });
  } catch (error) { return next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const school = await prisma.schoolTenant.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, code: true, tenantType: true, workspaceUrl: true,
        status: true, planName: true, officialEmail: true, passwordSetAt: true,
        createdAt: true, updatedAt: true
      }
    });
    if (!school) return res.status(404).json({ success: false, message: "School tenant not found." });
    return res.json({ success: true, data: school });
  } catch (error) { return next(error); }
});

export default router;
