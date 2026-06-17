import { IsInt, IsDateString, IsString, IsOptional, IsIn } from 'class-validator';

export class CreateAppointmentDto {
    @IsInt()
    patient_id: number;

    @IsInt()
    doctor_id: number;

    @IsDateString()
    schedule_date: string;

    @IsString()
    start_time: string;

    @IsString()
    end_time: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}