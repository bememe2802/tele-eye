// lib/screens/admin/admin_home_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../providers/admin_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/admin_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import 'admin_doctor_screen.dart';
import 'admin_drug_screen.dart';

class AdminHomeScreen extends StatefulWidget {
  const AdminHomeScreen({super.key});

  @override
  State<AdminHomeScreen> createState() => _AdminHomeScreenState();
}

class _AdminHomeScreenState extends State<AdminHomeScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  String _formatRevenue(double amount) {
    if (amount >= 1000000000) {
      return '${(amount / 1000000000).toStringAsFixed(1)}B₫';
    } else if (amount >= 1000000) {
      return '${(amount / 1000000).toStringAsFixed(1)}M₫';
    } else if (amount >= 1000) {
      return '${(amount / 1000).toStringAsFixed(0)}K₫';
    }
    return NumberFormat.currency(locale: 'vi_VN', symbol: '₫').format(amount);
  }

  @override
  void initState() {
    super.initState();
    // Load dữ liệu qua Provider, không gọi Service trực tiếp
    Future.microtask(() {
      context.read<AdminProvider>().loadDoctors();
      context.read<AdminProvider>().loadDrugs();
      context.read<AdminProvider>().loadStats();
    });
  }

  @override
  Widget build(BuildContext context) {
    final adminProvider = context.watch<AdminProvider>();
    final totalDoctors = adminProvider.totalDoctors;
    final totalDrugs = adminProvider.totalDrugs;
    final loadingStats = adminProvider.loadingStats;
    final todayAppts = adminProvider.todayAppointments;
    final revenueStr = _formatRevenue(adminProvider.totalRevenue);

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final content = SingleChildScrollView(
      padding: EdgeInsets.all(isTablet ? 40 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Tổng quan hệ thống Tele-Eye',
              style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 16),

          // Stat cards - 2 cột trên mobile, 4 cột trên tablet
          if (isTablet)
            Row(children: [
              Expanded(child: _buildStatCard(icon: Icons.people_outline, iconColor: brandCyan, value: loadingStats ? '...' : '$totalDoctors', label: 'Tổng bác sĩ')),
              const SizedBox(width: 14),
              Expanded(child: _buildStatCard(icon: Icons.medication_outlined, iconColor: const Color(0xFF22C55E), value: loadingStats ? '...' : '$totalDrugs', label: 'Danh mục thuốc')),
              const SizedBox(width: 14),
              Expanded(child: _buildStatCard(icon: Icons.calendar_today_outlined, iconColor: const Color(0xFFF59E0B), value: loadingStats ? '...' : '$todayAppts', label: 'Lịch hẹn hôm nay')),
              const SizedBox(width: 14),
              Expanded(child: _buildStatCard(icon: Icons.trending_up, iconColor: const Color(0xFF8B5CF6), value: loadingStats ? '...' : revenueStr, label: 'Doanh thu')),
            ])
          else
            Column(children: [
              Row(children: [
                Expanded(child: _buildStatCard(icon: Icons.people_outline, iconColor: brandCyan, value: loadingStats ? '...' : '$totalDoctors', label: 'Bác sĩ')),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard(icon: Icons.medication_outlined, iconColor: const Color(0xFF22C55E), value: loadingStats ? '...' : '$totalDrugs', label: 'Thuốc')),
              ]),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _buildStatCard(icon: Icons.calendar_today_outlined, iconColor: const Color(0xFFF59E0B), value: loadingStats ? '...' : '$todayAppts', label: 'Lịch hôm nay')),
                const SizedBox(width: 12),
                Expanded(child: _buildStatCard(icon: Icons.trending_up, iconColor: const Color(0xFF8B5CF6), value: loadingStats ? '...' : revenueStr, label: 'Doanh thu')),
              ]),
            ]),
          const SizedBox(height: 20),

          // Feature cards
          if (isTablet)
            Row(children: [
              Expanded(child: _buildFeatureCard(
                icon: Icons.people_outline, title: 'Quản lý bác sĩ',
                subtitle: 'Thêm mới, chỉnh sửa thông tin bác sĩ và chuyên khoa',
                gradient: const LinearGradient(colors: [Color(0xFF0AA2D1), Color(0xFF0077C8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDoctorScreen())),
              )),
              const SizedBox(width: 16),
              Expanded(child: _buildFeatureCard(
                icon: Icons.medication_outlined, title: 'Danh mục thuốc',
                subtitle: 'Quản lý danh mục thuốc nhãn khoa trong hệ thống',
                gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF15803D)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDrugScreen())),
              )),
            ])
          else
            Column(children: [
              _buildFeatureCard(
                icon: Icons.people_outline, title: 'Quản lý bác sĩ',
                subtitle: 'Thêm mới, chỉnh sửa thông tin bác sĩ và chuyên khoa',
                gradient: const LinearGradient(colors: [Color(0xFF0AA2D1), Color(0xFF0077C8)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDoctorScreen())),
              ),
              const SizedBox(height: 14),
              _buildFeatureCard(
                icon: Icons.medication_outlined, title: 'Danh mục thuốc',
                subtitle: 'Quản lý danh mục thuốc nhãn khoa trong hệ thống',
                gradient: const LinearGradient(colors: [Color(0xFF22C55E), Color(0xFF15803D)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdminDrugScreen())),
              ),
              const SizedBox(height: 24),
              // Nút Đăng xuất
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showLogoutDialog(context),
                  icon: const Icon(Icons.logout, size: 20),
                  label: const Text('Đăng xuất', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red, width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ]),
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Bảng điều khiển Admin',
      sidebar: const AdminSidebar(activeMenu: 'Tổng quan'),
      body: content,
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: iconColor.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 2),
              Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required LinearGradient gradient,
    required VoidCallback onTap,
  }) {
    return Container(
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(gradient: gradient, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: Colors.white, size: 30),
          const SizedBox(height: 16),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          const SizedBox(height: 6),
          Text(subtitle, style: const TextStyle(fontSize: 13, color: Colors.white70, height: 1.5)),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withOpacity(0.4)),
              ),
              child: const Text('Vào quản lý →',
                  style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
            ),
          ),
        ],
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.logout, color: Colors.red, size: 24),
            SizedBox(width: 10),
            Text('Đăng xuất', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: const Text('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
            style: TextStyle(fontSize: 14, color: Color(0xFF64748B))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Huỷ', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
              Navigator.of(context).pushReplacementNamed('/');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}
