// lib/screens/booking/my_appointments_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/appointment_provider.dart';
import '../../models/appointment_model.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import '../medical_records/medical_record_screen.dart';

class MyAppointmentsScreen extends StatefulWidget {
  final VoidCallback? onBack;
  const MyAppointmentsScreen({super.key, this.onBack});

  @override
  State<MyAppointmentsScreen> createState() => _MyAppointmentsScreenState();
}

class _MyAppointmentsScreenState extends State<MyAppointmentsScreen> {
  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');
  String _selectedTab = 'Tất cả';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppointmentProvider>().loadAppointments();
    });
  }

  @override
  Widget build(BuildContext context) {
    const Color brandCyan = Color(0xFF0AA2D1);
    
    final appointmentProvider = context.watch<AppointmentProvider>();

    // Lọc danh sách dựa trên tab
    List<AppointmentModel> filteredAppointments = appointmentProvider.appointments;
    if (_selectedTab == 'Sắp tới') {
      filteredAppointments = filteredAppointments.where((a) => a.status == 'CONFIRMED').toList();
    } else if (_selectedTab == 'Đã hoàn thành') {
      filteredAppointments = filteredAppointments.where((a) => a.status == 'COMPLETED').toList();
    } else if (_selectedTab == 'Đã huỷ') {
      filteredAppointments = filteredAppointments.where((a) => a.status == 'CANCELLED').toList();
    }

    final content = Column(
      children: [
        // Tabs
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(children: [
              _buildTabButton('Tất cả'),
              _buildTabButton('Sắp tới'),
              _buildTabButton('Đã hoàn thành'),
              _buildTabButton('Đã huỷ'),
            ]),
          ),
        ),
        Expanded(
          child: appointmentProvider.isLoading
              ? const Center(child: CircularProgressIndicator(color: brandCyan))
              : filteredAppointments.isEmpty
                  ? const Center(child: Text('Không có lịch hẹn nào', style: TextStyle(color: Colors.grey)))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredAppointments.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 12),
                      itemBuilder: (_, index) => _buildAppointmentCard(filteredAppointments[index], brandCyan),
                    ),
        ),
      ],
    );

    return ResponsiveScaffold(
      title: 'Lịch hẹn của tôi',
      sidebar: const AppSidebar(activeMenu: 'Lịch hẹn của tôi'),
      showBackButton: widget.onBack != null,
      onBack: widget.onBack,
      body: content,
    );
  }

  // Widget Helper: Nút Tab
  Widget _buildTabButton(String title) {
    final isSelected = _selectedTab == title;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedTab = title;
        });
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFFE2E8F0) : Colors.transparent,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2))]
              : [],
        ),
        child: Text(
          title,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? const Color(0xFF0AA2D1) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  // Widget Helper: Thẻ Lịch hẹn
  Widget _buildAppointmentCard(AppointmentModel apt, Color brandCyan) {
    final String initial = apt.doctorName.isNotEmpty ? apt.doctorName.replaceAll('BS. ', '')[0].toUpperCase() : 'B';
    
    // Setup màu sắc cho Badge trạng thái
    Color badgeBgColor;
    Color badgeTextColor;
    String badgeText;
    
    if (apt.status == 'CONFIRMED') {
      badgeBgColor = const Color(0xFFDBEAFE);
      badgeTextColor = const Color(0xFF1D4ED8);
      badgeText = 'Đã xác nhận';
    } else if (apt.status == 'COMPLETED') {
      badgeBgColor = const Color(0xFFD1FAE5);
      badgeTextColor = const Color(0xFF047857);
      badgeText = 'Hoàn thành';
    } else {
      badgeBgColor = const Color(0xFFFEE2E2);
      badgeTextColor = const Color(0xFFB91C1C);
      badgeText = 'Đã huỷ';
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row chính
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: const Color(0xFFCFF7F2), // Màu cyan nhạt
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0288D1)),
                ),
              ),
              const SizedBox(width: 16),
              
              // Thông tin bác sĩ
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      apt.doctorName,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      apt.specialization,
                      style: const TextStyle(fontSize: 13, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 10),
                    // Ngày
                    Row(children: [
                      const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF0AA2D1)),
                      const SizedBox(width: 5),
                      Flexible(child: Text(apt.date,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis)),
                    ]),
                    const SizedBox(height: 3),
                    // Giờ
                    Row(children: [
                      const Icon(Icons.access_time, size: 13, color: Color(0xFF0AA2D1)),
                      const SizedBox(width: 5),
                      Flexible(child: Text(apt.time,
                          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                          overflow: TextOverflow.ellipsis)),
                    ]),
                  ],
                ),
              ),
              
              // Cột bên phải: Badge + Giá (giới hạn width để tránh overflow)
              SizedBox(
                width: 100,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: badgeBgColor, borderRadius: BorderRadius.circular(16)),
                      child: Text(badgeText, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: badgeTextColor), overflow: TextOverflow.ellipsis),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      currencyFormatter.format(apt.fee),
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: brandCyan),
                      textAlign: TextAlign.end,
                    ),
                  ],
                ),
              )
            ],
          ),
          
          // Action button (chỉ hiện nếu status ko phải CANCELLED)
          if (apt.status != 'CANCELLED') ...[
            const SizedBox(height: 20),
            if (apt.status == 'CONFIRMED')
              ElevatedButton.icon(
                onPressed: () {},
                icon: const Icon(Icons.videocam_outlined, size: 18),
                label: const Text('Vào phòng khám', style: TextStyle(fontWeight: FontWeight.w600)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: brandCyan,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              )
            else if (apt.status == 'COMPLETED')
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => MedicalRecordScreen(appointment: apt)),
                  );
                },
                icon: const Icon(Icons.description_outlined, size: 18),
                label: const Text('Xem bệnh án', style: TextStyle(fontWeight: FontWeight.w600)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF475569),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              )
          ]
        ],
      ),
    );
  }

}
