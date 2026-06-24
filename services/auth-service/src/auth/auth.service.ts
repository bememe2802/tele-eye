import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    Inject,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject('RABBITMQ_SERVICE') private readonly rabbitClient: ClientProxy,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                password_hash: passwordHash,
                full_name: dto.fullName,
                role: dto.role || 'PATIENT',
            },
        });

        // TODO: Uncomment when email verification is needed
        // // Generate email verification token
        // const verificationToken = crypto.randomBytes(32).toString('hex');
        // await this.prisma.verificationToken.create({
        //     data: {
        //         email: user.email,
        //         token: verificationToken,
        //         expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        //     },
        // });
        //
        // // Publish email verification event to RabbitMQ
        // try {
        //     this.rabbitClient.emit('email.send', {
        //         type: 'VERIFY_EMAIL',
        //         email: user.email,
        //         token: verificationToken,
        //         fullName: user.full_name,
        //     });
        // } catch (err: any) {
        //     // Don't fail registration if RabbitMQ is unavailable
        //     console.warn('⚠️ Failed to publish email event to RabbitMQ:', err.message);
        // }

        const tokens = await this.generateTokens(user.user_id, user.email, user.role);

        return {
            user: {
                id: user.user_id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
            },
            ...tokens,
        };
    }

    async verifyEmail(token: string) {
        const verification = await this.prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verification) {
            throw new BadRequestException('Invalid verification token');
        }

        if (verification.expires_at < new Date()) {
            throw new BadRequestException('Verification token has expired');
        }

        await this.prisma.user.update({
            where: { email: verification.email },
            data: { is_email_verified: true },
        });

        await this.prisma.verificationToken.delete({
            where: { id: verification.id },
        });

        return { message: 'Email verified successfully' };
    }

    async verifyEmailFromApp(email: string, token: string) {
        if (!email || !token) {
            throw new BadRequestException('Email and token are required');
        }

        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            throw new BadRequestException('User not found');
        }

        const verification = await this.prisma.verificationToken.findFirst({
            where: { email },
        });

        if (!verification) {
            await this.prisma.user.update({
                where: { email },
                data: { is_email_verified: true },
            });

            return { message: 'Email verified successfully' };
        }

        if (verification.token !== token) {
            throw new BadRequestException('Invalid verification token');
        }

        return this.verifyEmail(token);
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.is_active) {
            throw new UnauthorizedException('Account is deactivated');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const tokens = await this.generateTokens(user.user_id, user.email, user.role);

        // Store session
        await this.prisma.userSession.create({
            data: {
                user_id: user.user_id,
                refresh_token: tokens.refreshToken,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        return {
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
            },
            ...tokens,
        };
    }

    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'tele-eye-refresh-secret'),
            });

            const session = await this.prisma.userSession.findFirst({
                where: {
                    refresh_token: refreshToken,
                    is_revoked: false,
                },
            });

            if (!session) {
                throw new UnauthorizedException('Invalid refresh token');
            }

            const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);

            await this.prisma.userSession.update({
                where: { session_id: session.session_id },
                data: { refresh_token: tokens.refreshToken },
            });

            return tokens;
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async logout(userId: number) {
        await this.prisma.userSession.updateMany({
            where: { user_id: userId, is_revoked: false },
            data: { is_revoked: true },
        });
    }

    async validateUser(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { user_id: userId },
        });

        if (!user || !user.is_active) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return {
            id: user.user_id,
            email: user.email,
            role: user.role,
        };
    }

    private async generateTokens(userId: number, email: string, role: string) {
        const payload = { sub: userId, email, role };

        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'tele-eye-refresh-secret'),
            expiresIn: '7d',
        });

        return { accessToken, refreshToken };
    }
}
