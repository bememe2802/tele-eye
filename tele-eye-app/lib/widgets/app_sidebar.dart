// lib/widgets/app_sidebar.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/home/home_screen.dart';
import '../screens/booking/doctor_list_screen.dart';
import '../screens/booking/my_appointments_screen.dart';
import '../screens/profile/profile_screen.dart';

class AppSidebar extends StatelessWidget {
  final String activeMenu;
  const AppSidebar({super.key, required this.activeMenu});

  static const Color brandCyan = Color(0xFF0AA2D1);

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;
    final String displayName = user?.fullName ?? user?.email.split('@')[0] ?? 'Khách';
    final String displayEmail = user?.email ?? 'Chưa cập nhật';
    final String displayAvatar = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    return Container(
      width: 260,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: brandCyan,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.remove_red_eye, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                const Text(
                  'Tele-Eye',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Menu Items
          _buildMenuItem(context, Icons.grid_view_rounded, 'Tổng quan', const HomeScreen()),
          _buildMenuItem(context, Icons.calendar_month_outlined, 'Đặt lịch khám', const DoctorListScreen()),
          _buildMenuItem(context, Icons.receipt_long_outlined, 'Lịch hẹn của tôi', const MyAppointmentsScreen()),
          _buildMenuItem(context, Icons.person_outline, 'Hồ sơ cá nhân', const ProfileScreen()),

          const Spacer(),

          // Bottom Menu
          _buildMenuItemSimple(Icons.settings_outlined, 'Cài đặt', onTap: () {}),
          _buildMenuItemSimple(Icons.logout, 'Đăng xuất', isDestructive: true, onTap: () {
            authProvider.logout();
            Navigator.of(context).pushReplacementNamed('/');
          }),

          const SizedBox(height: 16),
          const Divider(color: Color(0xFFE2E8F0)),
          const SizedBox(height: 16),

          // User Profile
          Row(
            children: [
              CircleAvatar(
                backgroundColor: brandCyan,
                radius: 18,
                child: Text(displayAvatar, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      displayEmail,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Text('Bệnh nhân', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMenuItem(BuildContext context, IconData icon, String title, Widget screen) {
    final bool isActive = activeMenu == title;
    final Color color = isActive ? Colors.white : const Color(0xFF64748B);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: isActive ? brandCyan : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        leading: Icon(icon, color: color, size: 22),
        title: Text(
          title,
          style: TextStyle(color: color, fontWeight: isActive ? FontWeight.w600 : FontWeight.w500, fontSize: 14),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: isActive ? null : () {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => screen));
        },
      ),
    );
  }

  Widget _buildMenuItemSimple(IconData icon, String title, {bool isDestructive = false, VoidCallback? onTap}) {
    final Color color = isDestructive ? Colors.red : const Color(0xFF64748B);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: color, size: 22),
        title: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.w500, fontSize: 14)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        onTap: onTap ?? () {},
      ),
    );
  }
}
