// lib/screens/doctor/doctor_main_screen.dart
import 'package:flutter/material.dart';
import 'doctor_home_screen.dart';
import 'doctor_today_screen.dart';
import 'doctor_schedule_screen.dart';
import 'doctor_profile_screen.dart';

class DoctorMainScreen extends StatefulWidget {
  const DoctorMainScreen({super.key});
  @override
  State<DoctorMainScreen> createState() => _DoctorMainScreenState();
}

class _DoctorMainScreenState extends State<DoctorMainScreen> {
  int _selectedIndex = 0;
  static const Color brandCyan = Color(0xFF0AA2D1);
  static const Color bgColor = Color(0xFFF8FAFC);

  final List<Map<String, dynamic>> _navItems = [
    {'icon': Icons.grid_view_outlined, 'activeIcon': Icons.grid_view_rounded, 'label': 'Tổng quan'},
    {'icon': Icons.access_time_outlined, 'activeIcon': Icons.access_time_filled, 'label': 'Lịch hôm nay'},
    {'icon': Icons.calendar_month_outlined, 'activeIcon': Icons.calendar_month, 'label': 'Lịch làm việc'},
    {'icon': Icons.person_pin_outlined, 'activeIcon': Icons.person_pin, 'label': 'Hồ sơ'},
  ];

  final List<Widget> _screens = const [
    DoctorHomeScreen(),
    DoctorTodayScreen(),
    DoctorScheduleScreen(),
    DoctorProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.width >= 700;

    // Tablet/Web: dùng sidebar (giữ nguyên behavior cũ)
    if (isTablet) {
      return const DoctorHomeScreen();
    }

    // Mobile: IndexedStack + BottomNavigationBar
    return Scaffold(
      backgroundColor: bgColor,
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
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
}
