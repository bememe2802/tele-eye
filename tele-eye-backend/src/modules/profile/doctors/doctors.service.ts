// src/modules/profile/doctors/doctors.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import {
  AdminUpdateDoctorDto,
  CreateDoctorDto,
  DoctorSelfUpdateDto,
} from './dto/doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  // 1. Admin tạo bác sĩ
  async createDoctor(dto: CreateDoctorDto) {
    // Check 1: Email trùng
    const exist = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (exist) throw new BadRequestException('Email đã tồn tại trong hệ thống');

    // Check 2: Specialization IDs có tồn tại thật không? (FIX BUG P2003)
    if (dto.specializationIds && dto.specializationIds.length > 0) {
      const count = await this.prisma.specialization.count({
        where: { spec_id: { in: dto.specializationIds } },
      });
      if (count !== dto.specializationIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều ID chuyên khoa không tồn tại',
        );
      }
    }

    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(dto.password, salt);

    return await this.prisma.$transaction(async (tx) => {
      // B1: Tạo User
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password_hash: hash,
          role: UserRole.DOCTOR,
          is_email_verified: true,
        },
      });

      // B2: Tạo Doctor Profile
      const doctor = await tx.doctor.create({
        data: {
          user_id: user.user_id,
          full_name: dto.full_name,
          title: dto.title, // Ví dụ: "ThS.BS"
          license_number: dto.license_number,
          consultation_fee: dto.consultation_fee,
          is_verified: true,
        },
      });

      // B3: Link Chuyên khoa
      if (dto.specializationIds && dto.specializationIds.length > 0) {
        await tx.doctorSpecialization.createMany({
          data: dto.specializationIds.map((specId) => ({
            doctor_id: doctor.doctor_id,
            spec_id: specId,
          })),
        });
      }

      return {
        message: 'Tạo bác sĩ thành công',
        doctorId: doctor.doctor_id,
      };
    });
  }

  // 2. Lấy danh sách (Có lọc theo tên và chuyên khoa)
  async findAll(keyword?: string, specId?: number) {
    const whereCondition: any = {};

    // Lọc theo tên bác sĩ (nếu có keyword)
    if (keyword) {
      whereCondition.full_name = { contains: keyword, mode: 'insensitive' }; // insensitive: không phân biệt hoa thường
    }

    // Lọc theo chuyên khoa (nếu user chọn filter)
    if (specId) {
      whereCondition.specializations = {
        some: { spec_id: Number(specId) }, // Tìm bác sĩ có chứa chuyên khoa này
      };
    }

    const doctors = await this.prisma.doctor.findMany({
      where: whereCondition,
      include: {
        specializations: {
          include: { spec: true },
        },
      },
    });

    // Clean data (Làm đẹp dữ liệu trả về cho Frontend)
    return doctors.map((doc) => ({
      doctor_id: doc.doctor_id,
      full_name: doc.full_name,
      title: doc.title,
      avatar_url: doc.avatar_url,
      consultation_fee: doc.consultation_fee,
      // Biến đổi array phức tạp thành array string đơn giản
      specializations: doc.specializations.map((s) => s.spec.name),
      // Hoặc trả về cả object nếu cần ID: s.spec
    }));
  }

  // Bác sĩ tự cập nhật thông tin của mình (Không được phép sửa chuyên khoa, chỉ sửa info cá nhân)
  async selfUpdate(userId: number, dto: DoctorSelfUpdateDto) {
    // Kiểm tra bác sĩ có tồn tại không
    const doctor = await this.prisma.doctor.findUnique({
      where: { user_id: userId },
    });
    if (!doctor) throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ');

    return this.prisma.doctor.update({
      where: { user_id: userId },
      data: dto,
    });
  }

  // Admin cập nhật bất kỳ bác sĩ nào
  async adminUpdate(doctorId: number, dto: AdminUpdateDoctorDto) {
    const { specializationIds, ...data } = dto;

    // 1. Kiểm tra bác sĩ tồn tại
    const doctor = await this.prisma.doctor.findUnique({
      where: { doctor_id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Bác sĩ không tồn tại');

    // 2. Nếu có specializationIds, kiểm tra xem các ID đó có hợp lệ trong DB không
    if (specializationIds && specializationIds.length > 0) {
      const validSpecs = await this.prisma.specialization.findMany({
        where: { spec_id: { in: specializationIds } },
        select: { spec_id: true },
      });
      if (validSpecs.length !== specializationIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều chuyên khoa không hợp lệ',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Cập nhật thông tin cơ bản
      const updatedDoctor = await tx.doctor.update({
        where: { doctor_id: doctorId },
        data: data,
      });

      // Đồng bộ chuyên khoa (Sync logic)
      if (specializationIds) {
        // Xóa các liên kết cũ
        await tx.doctorSpecialization.deleteMany({
          where: { doctor_id: doctorId },
        });

        // Thêm liên kết mới
        await tx.doctorSpecialization.createMany({
          data: specializationIds.map((id) => ({
            doctor_id: doctorId,
            spec_id: id,
          })),
        });
      }

      return updatedDoctor;
    });
  }
}
