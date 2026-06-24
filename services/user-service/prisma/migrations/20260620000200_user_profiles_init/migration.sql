-- CreateTable
CREATE TABLE IF NOT EXISTS "UserProfile" (
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT,
    "phone" TEXT,
    "avatar_url" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "emergency_contact" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DoctorProfile" (
    "doctor_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "specialization" TEXT,
    "license_number" TEXT,
    "years_of_exp" INTEGER NOT NULL DEFAULT 0,
    "consultation_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bio" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("doctor_id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PatientProfile" (
    "patient_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "blood_type" TEXT,
    "allergies" TEXT,
    "medical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientProfile_pkey" PRIMARY KEY ("patient_id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DoctorProfile_user_id_key" ON "DoctorProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PatientProfile_user_id_key" ON "PatientProfile"("user_id");
