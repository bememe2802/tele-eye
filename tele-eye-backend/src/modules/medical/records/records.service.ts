import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RecordsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, userRole: string, page = 1, limit = 20) {
    const where: any = {};

    if (userRole === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({ where: { user_id: userId } });
      if (!patient) throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân');
      where.appointment = { patient_id: patient.patient_id };
    } else if (userRole === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({ where: { user_id: userId } });
      if (!doctor) throw new NotFoundException('Không tìm thấy hồ sơ bác sĩ');
      where.appointment = { doctor_id: doctor.doctor_id };
    }
    // ADMIN xem tất cả

    const [records, total] = await Promise.all([
      this.prisma.eyeMedicalRecord.findMany({
        where,
        include: {
          appointment: {
            select: {
              appointment_id: true,
              status: true,
              created_at: true,
              patient: { select: { full_name: true } },
              doctor: { select: { full_name: true, title: true } },
            },
          },
        },
        orderBy: { appointment: { created_at: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eyeMedicalRecord.count({ where }),
    ]);

    return { data: records, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(userId: number, userRole: string, recordId: number) {
    const record = await this.prisma.eyeMedicalRecord.findUnique({
      where: { record_id: recordId },
      include: {
        appointment: {
          include: {
            patient: { select: { user_id: true, full_name: true } },
            doctor: { select: { user_id: true, full_name: true } },
          },
        },
        glasses_prescription: true,
        drug_prescription: { include: { items: { include: { drug: true } } } },
      },
    });

    if (!record) throw new NotFoundException('Không tìm thấy hồ sơ bệnh án');

    const isPatient = userRole === 'PATIENT' && record.appointment.patient?.user_id === userId;
    const isDoctor = userRole === 'DOCTOR' && record.appointment.doctor?.user_id === userId;
    const isAdmin = userRole === 'ADMIN';

    if (!isPatient && !isDoctor && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xem hồ sơ này');
    }

    return record;
  }
}
