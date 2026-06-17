import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RecordsService } from './records.service';

@ApiTags('Medical - Records')
@Controller('records')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Get()
  @ApiOperation({ summary: '[SHARED] Danh sách hồ sơ bệnh án của tôi / tất cả (Admin)' })
  findAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.recordsService.findAll(req.user.userId, req.user.role, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '[SHARED] Chi tiết hồ sơ bệnh án' })
  findById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.recordsService.findById(req.user.userId, req.user.role, id);
  }
}
