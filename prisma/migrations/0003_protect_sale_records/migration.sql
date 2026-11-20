-- A plot must never be physically deleted while a sale record exists.
-- Deletes are soft (`Plot.deletedAt`); this constraint protects the payment
-- ledger from a raw DELETE or a future code mistake.

-- DropForeignKey
ALTER TABLE "SaleRecord" DROP CONSTRAINT "SaleRecord_plotId_fkey";

-- AddForeignKey
ALTER TABLE "SaleRecord" ADD CONSTRAINT "SaleRecord_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
