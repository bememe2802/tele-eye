import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateDrugDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    active_ingredient?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsString()
    usage_instruction?: string;
}

export class UpdateDrugDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    active_ingredient?: string;

    @IsOptional()
    @IsString()
    unit?: string;

    @IsOptional()
    @IsString()
    usage_instruction?: string;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
