// lib/screens/doctor/doctor_home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/doctor_dashboard_provider.dart';
import '../../widgets/doctor_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class DoctorHomeScreen extends StatefulWidget {
  const DoctorHomeScreen({super.key});
  @override
  State<DoctorHomeScreen> createState() => _DoctorHomeScreenState();
}

class _DoctorHomeScreenState extends State<DoctorHomeScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<DoctorDashboardProvider>().loadTodayAppointments());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DoctorDashboardProvider>();
    final now = DateTime.now();
    // Format thủ công, không cần locale vi
    const weekdays = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
    final weekday = weekdays[now.weekday - 1];
    final dateStr = '$weekday, ${now.day.toString().padLeft(2,'0')}/${now.month.toString().padLeft(2,'0')}/${now.year}';

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final content = Padding(
      padding: EdgeInsets.all(isTablet ? 40 : 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Lịch khám hôm nay',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 4),
          Text(dateStr, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 20),

          // Stat cards
          if (isTablet)
            Row(children: [
              Expanded(child: _buildStatCard(icon: Icons.access_time_outlined, iconColor: const Color(0xFFF59E0B), bgColor: const Color(0xFFFEF3C7), value: '${provider.waitingCount}', label: 'Chờ khám')),
              const SizedBox(width: 14),
              Expanded(child: _buildStatCard(icon: Icons.videocam_outlined, iconColor: brandCyan, bgColor: const Color(0xFFE0F2FE), value: '${provider.inProgressCount}', label: 'Đang khám')),
              const SizedBox(width: 14),
              Expanded(child: _buildStatCard(icon: Icons.check_circle_outline, iconColor: const Color(0xFF22C55E), bgColor: const Color(0xFFD1FAE5), value: '${provider.doneCount}', label: 'Đã xong')),
            ])
          else
            Row(children: [
              Expanded(child: _buildStatCard(icon: Icons.access_time_outlined, iconColor: const Color(0xFFF59E0B), bgColor: const Color(0xFFFEF3C7), value: '${provider.waitingCount}', label: 'Chờ khám')),
              const SizedBox(width: 10),
              Expanded(child: _buildStatCard(icon: Icons.videocam_outlined, iconColor: brandCyan, bgColor: const Color(0xFFE0F2FE), value: '${provider.inProgressCount}', label: 'Đang khám')),
              const SizedBox(width: 10),
              Expanded(child: _buildStatCard(icon: Icons.check_circle_outline, iconColor: const Color(0xFF22C55E), bgColor: const Color(0xFFD1FAE5), value: '${provider.doneCount}', label: 'Đã xong')),
            ]),
          const SizedBox(height: 16),

          Expanded(
            child: Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: provider.loadingToday
                  ? const Center(child: CircularProgressIndicator(color: brandCyan))
                  : provider.todayAppointments.isEmpty
                      ? const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.access_time, size: 44, color: Color(0xFFCBD5E1)),
                          SizedBox(height: 12),
                          Text('Không có lịch khám nào hôm nay', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                        ]))
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: provider.todayAppointments.length,
                          separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          itemBuilder: (_, i) => _buildAptRow(provider.todayAppointments[i]),
                        ),
            ),
          ),
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Lịch khám hôm nay',
      sidebar: const DoctorSidebar(activeMenu: 'Tổng quan'),
      body: content,
    );
  }

  Widget _buildStatCard({required IconData icon, required Color iconColor, required Color bgColor, required String value, required String label}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: iconColor, size: 20)),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), overflow: TextOverflow.ellipsis),
        ])),
      ]),
    );
  }

  Widget _buildAptRow(Map<String, dynamic> apt) {
    final patientName = apt['patient_name']?.toString() ?? 'Bệnh nhân';
    final startTime = apt['start_time']?.toString() ?? '—';
    final status = apt['status']?.toString() ?? 'CONFIRMED';
    final initial = patientName.isNotEmpty ? patientName[0].toUpperCase() : 'B';

    Color badgeBg; Color badgeFg; String badgeText;
    switch (status) {
      case 'CONFIRMED': badgeBg = const Color(0xFFFEF3C7); badgeFg = const Color(0xFFB45309); badgeText = 'Chờ khám'; break;
      case 'IN_PROGRESS': badgeBg = const Color(0xFFE0F2FE); badgeFg = const Color(0xFF0369A1); badgeText = 'Đang khám'; break;
      case 'COMPLETED': badgeBg = const Color(0xFFD1FAE5); badgeFg = const Color(0xFF047857); badgeText = 'Đã xong'; break;
      default: badgeBg = const Color(0xFFF1F5F9); badgeFg = const Color(0xFF64748B); badgeText = status;
    }

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      child: Row(children: [
        CircleAvatar(backgroundColor: brandCyan, radius: 20,
            child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(patientName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
          Text(startTime, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(12)),
          child: Text(badgeText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: badgeFg)),
        ),
        if (status == 'CONFIRMED') ...[
          const SizedBox(width: 12),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.videocam_outlined, size: 15),
            label: const Text('Vào khám', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
        ],
      ]),
    );
  }
}
