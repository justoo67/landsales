-- Multi-agent tenancy.
--
-- Every agent-owned row now belongs to an AgentProfile. Existing data is
-- backfilled to the oldest agent, which is the account that created it.
-- Sale records, installments, reviews and commissions stay linked to a plot,
-- so their owner is derived through Plot.agentId.

-- Fail loudly instead of silently orphaning rows.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "AgentProfile") AND EXISTS (SELECT 1 FROM "Plot") THEN
    RAISE EXCEPTION 'Cannot backfill agentId: no AgentProfile rows exist';
  END IF;
END $$;

-- 1. Ownership columns (nullable first, so existing rows can be backfilled).
ALTER TABLE "Plot" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Contact" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Activity" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Task" ADD COLUMN "agentId" TEXT;
ALTER TABLE "SiteVisit" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Document" ADD COLUMN "agentId" TEXT;
ALTER TABLE "Comparable" ADD COLUMN "agentId" TEXT;

-- 2. Backfill to the oldest agent (the one that created the data).
UPDATE "Plot" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Contact" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Lead" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Activity" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Task" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "SiteVisit" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Document" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;
UPDATE "Comparable" SET "agentId" = (SELECT "id" FROM "AgentProfile" ORDER BY "createdAt" ASC LIMIT 1) WHERE "agentId" IS NULL;

-- 3. Enforce ownership.
ALTER TABLE "Plot" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Contact" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Activity" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Task" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "SiteVisit" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "agentId" SET NOT NULL;
ALTER TABLE "Comparable" ALTER COLUMN "agentId" SET NOT NULL;

-- 4. Foreign keys.
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SiteVisit" ADD CONSTRAINT "SiteVisit_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comparable" ADD CONSTRAINT "Comparable_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Indexes: agent-scoped variants replace the global ones.
DROP INDEX "Plot_deletedAt_status_idx";
CREATE INDEX "Plot_agentId_deletedAt_status_idx" ON "Plot"("agentId", "deletedAt", "status");

DROP INDEX "Contact_phone_key";
CREATE UNIQUE INDEX "Contact_agentId_phone_key" ON "Contact"("agentId", "phone");
DROP INDEX "Contact_name_idx";
CREATE INDEX "Contact_agentId_name_idx" ON "Contact"("agentId", "name");

DROP INDEX "Lead_stage_index_idx";
CREATE INDEX "Lead_agentId_stage_index_idx" ON "Lead"("agentId", "stage", "index");
DROP INDEX "Lead_nextActionAt_idx";
CREATE INDEX "Lead_agentId_nextActionAt_idx" ON "Lead"("agentId", "nextActionAt");

DROP INDEX "Activity_createdAt_idx";
CREATE INDEX "Activity_agentId_createdAt_idx" ON "Activity"("agentId", "createdAt");

DROP INDEX "Task_doneAt_dueAt_idx";
CREATE INDEX "Task_agentId_doneAt_dueAt_idx" ON "Task"("agentId", "doneAt", "dueAt");

DROP INDEX "SiteVisit_scheduledAt_status_idx";
CREATE INDEX "SiteVisit_agentId_scheduledAt_status_idx" ON "SiteVisit"("agentId", "scheduledAt", "status");

CREATE INDEX "Document_agentId_createdAt_idx" ON "Document"("agentId", "createdAt");

DROP INDEX "Comparable_county_ward_observedAt_idx";
CREATE INDEX "Comparable_agentId_county_ward_observedAt_idx" ON "Comparable"("agentId", "county", "ward", "observedAt");
DROP INDEX "Comparable_observedAt_idx";
CREATE INDEX "Comparable_agentId_observedAt_idx" ON "Comparable"("agentId", "observedAt");

-- 6. An email is required now that more than one agent can exist.
ALTER TABLE "AgentProfile" ALTER COLUMN "email" DROP DEFAULT;
