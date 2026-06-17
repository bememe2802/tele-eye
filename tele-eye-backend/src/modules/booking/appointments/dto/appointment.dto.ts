import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  slot_id: number;

  @ApiProperty({ example: 'Mắt trái bị đỏ và ngứa sau khi đi bơi' })
  @IsString()
  @IsNotEmpty()
  description: string; // Triệu chứng/Lý do khám

  @ApiPropertyOptional({
    example: ['https://storage.com/eye-1.jpg'],
    description: 'Danh sách URL ảnh tình trạng mắt',
  })
  @IsOptional()
  @IsArray()
  @IsUrl({ require_tld: true }, { each: true, message: 'Mỗi file phải là URL hợp lệ' })
  medical_files?: string[];
}

export class PrescriptionItemDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'ID của thuốc trong danh mục',
  })
  @IsNumber()
  drug_id: number;

  @ApiPropertyOptional({ example: 2, description: 'Số lượng' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Nhỏ 1 giọt/lần, 3 lần/ngày' })
  @IsOptional()
  @IsString()
  dosage?: string;

  @ApiPropertyOptional({ example: 'Lắc đều trước khi dùng' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class GlassesPrescriptionDto {
  @ApiPropertyOptional({ example: -1.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  od_sphere?: number;

  @ApiPropertyOptional({ example: -0.5 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  od_cylinder?: number;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  od_axis?: number;

  @ApiPropertyOptional({ example: 32.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  od_pd?: number;

  @ApiPropertyOptional({ example: -1.25 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  os_sphere?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  os_cylinder?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  os_axis?: number;

  @ApiPropertyOptional({ example: 32.0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  os_pd?: number;

  @ApiPropertyOptional({ example: 'Cắt kính chống phản quang' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CompleteAppointmentDto {
  @ApiPropertyOptional({ example: 'Viêm kết mạc' })
  @IsOptional()
  @IsString()
  diagnosis_od?: string;

  @ApiPropertyOptional({ example: 'Bình thường' })
  @IsOptional()
  @IsString()
  diagnosis_os?: string;

  @ApiPropertyOptional({ example: 'H10.9' })
  @IsOptional()
  @IsString()
  icd_10_code?: string;

  @ApiPropertyOptional({ example: 'Nhỏ thuốc theo đơn' })
  @IsOptional()
  @IsString()
  management_plan?: string;

  @ApiPropertyOptional({ example: 'Bệnh nhân hay dụi mắt' })
  @IsOptional()
  @IsString()
  doctor_notes?: string;

  @ApiPropertyOptional({ type: () => GlassesPrescriptionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GlassesPrescriptionDto)
  glasses_prescription?: GlassesPrescriptionDto;

  @ApiPropertyOptional({ type: () => [PrescriptionItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  drug_prescription?: PrescriptionItemDto[];
}
