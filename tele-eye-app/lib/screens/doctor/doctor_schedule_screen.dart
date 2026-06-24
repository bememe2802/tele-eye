// lib/screens/doctor/doctor_schedule_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/doctor_dashboard_provider.dart';
import '../../widgets/doctor_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class DoctorScheduleScreen extends StatefulWidget {
  const DoctorScheduleScreen({super.key});
  @override
  State<DoctorScheduleScreen> createState() => _DoctorScheduleScreenState();
}

class _DoctorScheduleScreenState extends State<DoctorScheduleScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  // Ngày trong tuần — backend nhận số (1=T2...0=CN theo enum DayOfWeek)
  final List<Map<String, dynamic>> _days = [
    {'label': 'T2', 'value': 1},
    {'label': 'T3', 'value': 2},
    {'label': 'T4', 'value': 3},
    {'label': 'T5', 'value': 4},
    {'label': 'T6', 'value': 5},
    {'label': 'T7', 'value': 6},
    {'label': 'CN', 'value': 0},
  ];
  final Set<int> _selectedDays = {};

  // Slot index (backend dùng system_slot_ids là số nguyên)
  final List<String> _slotLabels = [
    '07:00 - 07:30', '07:30 - 08:00', '08:00 - 08:30', '08:30 - 09:00',
    '09:00 - 09:30', '09:30 - 10:00', '10:00 - 10:30', '10:30 - 11:00',
    '13:00 - 13:30', '13:30 - 14:00', '14:00 - 14:30', '14:30 - 15:00',
    '15:00 - 15:30', '15:30 - 16:00', '16:00 - 16:30', '16:30 - 17:00',
  ];
  final Set<int> _selectedSlotIds = {}; // IDs, không phải labels

  bool _saving = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<DoctorDashboardProvider>().loadCurrentSchedule());
  }

  Future<void> _saveSchedule() async {
    if (_selectedDays.isEmpty || _selectedSlotIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn ngày và giờ'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      await context.read<DoctorDashboardProvider>().registerAvailability(
        daysOfWeek: _selectedDays.toList(),
        systemSlotIds: _selectedSlotIds.toList(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Lưu lịch làm việc thành công!'), backgroundColor: Colors.green),
        );
        setState(() { _selectedDays.clear(); _selectedSlotIds.clear(); });
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<DoctorDashboardProvider>();

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final leftPanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.add, color: Color(0xFF1E293B), size: 18),
          SizedBox(width: 6),
          Text('Đăng ký lịch mới', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        ]),
        const SizedBox(height: 16),
        const Text('Chọn ngày trong tuần', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: _days.map((day) {
          final selected = _selectedDays.contains(day['value']);
          return GestureDetector(
            onTap: () => setState(() { if (selected) _selectedDays.remove(day['value']); else _selectedDays.add(day['value'] as int); }),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              width: 50, height: 38, alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? brandCyan : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: selected ? brandCyan : const Color(0xFFE2E8F0)),
              ),
              child: Text(day['label'] as String, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: selected ? Colors.white : const Color(0xFF475569))),
            ),
          );
        }).toList()),
        const SizedBox(height: 16),
        const Text('Chọn khung giờ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
        const SizedBox(height: 8),
        GridView.builder(
          shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: 8, mainAxisSpacing: 8, childAspectRatio: 4.0),
          itemCount: _slotLabels.length,
          itemBuilder: (_, i) {
            final slotId = i + 1;
            final selected = _selectedSlotIds.contains(slotId);
            return GestureDetector(
              onTap: () => setState(() { if (selected) _selectedSlotIds.remove(slotId); else _selectedSlotIds.add(slotId); }),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150), alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? brandCyan.withOpacity(0.1) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: selected ? brandCyan : const Color(0xFFE2E8F0), width: selected ? 1.5 : 1),
                ),
                child: Text(_slotLabels[i], style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: selected ? brandCyan : const Color(0xFF475569))),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _saving ? null : _saveSchedule,
          style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0, padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          child: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text('Lưu lịch làm việc', style: TextStyle(fontWeight: FontWeight.bold)),
        )),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: OutlinedButton(
          onPressed: () async {
            final messenger = ScaffoldMessenger.of(context);
            try {
              await context.read<DoctorDashboardProvider>().generateSlots();
              if (mounted) {
                messenger.showSnackBar(
                  const SnackBar(content: Text('Đã sinh slot thành công!'), backgroundColor: Colors.green),
                );
              }
            } catch (e) {
              if (mounted) {
                messenger.showSnackBar(
                  SnackBar(content: Text('Lỗi sinh slot: $e'), backgroundColor: Colors.red),
                );
              }
            }
          },
          style: OutlinedButton.styleFrom(foregroundColor: brandCyan, side: const BorderSide(color: brandCyan), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
          child: const Text('Sinh slot hệ thống', style: TextStyle(fontWeight: FontWeight.bold)),
        )),
      ]),
    );

    final rightPanel = Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Row(children: [
          Icon(Icons.calendar_month_outlined, color: brandCyan, size: 18),
          SizedBox(width: 8),
          Text('Lịch làm việc hiện tại', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        ]),
        const SizedBox(height: 14),
        if (provider.loadingSchedule)
          const Center(child: CircularProgressIndicator(color: brandCyan))
        else if (provider.currentSchedule.isEmpty)
          const Padding(padding: EdgeInsets.all(16), child: Center(child: Text('Chưa có lịch làm việc', style: TextStyle(color: Color(0xFF94A3B8)))))
        else
          ...provider.currentSchedule.map((item) {
            // Map day_of_week number to Vietnamese name
            const dayNames = {0: 'Chủ nhật', 1: 'Thứ 2', 2: 'Thứ 3', 3: 'Thứ 4', 4: 'Thứ 5', 5: 'Thứ 6', 6: 'Thứ 7'};
            final dayName = dayNames[item['day_of_week']] ?? 'Ngày ${item['day_of_week']}';
            final slots = (item['slots'] as List?) ?? [];
            final slotNames = slots.map((s) => s['shift_name']?.toString() ?? '').where((s) => s.isNotEmpty).toList();

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.calendar_today, size: 14, color: brandCyan),
                  const SizedBox(width: 6),
                  Text(dayName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                  const Spacer(),
                  Text('${slots.length} ca', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                ]),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 6, children: slotNames.map((name) => Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: brandCyan.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                  child: Text(name, style: const TextStyle(fontSize: 11, color: brandCyan, fontWeight: FontWeight.w500)),
                )).toList()),
              ]),
            );
          }),
      ]),
    );

    final content = SingleChildScrollView(
      padding: EdgeInsets.all(isTablet ? 40 : 16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Quản lý lịch làm việc', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 16),
        if (isTablet)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: leftPanel),
            const SizedBox(width: 20),
            Expanded(flex: 2, child: rightPanel),
          ])
        else
          Column(children: [leftPanel, const SizedBox(height: 16), rightPanel, const SizedBox(height: 80)]),
      ]),
    );

    return ResponsiveScaffold(
      title: 'Lịch làm việc',
      sidebar: const DoctorSidebar(activeMenu: 'Lịch làm việc'),
      // showBackButton chỉ dùng khi push route, không dùng trong IndexedStack
      body: content,
    );
  }
}
