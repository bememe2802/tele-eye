import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateSystemSlotDto {
  @ApiProperty({ example: 'Ca sáng 1' })
  @IsString()
  @IsNotEmpty()
  slot_name: string;

  @ApiProperty({ example: '08:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Định dạng giờ phải là HH:mm',
  })
  start_time: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Định dạng giờ phải là HH:mm',
  })
  end_time: string;
}

export class GetSlotsQueryDto {
  @ApiPropertyOptional({
    description: 'Ngày khám (YYYY-MM-DD)',
    example: '2026-03-05',
  })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ description: 'ID của Bác sĩ', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  doctorId?: number;

  @ApiPropertyOptional({ description: 'ID của Chuyên khoa', example: 2 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  specialtyId?: number;
}
