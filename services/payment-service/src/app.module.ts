import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { PaymentsModule } from './payments/payments.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        PrismaModule,
        PaymentsModule,
    ],
    providers: [JwtStrategy],
})
export class AppModule { }
