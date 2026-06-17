import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, Max, Min } from 'class-validator';

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 0,
}

export class CreateAvailabilityDto {
  @ApiProperty({
    example: [1, 3, 5],
    description: 'Mảng các thứ trong tuần (0-6)',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days_of_week: number[]; // Chuyển từ day_of_week thành mảng days_of_week

  @ApiProperty({
    example: [1, 2],
    description: 'Mảng ID của các SystemTimeSlot',
  })
  @IsArray()
  @IsInt({ each: true })
  system_slot_ids: number[];
}
