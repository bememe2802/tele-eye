CREATE TABLE IF NOT EXISTS "Drug" (
    "drug_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active_ingredient" TEXT,
    "unit" TEXT,
    "usage_instruction" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("drug_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Drug_name_key" ON "Drug"("name");
