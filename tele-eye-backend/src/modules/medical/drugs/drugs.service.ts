// src/modules/medical/services/drug.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CreateDrugDto, UpdateDrugDto } from './dto/drug.dto';

@Injectable()
export class DrugService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateDrugDto) {
    // [Suy luận] Kiểm tra trùng lặp tên thuốc. Đây là hành vi dự kiến, không được đảm bảo nếu có lỗi kết nối.
    const existingDrug = await this.prisma.drug.findUnique({
      where: { name: dto.name },
    });

    if (existingDrug) {
      throw new ConflictException('Tên thuốc này đã tồn tại trong hệ thống.');
    }

    return this.prisma.drug.create({ data: dto });
  }

  async findAll(search?: string) {
    // [Suy luận] Lấy danh sách thuốc, hỗ trợ tìm kiếm không phân biệt hoa thường. Đây là hành vi dự kiến, không được đảm bảo.
    const whereCondition: any = { is_active: true };

    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { active_ingredient: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.drug.findMany({
      where: whereCondition,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, dto: UpdateDrugDto) {
    const drug = await this.prisma.drug.findUnique({ where: { drug_id: id } });
    if (!drug) throw new NotFoundException('Không tìm thấy thuốc.');

    return this.prisma.drug.update({
      where: { drug_id: id },
      data: dto,
    });
  }

  async remove(id: number) {
    const drug = await this.prisma.drug.findUnique({ where: { drug_id: id } });
    if (!drug) throw new NotFoundException('Không tìm thấy thuốc.');

    // [Suy luận] Thực hiện Soft Delete (Xóa mềm) để giữ lại lịch sử đơn thuốc cũ. Đây là hành vi dự kiến, không được đảm bảo.
    return this.prisma.drug.update({
      where: { drug_id: id },
      data: { is_active: false },
    });
  }
}
