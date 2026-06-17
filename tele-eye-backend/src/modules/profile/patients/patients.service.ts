// src/modules/profile/patients/patients.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client'; // Import để bắt lỗi Prisma
import { PrismaService } from '../../../database/prisma.service';
import { UpdatePatientDto } from './dto/profile-patient.dto';
@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async getMyProfile(userId: number) {
    const patient = await this.prisma.patient.findUnique({
      where: { user_id: userId },
      include: {
        user: {
          select: { email: true, is_active: true },
        },
      },
    });

    // Nếu chưa có hồ sơ Patient, có thể trả về null hoặc object rỗng tuỳ logic Frontend
    if (!patient)
      throw new NotFoundException('Hồ sơ bệnh nhân chưa được khởi tạo');
    return patient;
  }

  async updateMyProfile(userId: number, dto: UpdatePatientDto) {
    try {
      // Dùng UPSERT: Nếu có rồi thì Update, chưa có thì Create luôn (Tự chữa lỗi thiếu data)
      return await this.prisma.patient.upsert({
        where: { user_id: userId },
        update: {
          full_name: dto.full_name,
          phone_number: dto.phone_number,
          gender: dto.gender,
          address: dto.address,
          avatar_url: dto.avatar_url,
          // Kiểm tra date hợp lệ trước khi convert
          date_of_birth: dto.date_of_birth
            ? new Date(dto.date_of_birth)
            : undefined,
        },
        create: {
          user_id: userId, // Link với user
          full_name: dto.full_name || '', // Giá trị mặc định nếu tạo mới
          phone_number: dto.phone_number || '',
          gender: dto.gender, // Enum hoặc string
          // Các trường khác tuỳ DB của bạn có required không
        },
      });
    } catch (error) {
      // Bắt lỗi trùng số điện thoại (Unique constraint failed)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Số điện thoại này đã được sử dụng bởi người khác',
          );
        }
      }
      throw error; // Ném tiếp các lỗi khác (ví dụ sai format ngày tháng)
    }
  }
}
