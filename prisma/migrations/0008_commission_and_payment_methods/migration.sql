-- AlterTable
ALTER TABLE "PaymentInstallment" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'MPESA',
ADD COLUMN     "receiptUrl" TEXT;

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'PERCENT',
    "ratePercent" DECIMAL(5,2),
    "amountKes" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commission_saleId_key" ON "Commission"("saleId");

-- CreateIndex
CREATE INDEX "Commission_status_idx" ON "Commission"("status");

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "SaleRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

