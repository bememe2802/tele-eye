import { IsInt, IsDateString, IsString, IsOptional } from 'class-validator';

export class CreateAppointmentDto {
    @IsOptional()
    @IsInt()
    slot_id?: number;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsInt()
    patient_id?: number;

    @IsOptional()
    @IsInt()
    doctor_id?: number;

    @IsOptional()
    @IsDateString()
    schedule_date?: string;

    @IsOptional()
    @IsString()
    start_time?: string;

    @IsOptional()
    @IsString()
    end_time?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}
