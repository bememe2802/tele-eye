import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20, role?: string) {
    const where = role ? { role: role as any } : {};
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          user_id: true,
          email: true,
          role: true,
          is_active: true,
          is_email_verified: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        email: true,
        role: true,
        is_active: true,
        is_email_verified: true,
        created_at: true,
        sessions: { select: { created_at: true, ip_address: true, is_revoked: true } },
      },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    return user;
  }

  async toggleActive(userId: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { user_id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản');
    if (user.role === 'ADMIN') throw new BadRequestException('Không thể khóa tài khoản Admin');

    return this.prisma.user.update({
      where: { user_id: userId },
      data: { is_active: isActive },
      select: { user_id: true, email: true, is_active: true },
    });
  }
}
