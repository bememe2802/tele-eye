import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
    imports: [
        HttpModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('JWT_SECRET', 'tele-eye-jwt-secret-key'),
                signOptions: {
                    expiresIn: config.get<string>('JWT_EXPIRATION', '15m') as any,
                },
            }),
        }),
    ],
    controllers: [UsersController],
    providers: [UsersService, JwtStrategy],
    exports: [UsersService],
})
export class UsersModule { }
