// lib/widgets/admin_sidebar.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../screens/admin/admin_home_screen.dart';
import '../screens/admin/admin_doctor_screen.dart';
import '../screens/admin/admin_drug_screen.dart';

class AdminSidebar extends StatelessWidget {
  final String activeMenu;
  const AdminSidebar({super.key, required this.activeMenu});

  static const Color brandCyan = Color(0xFF0AA2D1);

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final email = authProvider.currentUser?.email ?? 'admin@test.com';
    final initial = email[0].toUpperCase();

    return Container(
      width: 220,
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Logo
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 22),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: brandCyan,
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(Icons.remove_red_eye, color: Colors.white, size: 16),
                ),
                const SizedBox(width: 10),
                const Text(
                  'Tele-Eye',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                ),
              ],
            ),
          ),

          // Nav menu
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Column(
              children: [
                _buildNavItem(context, Icons.grid_view_rounded, 'Tổng quan', const AdminHomeScreen()),
                _buildNavItem(context, Icons.people_outline, 'Quản lý bác sĩ', const AdminDoctorScreen()),
                _buildNavItem(context, Icons.medication_outlined, 'Danh mục thuốc', const AdminDrugScreen()),
              ],
            ),
          ),

          const Spacer(),

          // Footer
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Column(
              children: [
                _buildSimpleItem(context, Icons.settings_outlined, 'Cài đặt', onTap: () {}),
                _buildSimpleItem(
                  context,
                  Icons.logout,
                  'Đăng xuất',
                  isDestructive: true,
                  onTap: () {
                    authProvider.logout();
                    Navigator.of(context).pushReplacementNamed('/');
                  },
                ),
                const SizedBox(height: 10),
                const Divider(color: Color(0xFFE2E8F0)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: brandCyan,
                      radius: 16,
                      child: Text(initial,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(email,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
                              overflow: TextOverflow.ellipsis),
                          const Text('Quản trị viên',
                              style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, IconData icon, String label, Widget screen) {
    final bool isActive = activeMenu == label;
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: isActive ? brandCyan : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: ListTile(
        dense: true,
        leading: Icon(icon, size: 20, color: isActive ? Colors.white : const Color(0xFF64748B)),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
            color: isActive ? Colors.white : const Color(0xFF64748B),
          ),
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        onTap: isActive ? null : () {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => screen));
        },
      ),
    );
  }

  Widget _buildSimpleItem(BuildContext context, IconData icon, String label,
      {bool isDestructive = false, VoidCallback? onTap}) {
    final color = isDestructive ? Colors.red : const Color(0xFF64748B);
    return ListTile(
      dense: true,
      leading: Icon(icon, size: 20, color: color),
      title: Text(label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: color)),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      onTap: onTap,
    );
  }
}
