import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateMedicalRecordDto {
    @IsInt()
    patient_id: number;

    @IsInt()
    doctor_id: number;

    @IsOptional()
    @IsInt()
    appointment_id?: number;

    @IsOptional()
    @IsString()
    diagnosis?: string;

    @IsOptional()
    @IsString()
    prescription?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}