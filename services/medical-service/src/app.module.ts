import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from './prisma/prisma.module';
import { MedicalModule } from './medical/medical.module';
import { JwtStrategy } from './auth/jwt.strategy';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PassportModule,
        PrismaModule,
        MedicalModule,
    ],
    providers: [JwtStrategy],
})
export class AppModule { }
