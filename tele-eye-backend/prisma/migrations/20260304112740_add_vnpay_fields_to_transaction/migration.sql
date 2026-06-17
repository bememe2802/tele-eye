/*
  Warnings:

  - A unique constraint covering the columns `[external_transaction_id]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "description" TEXT,
ADD COLUMN     "external_transaction_id" TEXT,
ADD COLUMN     "raw_response" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_external_transaction_id_key" ON "Transaction"("external_transaction_id");
