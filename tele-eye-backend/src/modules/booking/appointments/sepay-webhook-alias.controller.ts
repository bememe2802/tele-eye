import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentService } from './appointments.service';
import { validateSepayAuthorization } from './sepay-webhook.util';

@ApiTags('Booking - Appointments')
@Controller('api/booking/appointments')
export class SepayWebhookAliasController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook/sepay')
  @ApiOperation({
    summary: '[WEBHOOK] Alias để SePay gọi được cả URL có /api prefix',
  })
  async handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    console.log('[SePay Webhook Alias] received', { authorization, body });
    validateSepayAuthorization(this.configService, authorization);
    return this.appointmentService.handleSepayWebhook(body);
  }
}
