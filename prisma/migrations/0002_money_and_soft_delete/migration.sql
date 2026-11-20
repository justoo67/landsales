-- AlterTable
ALTER TABLE "Plot" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ALTER COLUMN "priceKes" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "SaleRecord" ALTER COLUMN "agreedPriceKes" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "depositKes" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "balanceKes" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "PaymentInstallment" ALTER COLUMN "amountKes" SET DATA TYPE DECIMAL(14,2);

-- CreateIndex
CREATE INDEX "Plot_deletedAt_status_idx" ON "Plot"("deletedAt", "status");

