import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Quan trọng: Đánh dấu Global để dùng Prisma ở mọi nơi không cần import lại DatabaseModule nhiều lần
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Phải export thì module khác mới dùng được
})
export class DatabaseModule {}
