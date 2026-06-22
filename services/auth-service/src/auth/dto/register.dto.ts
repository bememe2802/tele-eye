import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum UserRole {
    PATIENT = 'PATIENT',
    DOCTOR = 'DOCTOR',
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
}

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    fullName?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
