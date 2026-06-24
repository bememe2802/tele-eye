import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface JwtPayload {
    sub: number;
    email: string;
    role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'tele-eye-jwt-secret-key'),
        });
    }

    async validate(payload: JwtPayload) {
        // Verify user exists by calling auth service
        const authUrl = this.configService.get<string>('AUTH_SERVICE_URL', 'http://auth-service:8081');
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${authUrl}/users/${payload.sub}`, {
                    headers: { Authorization: `Bearer ${payload}` },
                }),
            );
            const user = response.data;
            if (!user || !user.is_active) {
                throw new UnauthorizedException('User not found or inactive');
            }
            return {
                id: user.user_id,
                email: user.email,
                role: user.role,
            };
        } catch {
            // If auth service is unreachable, still trust the JWT payload
            return {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
            };
        }
    }
}