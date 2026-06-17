import {
    Injectable,
    UnauthorizedException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
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
                role: dto.role || 'PATIENT',
            },
        });

        const tokens = await this.generateTokens(user.user_id, user.email, user.role);

        return {
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
            },
            ...tokens,
        };
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