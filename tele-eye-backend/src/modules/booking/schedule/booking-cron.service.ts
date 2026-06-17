import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduleService } from './schedule.service'; // Giả sử service này chứa logic xử lý DB

@Injectable()
export class BookingCronService {
  private readonly logger = new Logger(BookingCronService.name);

  constructor(private readonly scheduleService: ScheduleService) {}

  // 1. Tự động chạy vào 0 giờ mỗi ngày để sinh lịch mới
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySlotGeneration() {
    this.logger.log('Bắt đầu tiến trình sinh lịch tự động...');
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 14);
      const result = await this.scheduleService.generateSlots(
        startDate,
        endDate,
      );
      this.logger.log(`Kết quả: ${result.message}`);
    } catch (error) {
      this.logger.error('Lỗi khi chạy Cron sinh lịch:', error);
    }
  }

  // 2. Tự động quét mở khóa Slot hết hạn (Mới thêm)
  // Chạy mỗi phút để đảm bảo trải nghiệm người dùng không bị chờ lâu
  @Cron(CronExpression.EVERY_MINUTE)
  async handleUnlockExpiredSlots() {
    try {
      const count = await this.scheduleService.unlockExpiredSlots();
      if (count > 0) {
        this.logger.log(
          `[Cron] Đã giải phóng ${count} slot hết hạn và xóa ID người giữ chỗ.`,
        );
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy Cron mở khóa:', error);
    }
  }
  // 3. Tự động hủy Appointment quá hạn thanh toán (Mới thêm)
  @Cron(CronExpression.EVERY_5_MINUTES) // Quét mỗi 5 phút là vừa đẹp
  async handleCancelExpiredAppointments() {
    try {
      // Gọi sang service để xử lý logic DB
      const count = await this.scheduleService.cancelExpiredAppointments();
      if (count > 0) {
        this.logger.warn(
          `[Cron] Đã hủy ${count} lịch hẹn quá hạn thanh toán (hệ thống tự động).`,
        );
      }
    } catch (error) {
      this.logger.error('Lỗi khi chạy Cron hủy lịch hẹn:', error);
    }
  }
}
