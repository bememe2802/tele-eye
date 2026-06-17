import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly jwtSecret: string;

    constructor(private readonly configService: ConfigService) {
        this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'tele-eye-jwt-secret-key');
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            request.user = decoded;
            return true;
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }
}