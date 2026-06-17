import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AppointmentService } from './appointments.service';
import { validateSepayAuthorization } from './sepay-webhook.util';
import {
  CompleteAppointmentDto,
  CreateAppointmentDto,
} from './dto/appointment.dto';

@ApiTags('Booking - Appointments')
@Controller('booking/appointments')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[PATIENT] Xác nhận đặt hẹn' })
  async create(
    @Req() req: any,
    @Body() dto: CreateAppointmentDto,
    @Ip() ip: string,
  ) {
    const userId = Number(req.user.userId);
    return this.appointmentService.createAppointment(userId, dto, ip);
  }

  // Webhook nhận từ SePay khi có giao dịch mới
  @Post('webhook/sepay')
  @ApiOperation({ summary: '[WEBHOOK] SePay gọi khi có tiền vào tài khoản' })
  async handleSepayWebhook(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: any,
  ) {
    console.log('[SePay Webhook] received', { authorization, body });
    validateSepayAuthorization(this.configService, authorization);
    return this.appointmentService.handleSepayWebhook(body);
  }

  // Bệnh nhân polling để biết đã thanh toán chưa
  @Get(':id/payment-status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[PATIENT] Kiểm tra trạng thái thanh toán' })
  async getPaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.appointmentService.getPaymentStatus(id, req.user.userId);
  }

  @Get('doctor/today')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Xem danh sách lịch khám hôm nay' })
  async getTodayAppointments(@Req() req: any) {
    return this.appointmentService.getDoctorAppointmentsToday(req.user.userId);
  }

  @Get('patient/my')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[PATIENT] Xem danh sách lịch hẹn của tôi' })
  async getMyAppointments(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.appointmentService.getPatientAppointments(
      req.user.userId,
      Math.max(1, +page),
      Math.min(50, Math.max(1, +limit)),
    );
  }

  @Patch(':id/start')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Bắt đầu ca khám' })
  async startAppointment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentService.startAppointment(req.user.userId, id);
  }

  @Patch(':id/complete')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Kết thúc ca khám và gửi mail bệnh án' })
  async completeAppointment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteAppointmentDto,
  ) {
    return this.appointmentService.completeAppointment(
      req.user.userId,
      id,
      dto,
    );
  }

  @Get(':id/medical-record')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: '[SHARED] Xem hồ sơ bệnh án' })
  async getMedicalRecord(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentService.getMedicalRecordDetail(
      req.user.userId,
      req.user.role,
      id,
    );
  }

  @Delete(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: '[PATIENT] Hủy lịch hẹn' })
  async cancelAppointment(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentService.cancelAppointment(req.user.userId, id);
  }

}