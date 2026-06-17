// src/modules/identity/auth/auth.controller.ts
import { Body, Controller, Headers, Ip, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendOtpDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@ApiTags('Auth') // Gom nhóm API trên Swagger
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // Controller
  @Post('login')
  login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const finalUserAgent = userAgent || 'Unknown Device';
    // Đảo lại vị trí tham số cho đúng với Service: (dto, userAgent, ip)
    return this.authService.login(dto, finalUserAgent, ip);
  }
  @Post('verify-email')
  @ApiOperation({ summary: 'Xác thực email bằng mã OTP' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Cấp lại Access Token mới bằng Refresh Token' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Đăng xuất (Thu hồi Refresh Token)' })
  @ApiBearerAuth() // Logout thường cần đăng nhập rồi mới logout được (Optional)
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Gửi lại mã OTP xác thực email' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

}