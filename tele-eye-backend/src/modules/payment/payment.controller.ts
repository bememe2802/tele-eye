import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentService } from './payment.service';

@ApiTags('Admin - Payment')
@Controller('payment')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('revenue')
  @ApiOperation({ summary: '[ADMIN] Tổng doanh thu và thống kê giao dịch' })
  getRevenueSummary() {
    return this.paymentService.getRevenueSummary();
  }

  @Get('transactions')
  @ApiOperation({ summary: '[ADMIN] Danh sách giao dịch' })
  getTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.paymentService.getTransactions(+page, +limit, status);
  }
}
