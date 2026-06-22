-- CreateTable
CREATE TABLE IF NOT EXISTS "MedicalRecord" (
    "record_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "appointment_id" INTEGER,
    "diagnosis" TEXT,
    "prescription" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalRecord_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Prescription" (
    "prescription_id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "medication_name" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TestResult" (
    "test_id" SERIAL NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "test_type" TEXT NOT NULL,
    "test_date" TIMESTAMP(3) NOT NULL,
    "result_data" JSONB,
    "file_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("test_id")
);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'Prescription_record_id_fkey'
    ) THEN
        ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "MedicalRecord"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
