import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UsersService } from './users.service';

@ApiTags('Admin - Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '[ADMIN] Danh sách tất cả tài khoản' })
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: string,
  ) {
    return this.usersService.findAll(+page, +limit, role);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ADMIN] Chi tiết một tài khoản' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: '[ADMIN] Mở khóa tài khoản' })
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id, true);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: '[ADMIN] Khóa tài khoản' })
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleActive(id, false);
  }
}
