import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDrugDto {
  @ApiProperty({ example: 'V.Rohto Vitamin' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Vitamin B6, Vitamin E' })
  @IsOptional()
  @IsString()
  active_ingredient?: string;

  @ApiPropertyOptional({ example: 'Lọ' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 'Nhỏ 2-3 giọt/lần, 5-6 lần/ngày' })
  @IsOptional()
  @IsString()
  usage_instruction?: string;
}

export class UpdateDrugDto extends PartialType(CreateDrugDto) {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
