// src/modules/profile/patients/patients.controller.ts
import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport'; // Guard chuẩn của NestJS
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard'; // Guard bạn tự viết
import { UpdatePatientDto } from './dto/profile-patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Profile - Patients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard) // Bảo vệ toàn bộ Controller này
@Controller('profile/patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('me')
  @Roles(UserRole.PATIENT) // Chỉ Patient mới gọi được
  @ApiOperation({ summary: 'Xem hồ sơ cá nhân của Bệnh nhân' })
  getProfile(@Req() req: any) {
    return this.patientsService.getMyProfile(req.user.userId);
  }

  @Patch('me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  updateProfile(@Req() req: any, @Body() dto: UpdatePatientDto) {
    return this.patientsService.updateMyProfile(req.user.userId, dto);
  }
}
