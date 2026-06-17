// src/modules/medical/controllers/drug.controller.ts
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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { DrugService } from './drugs.service';
import { CreateDrugDto, UpdateDrugDto } from './dto/drug.dto';

@ApiTags('Medical - Master Data (Drugs)')
@Controller()
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  // ==========================================
  // NHÓM API CHO ADMIN
  // ==========================================

  @Post('admin/drugs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Thêm một loại thuốc mới vào danh mục' })
  createDrug(@Body() dto: CreateDrugDto) {
    return this.drugService.create(dto);
  }

  @Patch('admin/drugs/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Cập nhật thông tin thuốc' })
  updateDrug(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDrugDto,
  ) {
    return this.drugService.update(id, dto);
  }

  @Delete('admin/drugs/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: '[ADMIN] Ngừng kinh doanh một loại thuốc (Soft Delete)',
  })
  removeDrug(@Param('id', ParseIntPipe) id: number) {
    return this.drugService.remove(id);
  }

  // ==========================================
  // NHÓM API SỬ DỤNG CHUNG (DOCTOR/ADMIN)
  // ==========================================

  @Get('drugs')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: '[SHARED] Lấy danh sách thuốc đang hoạt động' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Tìm theo tên hoặc hoạt chất',
  })
  findAllDrugs(@Query('search') search?: string) {
    return this.drugService.findAll(search);
  }
}
