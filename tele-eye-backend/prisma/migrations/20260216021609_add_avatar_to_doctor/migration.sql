-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'LOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('PAYMENT', 'REFUND', 'WITHDRAW', 'TOP_UP');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "FileType" AS ENUM ('EYE_IMAGE', 'OLD_PRESCRIPTION', 'LAB_REPORT', 'OTHER');

-- CreateTable
CREATE TABLE "User" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "refresh_token" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "patient_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT,
    "avatar_url" TEXT,
    "date_of_birth" DATE,
    "gender" "Gender",
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("patient_id")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "doctor_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "title" TEXT,
    "license_number" TEXT,
    "phone_number" TEXT,
    "bio" TEXT,
    "experience_years" INTEGER,
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "consultation_fee" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("doctor_id")
);

-- CreateTable
CREATE TABLE "Specialization" (
    "spec_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Specialization_pkey" PRIMARY KEY ("spec_id")
);

-- CreateTable
CREATE TABLE "DoctorSpecialization" (
    "doctor_id" INTEGER NOT NULL,
    "spec_id" INTEGER NOT NULL,

    CONSTRAINT "DoctorSpecialization_pkey" PRIMARY KEY ("doctor_id","spec_id")
);

-- CreateTable
CREATE TABLE "SystemTimeSlot" (
    "slot_template_id" SERIAL NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "shift_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SystemTimeSlot_pkey" PRIMARY KEY ("slot_template_id")
);

-- CreateTable
CREATE TABLE "DoctorAvailability" (
    "availability_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "slot_template_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DoctorAvailability_pkey" PRIMARY KEY ("availability_id")
);

-- CreateTable
CREATE TABLE "DoctorCalendarSlots" (
    "slot_id" SERIAL NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "date_slot" DATE NOT NULL,
    "start_time" TIME NOT NULL,
    "end_time" TIME NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "price" DECIMAL(10,2) NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_expires_at" TIMESTAMP(3),

    CONSTRAINT "DoctorCalendarSlots_pkey" PRIMARY KEY ("slot_id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "appointment_id" SERIAL NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "doctor_id" INTEGER NOT NULL,
    "status" "AppointmentStatus" NOT NULL,
    "meeting_link" TEXT,
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("appointment_id")
);

-- CreateTable
CREATE TABLE "EyeMedicalRecord" (
    "record_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "chief_complaint" TEXT,
    "history_of_present_illness" TEXT,
    "diagnosis_od" TEXT,
    "diagnosis_os" TEXT,
    "icd_10_code" TEXT,
    "management_plan" TEXT,
    "doctor_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EyeMedicalRecord_pkey" PRIMARY KEY ("record_id")
);

-- CreateTable
CREATE TABLE "Drug" (
    "drug_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active_ingredient" TEXT,
    "unit" TEXT,
    "usage_instruction" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Drug_pkey" PRIMARY KEY ("drug_id")
);

-- CreateTable
CREATE TABLE "DrugPrescription" (
    "drug_rx_id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DrugPrescription_pkey" PRIMARY KEY ("drug_rx_id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "item_id" SERIAL NOT NULL,
    "drug_rx_id" INTEGER NOT NULL,
    "drug_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "dosage" TEXT,
    "note" TEXT,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "GlassesPrescription" (
    "prescription_id" SERIAL NOT NULL,
    "record_id" INTEGER NOT NULL,
    "od_sphere" DECIMAL(4,2),
    "od_cylinder" DECIMAL(4,2),
    "od_axis" INTEGER,
    "od_pd" DECIMAL(4,1),
    "os_sphere" DECIMAL(4,2),
    "os_cylinder" DECIMAL(4,2),
    "os_axis" INTEGER,
    "os_pd" DECIMAL(4,1),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlassesPrescription_pkey" PRIMARY KEY ("prescription_id")
);

-- CreateTable
CREATE TABLE "MedicalFile" (
    "file_id" SERIAL NOT NULL,
    "appointment_id" INTEGER,
    "uploader_id" INTEGER NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" "FileType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalFile_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "PaymentType" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "payment_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "AppointmentPayment" (
    "id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "message_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "AppointmentReview" (
    "review_id" SERIAL NOT NULL,
    "appointment_id" INTEGER NOT NULL,
    "patient_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentReview_pkey" PRIMARY KEY ("review_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_email_token_key" ON "VerificationToken"("email", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_user_id_key" ON "Patient"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_user_id_key" ON "Doctor"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_license_number_key" ON "Doctor"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "Specialization_name_key" ON "Specialization"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAvailability_doctor_id_day_of_week_slot_template_id_v_key" ON "DoctorAvailability"("doctor_id", "day_of_week", "slot_template_id", "valid_from");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorCalendarSlots_doctor_id_date_slot_start_time_key" ON "DoctorCalendarSlots"("doctor_id", "date_slot", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_slot_id_key" ON "Appointment"("slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "EyeMedicalRecord_appointment_id_key" ON "EyeMedicalRecord"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Drug_name_key" ON "Drug"("name");

-- CreateIndex
CREATE UNIQUE INDEX "DrugPrescription_record_id_key" ON "DrugPrescription"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "GlassesPrescription_record_id_key" ON "GlassesPrescription"("record_id");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReview_appointment_id_key" ON "AppointmentReview"("appointment_id");

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialization" ADD CONSTRAINT "DoctorSpecialization_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorSpecialization" ADD CONSTRAINT "DoctorSpecialization_spec_id_fkey" FOREIGN KEY ("spec_id") REFERENCES "Specialization"("spec_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "DoctorAvailability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAvailability" ADD CONSTRAINT "DoctorAvailability_slot_template_id_fkey" FOREIGN KEY ("slot_template_id") REFERENCES "SystemTimeSlot"("slot_template_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorCalendarSlots" ADD CONSTRAINT "DoctorCalendarSlots_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "DoctorCalendarSlots"("slot_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Doctor"("doctor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EyeMedicalRecord" ADD CONSTRAINT "EyeMedicalRecord_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugPrescription" ADD CONSTRAINT "DrugPrescription_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "EyeMedicalRecord"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drug_rx_id_fkey" FOREIGN KEY ("drug_rx_id") REFERENCES "DrugPrescription"("drug_rx_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "Drug"("drug_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlassesPrescription" ADD CONSTRAINT "GlassesPrescription_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "EyeMedicalRecord"("record_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFile" ADD CONSTRAINT "MedicalFile_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalFile" ADD CONSTRAINT "MedicalFile_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPayment" ADD CONSTRAINT "AppointmentPayment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReview" ADD CONSTRAINT "AppointmentReview_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointment"("appointment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentReview" ADD CONSTRAINT "AppointmentReview_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("patient_id") ON DELETE RESTRICT ON UPDATE CASCADE;
