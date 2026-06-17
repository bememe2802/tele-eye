// ============ AUTH ============
export interface User {
  userId: number;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'STAFF';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role: string;
}

// ============ DOCTOR ============
export interface Doctor {
  doctor_id: number;
  user_id: number;
  full_name: string;
  title?: string;
  license_number?: string;
  phone_number?: string;
  bio?: string;
  experience_years?: number;
  avatar_url?: string;
  is_verified: boolean;
  consultation_fee: number;
  specializations: string[];
}

// ============ PATIENT ============
export interface Patient {
  patient_id: number;
  user_id: number;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  date_of_birth?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  address?: string;
  user: { email: string; is_active: boolean };
}

// ============ SLOT / SCHEDULE ============
export interface SystemTimeSlot {
  slot_template_id: number;
  shift_name: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface CalendarSlot {
  slot_id: number;
  date_slot: string;
  start_time: string;
  end_time: string;
  price: number;
  is_locked: boolean;
  doctor: {
    doctor_id: number;
    full_name: string;
    title?: string;
    avatar_url?: string;
    specialties: string[];
  };
}

// ============ APPOINTMENT ============
export type AppointmentStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'IN_PROGRESS';

export interface Appointment {
  appointment_id: number;
  slot_id: number;
  patient_id: number;
  doctor_id: number;
  status: AppointmentStatus;
  meeting_link?: string;
  cancel_reason?: string;
  created_at: string;
  actual_start_at?: string;
  actual_end_at?: string;
  slot: { start_time: string; end_time: string; date_slot?: string };
  patient: Patient;
  doctor: Doctor;
  medical_record?: MedicalRecord;
  files?: MedicalFile[];
}

// ============ MEDICAL ============
export interface MedicalRecord {
  record_id: number;
  appointment_id: number;
  chief_complaint?: string;
  diagnosis_od?: string;
  diagnosis_os?: string;
  icd_10_code?: string;
  management_plan?: string;
  doctor_notes?: string;
  drug_prescription?: DrugPrescription;
  glasses_prescription?: GlassesPrescription;
}

export interface Drug {
  drug_id: number;
  name: string;
  active_ingredient?: string;
  unit?: string;
  usage_instruction?: string;
  is_active: boolean;
}

export interface DrugPrescription {
  drug_rx_id: number;
  items: PrescriptionItem[];
}

export interface PrescriptionItem {
  item_id: number;
  drug_id: number;
  quantity: number;
  dosage?: string;
  note?: string;
  drug: Drug;
}

export interface GlassesPrescription {
  prescription_id: number;
  od_sphere?: number;
  od_cylinder?: number;
  od_axis?: number;
  od_pd?: number;
  os_sphere?: number;
  os_cylinder?: number;
  os_axis?: number;
  os_pd?: number;
  notes?: string;
}

export interface MedicalFile {
  file_id: number;
  file_url: string;
  file_type: 'EYE_IMAGE' | 'OLD_PRESCRIPTION' | 'LAB_REPORT' | 'OTHER';
}

// ============ SPECIALIZATION ============
export interface Specialization {
  spec_id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

// ============ TRANSACTION ============
export interface Transaction {
  transaction_id: number;
  user_id: number;
  amount: number;
  type: 'PAYMENT' | 'REFUND' | 'WITHDRAW' | 'TOP_UP';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payment_method?: string;
  description?: string;
  created_at: string;
}
