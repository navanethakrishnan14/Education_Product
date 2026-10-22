-- One-time rollout helper for the current onboarding phase.
-- Makes every existing tenant active before the Active/Inactive admin toggle exists.
-- Do not rerun after an Active/Inactive toggle is introduced, because it intentionally
-- overwrites any inactive status.
UPDATE edusphere_platform.school_tenants
SET status = 'active'
WHERE status IS DISTINCT FROM 'active';
