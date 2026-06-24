// lib/screens/booking/doctor_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/doctor_model.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import 'book_appointment_screen.dart';

class DoctorDetailScreen extends StatelessWidget {
  final DoctorModel doctor;
  const DoctorDetailScreen({super.key, required this.doctor});

  static const Color brandCyan = Color(0xFF0AA2D1);
  static const Color bgColor = Color(0xFFF8FAFC);

  @override
  Widget build(BuildContext context) {
    final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');
    final String initial = doctor.fullName.isNotEmpty
        ? doctor.fullName.replaceAll('Dr. ', '').replaceAll('BS. ', '')[0].toUpperCase()
        : 'B';

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final profileCard = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(color: brandCyan.withOpacity(0.15), borderRadius: BorderRadius.circular(18)),
            alignment: Alignment.center,
            child: Text(initial, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold, color: brandCyan)),
          ),
          const SizedBox(width: 16),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(doctor.fullName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            const SizedBox(height: 4),
            Text(doctor.title ?? 'Bác sĩ chuyên khoa', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 8),
            Wrap(spacing: 6, runSpacing: 6, children: doctor.specializations.map((spec) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(16)),
              child: Text(spec, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF0369A1))),
            )).toList()),
          ])),
        ]),
        const SizedBox(height: 16),
        Row(children: [
          _buildStat(Icons.star_rounded, const Color(0xFFF59E0B), '4.9', 'Đánh giá'),
          const SizedBox(width: 20),
          _buildStat(Icons.people_outline, brandCyan, '200+', 'Bệnh nhân'),
          const SizedBox(width: 20),
          _buildStat(Icons.workspace_premium_outlined, const Color(0xFF8B5CF6), '5+ năm', 'Kinh nghiệm'),
        ]),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Phí khám', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
            Text(currencyFormatter.format(doctor.consultationFee), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: brandCyan)),
          ]),
          ElevatedButton.icon(
            onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => BookAppointmentScreen(doctor: doctor))),
            icon: const Icon(Icons.calendar_month, size: 16),
            label: const Text('Đặt lịch khám', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          ),
        ]),
      ]),
    );

    final infoSection = isTablet
        ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 2, child: _buildInfoPanel(title: 'Giới thiệu', icon: Icons.info_outline, child: Text(
              'Bác sĩ ${doctor.fullName} là chuyên gia nhãn khoa với nhiều năm kinh nghiệm trong lĩnh vực khám và điều trị các bệnh lý về mắt.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.7),
            ))),
            const SizedBox(width: 16),
            Expanded(child: _buildInfoPanel(title: 'Lịch khám', icon: Icons.schedule, child: Column(children: [
              _buildScheduleRow('Thứ 2 – Thứ 6', '08:00 – 17:00'),
              const SizedBox(height: 8),
              _buildScheduleRow('Thứ 7', '08:00 – 12:00'),
              const SizedBox(height: 8),
              _buildScheduleRow('Chủ nhật', 'Nghỉ'),
            ]))),
          ])
        : Column(children: [
            _buildInfoPanel(title: 'Giới thiệu', icon: Icons.info_outline, child: Text(
              'Bác sĩ ${doctor.fullName} là chuyên gia nhãn khoa với nhiều năm kinh nghiệm.',
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.7),
            )),
            const SizedBox(height: 12),
            _buildInfoPanel(title: 'Lịch khám', icon: Icons.schedule, child: Column(children: [
              _buildScheduleRow('Thứ 2 – Thứ 6', '08:00 – 17:00'),
              const SizedBox(height: 8),
              _buildScheduleRow('Thứ 7', '08:00 – 12:00'),
              const SizedBox(height: 8),
              _buildScheduleRow('Chủ nhật', 'Nghỉ'),
            ])),
          ]);

    final content = SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        profileCard,
        const SizedBox(height: 16),
        infoSection,
      ]),
    );

    return ResponsiveScaffold(
      title: 'Thông tin bác sĩ',
      sidebar: const AppSidebar(activeMenu: 'Đặt lịch khám'),
      showBackButton: true,
      body: content,
    );
  }

  Widget _buildStat(IconData icon, Color color, String value, String label) {
    return Row(
      children: [
        Icon(icon, color: color, size: 18),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoPanel({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: brandCyan, size: 18),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF1F5F9)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildScheduleRow(String day, String time) {
    final bool isOff = time == 'Nghỉ';
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(day, style: const TextStyle(fontSize: 13, color: Color(0xFF475569), fontWeight: FontWeight.w500)),
        Text(
          time,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: isOff ? Colors.red : brandCyan,
          ),
        ),
      ],
    );
  }
}

