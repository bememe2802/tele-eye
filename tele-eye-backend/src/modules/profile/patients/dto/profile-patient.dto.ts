import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class UpdatePatientDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ example: '0987654321' })
  @IsPhoneNumber('VN') // Validate số điện thoại VN
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ example: 'MALE', enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiProperty({ example: '1995-10-20' })
  @IsDateString() // Validate format YYYY-MM-DD
  @IsOptional()
  date_of_birth?: string;

  @ApiProperty({ example: '123 Đường Lê Lợi, TP.HCM' })
  @IsString()
  @IsOptional()
  address?: string;

  // Avatar tạm thời để string url, sau này làm upload ảnh sau
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}
