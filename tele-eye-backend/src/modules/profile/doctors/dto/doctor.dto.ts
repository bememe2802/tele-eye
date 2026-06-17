import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDoctorDto {
  // --- Phần Tài khoản ---
  @ApiProperty({ example: 'doctor.strange@hospital.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  // --- Phần Hồ sơ ---
  @ApiProperty({ example: 'Dr. Stephen Strange' })
  @IsNotEmpty()
  full_name: string;

  @ApiProperty({ example: 'ThS.BS Nhãn khoa' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'CCHN-123456' }) // Chứng chỉ hành nghề
  @IsString()
  license_number: string;

  @ApiProperty({ example: 500000 })
  @IsNumber()
  consultation_fee: number;

  @ApiProperty({ example: [1, 2], description: 'Danh sách ID chuyên khoa' })
  @IsArray()
  @IsOptional()
  specializationIds?: number[]; // Mảng ID các chuyên khoa (vd: 1=Giác mạc, 2=Đáy mắt)
}

// 1. DTO cho Bác sĩ tự cập nhật
export class DoctorSelfUpdateDto {
  @ApiProperty({ required: false, example: '0901234567' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ required: false, example: 10 })
  @IsNumber()
  @Min(0) // Không được là số âm
  @IsOptional()
  experience_years?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  avatar_url?: string;
}

// 2. DTO cho Admin cập nhật (Admin có thể sửa mọi thứ của Bác sĩ)
export class AdminUpdateDoctorDto extends DoctorSelfUpdateDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  full_name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  license_number?: string;

  @ApiProperty({ required: false, example: 500000 })
  @IsNumber()
  @Min(0) // Phí khám không thể âm
  @IsOptional()
  consultation_fee?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  is_verified?: boolean;

  @ApiProperty({ required: false, type: [Number] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Bác sĩ phải thuộc ít nhất một chuyên khoa' }) // Ràng buộc chuyên khoa
  @IsOptional()
  specializationIds?: number[];
}
