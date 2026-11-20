-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "priceType" TEXT NOT NULL DEFAULT 'FIXED',
    "priceKes" DOUBLE PRECISION,
    "sizePreset" TEXT NOT NULL,
    "sizeCustomValue" TEXT,
    "zoning" TEXT,
    "roadAccess" TEXT,
    "waterSource" TEXT,
    "electricity" TEXT,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "photos" TEXT NOT NULL,
    "videoUrl" TEXT,
    "customAttributes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleRecord" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerNationalId" TEXT,
    "buyerCustomFields" TEXT,
    "agreedPriceKes" DOUBLE PRECISION NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'LUMP_SUM',
    "depositKes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceKes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextDueDate" TIMESTAMP(3),
    "titleStatus" TEXT NOT NULL DEFAULT 'DEPOSIT_PAID',
    "notes" TEXT,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SaleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentInstallment" (
    "id" TEXT NOT NULL,
    "saleRecordId" TEXT NOT NULL,
    "amountKes" DOUBLE PRECISION NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerReview" (
    "id" TEXT NOT NULL,
    "saleRecordId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BuyerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL,
    "agentName" TEXT NOT NULL DEFAULT 'Land Sales Specialist',
    "email" TEXT NOT NULL DEFAULT 'agent@example.com',
    "passwordHash" TEXT,
    "whatsappNumber" TEXT NOT NULL DEFAULT '+254700000000',
    "customGreeting" TEXT DEFAULT 'Hi! I''m inquiring about [Plot Title]. Is it still available?',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SaleRecord_plotId_key" ON "SaleRecord"("plotId");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerReview_saleRecordId_key" ON "BuyerReview"("saleRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_email_key" ON "AgentProfile"("email");

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentInstallment" ADD CONSTRAINT "PaymentInstallment_saleRecordId_fkey" FOREIGN KEY ("saleRecordId") REFERENCES "SaleRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerReview" ADD CONSTRAINT "BuyerReview_saleRecordId_fkey" FOREIGN KEY ("saleRecordId") REFERENCES "SaleRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

