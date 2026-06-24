// lib/screens/doctor/doctor_today_screen.dart
import 'package:intl/intl.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/doctor_dashboard_provider.dart';
import '../../widgets/doctor_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class DoctorTodayScreen extends StatefulWidget {
  const DoctorTodayScreen({super.key});
  @override
  State<DoctorTodayScreen> createState() => _DoctorTodayScreenState();
}

class _DoctorTodayScreenState extends State<DoctorTodayScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<DoctorDashboardProvider>().loadTodayAppointments());
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DoctorDashboardProvider>();
    final dateStr = DateFormat('EEEE, dd/MM/yyyy', 'vi').format(DateTime.now());

    final content = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Lịch hôm nay', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 4),
          Text(dateStr, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 20),
          Expanded(
            child: provider.loadingToday
                ? const Center(child: CircularProgressIndicator(color: brandCyan))
                : provider.todayAppointments.isEmpty
                    ? Container(
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
                        child: const Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                          Icon(Icons.access_time, size: 48, color: Color(0xFFCBD5E1)),
                          SizedBox(height: 12),
                          Text('Không có lịch khám nào hôm nay', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                        ])),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.only(bottom: 80),
                        itemCount: provider.todayAppointments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _buildCard(provider.todayAppointments[i]),
                      ),
          ),
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Lịch hôm nay',
      sidebar: const DoctorSidebar(activeMenu: 'Lịch hôm nay'),
      body: content,
    );
  }

  Widget _buildCard(Map<String, dynamic> apt) {
    // Backend trả về nested objects: patient: { full_name }, slot: { start_time, end_time }
    final patient = apt['patient'] as Map<String, dynamic>? ?? {};
    final slot = apt['slot'] as Map<String, dynamic>? ?? {};

    final patientName = patient['full_name']?.toString()
        ?? apt['patient_name']?.toString()
        ?? 'Bệnh nhân';
    final status = apt['status']?.toString() ?? 'CONFIRMED';
    final initial = patientName[0].toUpperCase();

    // Parse giờ từ slot.start_time (UTC ISO string) → giờ VN
    String timeDisplay = '—';
    final rawStart = slot['start_time']?.toString() ?? apt['start_time']?.toString() ?? '';
    final rawEnd   = slot['end_time']?.toString()   ?? apt['end_time']?.toString()   ?? '';
    if (rawStart.isNotEmpty) {
      try {
        final start = DateTime.parse(rawStart).add(const Duration(hours: 7));
        final end   = rawEnd.isNotEmpty
            ? DateTime.parse(rawEnd).add(const Duration(hours: 7))
            : start.add(const Duration(minutes: 30));
        timeDisplay = '${start.hour.toString().padLeft(2,'0')}:${start.minute.toString().padLeft(2,'0')}'
            ' – ${end.hour.toString().padLeft(2,'0')}:${end.minute.toString().padLeft(2,'0')}';
      } catch (_) {
        timeDisplay = rawStart.split('T').last.substring(0, 5);
      }
    }

    Color badgeBg; Color badgeFg; String badgeText;
    switch (status) {
      case 'CONFIRMED': badgeBg = const Color(0xFFFEF3C7); badgeFg = const Color(0xFFB45309); badgeText = 'Chờ khám'; break;
      case 'COMPLETED': badgeBg = const Color(0xFFD1FAE5); badgeFg = const Color(0xFF047857); badgeText = 'Đã hoàn thành'; break;
      default: badgeBg = const Color(0xFFE0F2FE); badgeFg = const Color(0xFF0369A1); badgeText = 'Đang khám';
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Row(children: [
        CircleAvatar(backgroundColor: brandCyan, radius: 22,
            child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16))),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(patientName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.access_time, size: 13, color: Color(0xFF94A3B8)),
            const SizedBox(width: 4),
            Text(timeDisplay, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ]),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(12)),
          child: Text(badgeText, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: badgeFg)),
        ),
        const SizedBox(width: 12),
        if (status == 'CONFIRMED')
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.videocam_outlined, size: 16),
            label: const Text('Vào khám', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            style: ElevatedButton.styleFrom(
              backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
          ),
      ]),
    );
  }
}

