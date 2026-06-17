// src/modules/identity/auth/dto/auth.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  MinLength,
} from 'class-validator';

// src/modules/identity/auth/dto/auth.dto.ts

export class RegisterDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @IsNotEmpty() // Nên bắt buộc nhập tên khi đăng ký bệnh nhân
  fullName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty()
  password: string;
}

export class VerifyEmailDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Mã xác thực phải đúng 6 ký tự' })
  token: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token hiện tại của user' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: 'patient@example.com' })
  @IsEmail()
  email: string;
}
