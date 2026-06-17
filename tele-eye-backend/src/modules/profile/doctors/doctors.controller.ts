// src/modules/profile/doctors/doctors.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
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
import { DoctorsService } from './doctors.service';
import {
  AdminUpdateDoctorDto,
  CreateDoctorDto,
  DoctorSelfUpdateDto,
} from './dto/doctor.dto';

@ApiTags('Profile - Doctors')
@Controller('profile/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN) // <--- CHỈ ADMIN MỚI ĐƯỢC TẠO BÁC SĨ
  @ApiOperation({ summary: '[ADMIN] Tạo tài khoản & hồ sơ Bác sĩ mới' })
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.createDoctor(dto);
  }

  @Get()
  @ApiOperation({ summary: '[PUBLIC] Xem danh sách bác sĩ' })
  findAll(
    @Query('keyword') keyword?: string,
    @Query('specId') specId?: string,
  ) {
    return this.doctorsService.findAll(keyword, specId ? +specId : undefined);
  }

  // Dành cho chính Bác sĩ
  @Patch('me')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.DOCTOR)
  @ApiOperation({ summary: 'Bác sĩ tự cập nhật profile của mình' })
  updateMe(@Req() req: any, @Body() dto: DoctorSelfUpdateDto) {
    return this.doctorsService.selfUpdate(req.user.userId, dto);
  }

  // Dành cho Admin quản lý
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Cập nhật profile bác sĩ bất kỳ' })
  updateByAdmin(@Param('id') id: string, @Body() dto: AdminUpdateDoctorDto) {
    return this.doctorsService.adminUpdate(+id, dto);
  }
}
