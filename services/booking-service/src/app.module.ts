import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { BookingsModule } from './bookings/bookings.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        PrismaModule,
        BookingsModule,
    ],
    providers: [JwtStrategy],
})
export class AppModule { }
