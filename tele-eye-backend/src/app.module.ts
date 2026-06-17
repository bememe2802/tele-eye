import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Thêm import này
import { ScheduleModule } from '@nestjs/schedule';
import { BookingModule } from './modules/booking/booking.module';
import { IdentityModule } from './modules/identity/identity.module';
import { MedicalModule } from './modules/medical/medical.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    IdentityModule,
    ProfileModule,
    BookingModule,
    MedicalModule,
    PaymentModule,
    NotificationModule,
  ],
})
export class AppModule {}
