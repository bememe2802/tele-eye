import { IsInt, IsString, IsDateString, IsOptional, IsObject } from 'class-validator';

export class CreateTestResultDto {
    @IsInt()
    patient_id: number;

    @IsInt()
    doctor_id: number;

    @IsString()
    test_type: string;

    @IsDateString()
    test_date: string;

    @IsOptional()
    @IsObject()
    result_data?: Record<string, any>;

    @IsOptional()
    @IsString()
    file_url?: string;

    @IsOptional()
    @IsString()
    notes?: string;
}