import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    full_name?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

    @IsOptional()
    @IsString()
    avatar_url?: string;

    @IsOptional()
    @IsDateString()
    date_of_birth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    emergency_contact?: string;
}
