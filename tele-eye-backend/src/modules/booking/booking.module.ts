import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { AppointmentController } from './appointments/appointments.controller';
import { AppointmentService } from './appointments/appointments.service';
import { SepayWebhookAliasController } from './appointments/sepay-webhook-alias.controller';
import { BookingCronService } from './schedule/booking-cron.service';
import { ScheduleController } from './schedule/schedule.controller';
import { ScheduleService } from './schedule/schedule.service';

@Module({
  imports: [ConfigModule],
  controllers: [
    ScheduleController,
    AppointmentController,
    SepayWebhookAliasController,
  ],
  providers: [
    ScheduleService,
    AppointmentService,
    BookingCronService,
    MailService,
  ],
})
export class BookingModule {}
