import { IsEmail, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDoctorDto {
    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    full_name: string;

    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    license_number?: string;

    @IsNumber()
    @Min(0)
    consultation_fee: number;
}