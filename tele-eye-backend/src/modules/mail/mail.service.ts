// src/modules/mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    // [Chưa xác minh] Đây là cấu hình mẫu cho Gmail. Bạn cần thay thế bằng thông tin thật.
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // VD: admin@tele-eye.com
        pass: process.env.SMTP_PASS, // Mật khẩu ứng dụng (App Password)
      },
    });
  }

  // Hàm chuyên dụng để gửi kết quả khám
  // Thêm tham số enrichedDrugs vào hàm
  async sendMedicalRecordEmail(
    patientEmail: string,
    patientName: string,
    recordData: any,
    enrichedDrugs: any[],
  ) {
    try {
      let drugListHtml = '<ul>';

      // Dùng enrichedDrugs để lặp thay vì recordData.drug_prescription
      if (enrichedDrugs && enrichedDrugs.length > 0) {
        enrichedDrugs.forEach((item) => {
          // In tên thuốc và đơn vị (Lọ/Viên)
          drugListHtml += `<li><b>${item.drug_name}</b>: ${item.quantity} ${item.unit} (HDSD: ${item.dosage || 'Không có'})</li>`;
        });
      } else {
        drugListHtml += '<li>Không có thuốc kê đơn</li>';
      }
      drugListHtml += '</ul>';

      const mailOptions = {
        from: '"Phòng khám Tele-Eye" <no-reply@tele-eye.com>',
        to: patientEmail,
        subject: `[Tele-Eye] Kết quả khám bệnh trực tuyến - ${patientName}`,
        html: `
          <h2>Chào ${patientName},</h2>
          <p>Cảm ơn bạn đã sử dụng dịch vụ khám mắt trực tuyến. Dưới đây là tóm tắt kết quả khám của bạn:</p>
          
          <h3>1. Chẩn đoán</h3>
          <p><b>Mắt phải (OD):</b> ${recordData.diagnosis_od || 'Bình thường'}</p>
          <p><b>Mắt trái (OS):</b> ${recordData.diagnosis_os || 'Bình thường'}</p>
          <p><b>Lời khuyên của bác sĩ:</b> ${recordData.management_plan || 'Không có'}</p>

          <h3>2. Đơn thuốc</h3>
          ${drugListHtml}

          <p>Vui lòng đăng nhập vào ứng dụng để xem chi tiết đơn kính và hồ sơ đầy đủ.</p>
          <p>Trân trọng,<br/>Đội ngũ Tele-Eye</p>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email đã được gửi thành công tới: ${patientEmail}`);

      return true;
    } catch (error) {
      this.logger.error(`Lỗi khi gửi email tới ${patientEmail}:`, error);
      return false;
    }
  }
}
