// lib/screens/home/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_sidebar.dart';
import '../booking/doctor_list_screen.dart';
import '../booking/my_appointments_screen.dart';
import '../profile/profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  static const Color brandCyan = Color(0xFF0AA2D1);
  static const Color bgColor = Color(0xFFF8FAFC);

  final List<Map<String, dynamic>> _navItems = [
    {'icon': Icons.dashboard_outlined, 'activeIcon': Icons.dashboard, 'label': 'Tổng quan'},
    {'icon': Icons.calendar_month_outlined, 'activeIcon': Icons.calendar_month, 'label': 'Đặt lịch'},
    {'icon': Icons.list_alt_outlined, 'activeIcon': Icons.list_alt, 'label': 'Lịch hẹn'},
    {'icon': Icons.person_outline, 'activeIcon': Icons.person, 'label': 'Hồ sơ'},
  ];

  // Giữ state của từng tab (IndexedStack không rebuild)
  Widget _getScreen(int index) {
    switch (index) {
      case 1: return const DoctorListScreen();
      case 2: return MyAppointmentsScreen(onBack: () => setState(() => _selectedIndex = 0));
      case 3: return ProfileScreen(onBack: () => setState(() => _selectedIndex = 0));
      default: return _buildDashboard();
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final isTablet = MediaQuery.of(context).size.width >= 700;

    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: bgColor,
        body: Center(child: CircularProgressIndicator(color: brandCyan)),
      );
    }

    if (isTablet) {
      // Desktop/Tablet: sidebar layout
      return Scaffold(
        backgroundColor: bgColor,
        body: Row(
          children: [
            const AppSidebar(activeMenu: 'Tổng quan'),
            Expanded(child: _buildDashboard()),
          ],
        ),
      );
    }

    // Mobile: IndexedStack + persistent bottom nav
    return Scaffold(
      backgroundColor: bgColor,
      // Dùng IndexedStack để giữ state của từng tab và không push route mới
      body: IndexedStack(
        index: _selectedIndex,
        children: List.generate(4, (i) => _getScreen(i)),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
        boxShadow: [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (i) => setState(() => _selectedIndex = i),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: brandCyan,
        unselectedItemColor: const Color(0xFF94A3B8),
        backgroundColor: Colors.transparent,
        elevation: 0,
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: _navItems.map((item) => BottomNavigationBarItem(
          icon: Icon(item['icon'] as IconData),
          activeIcon: Icon(item['activeIcon'] as IconData),
          label: item['label'] as String,
        )).toList(),
      ),
    );
  }

  Widget _buildDashboard() {
    final auth = context.watch<AuthProvider>();
    final user = auth.currentUser;
    final isTablet = MediaQuery.of(context).size.width >= 700;
    final String displayName = user?.fullName ?? user?.email.split('@')[0] ?? 'Khách';
    final String displayEmail = user?.email ?? 'Chưa cập nhật';

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, isTablet ? 40 : 16, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!isTablet) ...[
            const SizedBox(height: 8),
            Row(children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: brandCyan, borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.remove_red_eye, color: Colors.white, size: 20),
              ),
              const SizedBox(width: 10),
              const Text('Tele-Eye', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const Spacer(),
            ]),
            const SizedBox(height: 20),
          ],

          // Welcome card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0AA2D1), Color(0xFF06B6D4)],
                begin: Alignment.topLeft, end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                CircleAvatar(
                  backgroundColor: Colors.white.withOpacity(0.2),
                  radius: 22,
                  child: Text(
                    displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Xin chào, $displayName!',
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  Text(displayEmail, style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                ])),
              ]),
              const SizedBox(height: 20),
              const Text('Chăm sóc mắt của bạn', style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(height: 4),
              Text('Đặt lịch khám với bác sĩ nhãn khoa uy tín', style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12)),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () => setState(() => _selectedIndex = 1),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Đặt lịch ngay', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: brandCyan,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 20),

          // Quick actions
          const Text('Dịch vụ', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 12),
          Row(children: [
            _quickAction(Icons.calendar_month_outlined, 'Đặt lịch', const Color(0xFFE0F2FE), const Color(0xFF0369A1), () => setState(() => _selectedIndex = 1)),
            const SizedBox(width: 12),
            _quickAction(Icons.list_alt_outlined, 'Lịch hẹn', const Color(0xFFF0FDF4), const Color(0xFF15803D), () => setState(() => _selectedIndex = 2)),
            const SizedBox(width: 12),
            _quickAction(Icons.person_outline, 'Hồ sơ', const Color(0xFFF3E8FF), const Color(0xFF7E22CE), () => setState(() => _selectedIndex = 3)),
          ]),
          const SizedBox(height: 24),

          // Info cards
          const Text('Thông tin của tôi', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 12),
          _infoCard(Icons.email_outlined, 'Email', displayEmail),
          const SizedBox(height: 10),
          _infoCard(Icons.phone_outlined, 'Số điện thoại', user?.phoneNumber ?? 'Chưa cập nhật'),
          const SizedBox(height: 10),
          _infoCard(Icons.cake_outlined, 'Ngày sinh', user?.dateOfBirth ?? 'Chưa cập nhật'),
          const SizedBox(height: 10),
          _infoCard(Icons.wc_outlined, 'Giới tính', user?.gender ?? 'Chưa cập nhật'),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _quickAction(IconData icon, String label, Color bg, Color fg, VoidCallback onTap) {
    return Expanded(child: GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
        child: Column(children: [
          Icon(icon, color: fg, size: 24),
          const SizedBox(height: 6),
          Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
        ]),
      ),
    ));
  }

  Widget _infoCard(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: brandCyan.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, color: brandCyan, size: 18),
        ),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: Color(0xFF1E293B))),
        ]),
      ]),
    );
  }
}
