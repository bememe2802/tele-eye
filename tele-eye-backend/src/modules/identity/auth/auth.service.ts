// src/modules/identity/auth/auth.service.ts
import { MailerService } from '@nestjs-modules/mailer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateTokens } from 'src/common/helper/generateTokens';
import { PrismaService } from '../../../database/prisma.service';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResendOtpDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) throw new BadRequestException('Email already exists');

    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password_hash: passwordHash,
          role: 'PATIENT',
          is_email_verified: false,
        },
      });

      await tx.patient.create({
        data: {
          user_id: user.user_id,
          full_name: dto.fullName,
        },
      });

      await tx.verificationToken.create({
        data: {
          email: dto.email,
          token: otpCode,
          expires_at: expiresAt,
        },
      });

      return { user, otpCode };
    });

    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'Xác thực tài khoản Tele-Eye',
        html: `<h3>Chào mừng ${dto.fullName},</h3>
               <p>Mã xác thực của bạn là: <b>${transactionResult.otpCode}</b></p>
               <p>Mã có hiệu lực trong 15 phút.</p>`,
      });
    } catch (error) {
      console.error('Lỗi gửi mail:', error);
    }

    return {
      message:
        'Đăng ký thành công. Vui lòng kiểm tra email để nhận mã xác thực.',
      email: dto.email,
      nextStep: 'VERIFY_EMAIL',
    };
  }

  async login(dto: LoginDto, userAgent: string, ip: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new UnauthorizedException('Thông tin đăng nhập không chính xác');

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch)
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');

    // Check is_active SAU khi verify password để không leak trạng thái tài khoản
    if (!user.is_active) {
      throw new UnauthorizedException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.',
      );
    }

    if (!user.is_email_verified) {
      throw new UnauthorizedException(
        'Vui lòng xác thực email trước khi đăng nhập.',
      );
    }

    const tokens = await generateTokens(
      this.jwtService,
      user.user_id,
      user.email,
      user.role,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.userSession.create({
      data: {
        user_id: user.user_id,
        refresh_token: tokens.refreshToken,
        user_agent: userAgent,
        ip_address: ip,
        expires_at: expiresAt,
        is_revoked: false,
      },
    });

    return {
      ...tokens,
      role: user.role,
      message: 'Đăng nhập thành công',
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refreshToken);

      const session = await this.prisma.userSession.findFirst({
        where: {
          refresh_token: dto.refreshToken,
          user_id: payload.sub,
        },
      });

      if (!session) throw new ForbiddenException('Session không tồn tại');

      if (session.is_revoked) {
        throw new ForbiddenException('Session đã bị thu hồi (Revoked)');
      }

      if (session && session.expires_at && session.expires_at < new Date()) {
        throw new ForbiddenException(
          'Session đã hết hạn, vui lòng đăng nhập lại',
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { user_id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('Tài khoản không còn tồn tại. Vui lòng đăng nhập lại.');
      }

      const newTokens = await generateTokens(
        this.jwtService,
        user.user_id,
        user.email,
        user.role,
      );

      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      await this.prisma.userSession.update({
        where: { session_id: session.session_id },
        data: {
          refresh_token: newTokens.refreshToken,
          expires_at: newExpiresAt,
        },
      });

      return newTokens;
    } catch (error) {
      throw new ForbiddenException(
        'Refresh token không hợp lệ hoặc đã hết hạn',
      );
    }
  }

  async logout(dto: RefreshTokenDto) {
    const session = await this.prisma.userSession.findFirst({
      where: {
        refresh_token: dto.refreshToken,
      },
    });

    if (!session) {
      throw new NotFoundException(
        'Refresh token không hợp lệ hoặc không tồn tại.',
      );
    }

    if (session.is_revoked) {
      return { message: 'Tài khoản đã được đăng xuất trước đó.' };
    }

    await this.prisma.userSession.update({
      where: { session_id: session.session_id },
      data: { is_revoked: true },
    });

    return { message: 'Đăng xuất thành công' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const verifyToken = await this.prisma.verificationToken.findFirst({
      where: {
        email: dto.email,
        token: dto.token,
      },
    });

    if (!verifyToken) {
      throw new BadRequestException(
        'Mã xác thực không đúng hoặc đã được sử dụng.',
      );
    }

    if (verifyToken.expires_at < new Date()) {
      await this.prisma.verificationToken.delete({
        where: { id: verifyToken.id },
      });
      throw new BadRequestException(
        'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { email: dto.email },
        data: { is_email_verified: true },
      }),
      this.prisma.verificationToken.delete({
        where: { id: verifyToken.id },
      }),
    ]);

    return {
      message: 'Xác thực email thành công! Bây giờ bạn có thể đăng nhập.',
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      // Trả về message giống nhau để không leak thông tin
      return {
        message: 'Nếu email tồn tại, mã OTP mới đã được gửi. Vui lòng kiểm tra hộp thư.',
      };
    }

    if (user.is_email_verified) {
      throw new BadRequestException('Email này đã được xác thực trước đó.');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.prisma.$transaction([
      this.prisma.verificationToken.deleteMany({ where: { email: dto.email } }),
      this.prisma.verificationToken.create({
        data: { email: dto.email, token: otpCode, expires_at: expiresAt },
      }),
    ]);

    try {
      await this.mailerService.sendMail({
        to: dto.email,
        subject: 'Mã xác thực mới - Tele-Eye',
        html: `<h3>Xin chào,</h3>
               <p>Mã xác thực mới của bạn là: <b>${otpCode}</b></p>
               <p>Mã có hiệu lực trong 15 phút. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>`,
      });
    } catch (error) {
      console.error('Lỗi gửi mail OTP:', error);
    }

    return {
      message: 'Nếu email tồn tại, mã OTP mới đã được gửi. Vui lòng kiểm tra hộp thư.',
    };
  }

}