-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "payment_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT,
    "transaction_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invoice" (
    "invoice_id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "invoice_url" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("invoice_id")
);
