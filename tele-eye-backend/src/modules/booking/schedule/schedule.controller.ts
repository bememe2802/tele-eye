import {
  Body,
  Controller,
  Delete,
  Get,
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
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CreateAvailabilityDto } from './dto/doctor-availability.dto';
import { CreateSystemSlotDto, GetSlotsQueryDto } from './dto/system-slot.dto';
import { ScheduleService } from './schedule.service';

@ApiTags('Booking - Schedule')
@Controller('booking/schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('system-slots')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Tạo khung giờ mẫu cho hệ thống' })
  createSystemSlot(@Body() dto: CreateSystemSlotDto) {
    return this.scheduleService.createSystemSlot(dto);
  }

  @Get('system-slots')
  @ApiOperation({ summary: 'Lấy danh sách khung giờ mẫu' })
  getSystemSlots() {
    return this.scheduleService.getSystemSlots();
  }

  @Post('doctor-availability')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Đăng ký lịch làm việc hàng tuần' })
  registerAvailability(@Req() req: any, @Body() dto: CreateAvailabilityDto) {
    return this.scheduleService.registerAvailability(req.user.userId, dto);
  }

  @Get('doctor-availability/me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Xem danh sách lịch đã đăng ký của tôi' })
  getMyAvailability(@Req() req: any) {
    return this.scheduleService.getMyAvailability(req.user.userId);
  }

  @Delete('doctor-availability/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: '[DOCTOR] Xóa một khung giờ làm việc đã đăng ký' })
  deleteAvailability(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.scheduleService.deleteAvailability(req.user.userId, id);
  }

  @Get('calendar-slots')
  @ApiOperation({
    summary: '[PUBLIC] Bệnh nhân tìm kiếm lịch khám trống',
    description:
      'Lọc danh sách slot theo ngày, bác sĩ hoặc chuyên khoa (Many-to-Many)',
  })
  async getAvailableSlots(@Query() query: GetSlotsQueryDto) {
    return this.scheduleService.getAvailableSlots(query);
  }

  @Patch('calendar-slots/:id/lock')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: '[PATIENT] Giữ chỗ tạm thời một khung giờ khám',
    description:
      'Chuyển trạng thái sang LOCKED trong 15 phút. Chỉ dành cho Bệnh nhân.',
  })
  async lockSlot(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.scheduleService.lockCalendarSlot(id, req.user.userId);
  }

  // FIX: Endpoint để generate slots ngay lập tức sau khi bác sĩ lưu lịch,
  // không cần chờ cron chạy lúc 0 giờ
  @Post('generate-slots')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({
    summary: '[DOCTOR] Sinh lịch khám thực tế cho 14 ngày tới',
    description: 'Gọi ngay sau khi đăng ký lịch để bệnh nhân thấy slot ngay.',
  })
  async generateSlots() {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + 14);
    return this.scheduleService.generateSlots(startDate, endDate);
  }
}
