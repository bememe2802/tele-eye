import { IsOptional, IsString, IsDateString, IsIn } from 'class-validator';

export class UpdateAppointmentDto {
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
    @IsIn(['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    status?: string;

    @IsOptional()
    @IsString()
    reason?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}