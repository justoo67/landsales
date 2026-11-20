-- AlterTable
ALTER TABLE "Plot" ADD COLUMN     "county" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "ward" TEXT;

-- CreateTable
CREATE TABLE "Comparable" (
    "id" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "ward" TEXT,
    "locationName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "sizeAcres" DECIMAL(10,4) NOT NULL,
    "priceKes" DECIMAL(14,2) NOT NULL,
    "pricePerAcre" DECIMAL(14,2) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SALE',
    "source" TEXT NOT NULL DEFAULT 'AGENT',
    "sourceUrl" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comparable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Comparable_county_ward_observedAt_idx" ON "Comparable"("county", "ward", "observedAt");

-- CreateIndex
CREATE INDEX "Comparable_observedAt_idx" ON "Comparable"("observedAt");

