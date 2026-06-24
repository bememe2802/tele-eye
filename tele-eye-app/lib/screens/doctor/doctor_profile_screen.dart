// lib/screens/doctor/doctor_profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/doctor_dashboard_provider.dart';
import '../../widgets/doctor_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class DoctorProfileScreen extends StatefulWidget {
  const DoctorProfileScreen({super.key});
  @override
  State<DoctorProfileScreen> createState() => _DoctorProfileScreenState();
}

class _DoctorProfileScreenState extends State<DoctorProfileScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final _phoneCtrl = TextEditingController();
  final _bioCtrl = TextEditingController();
  final _expCtrl = TextEditingController();
  final _avatarCtrl = TextEditingController();
  bool _saving = false;
  bool _prefilled = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<DoctorDashboardProvider>().loadProfile());
  }

  @override
  void dispose() {
    _phoneCtrl.dispose(); _bioCtrl.dispose(); _expCtrl.dispose(); _avatarCtrl.dispose();
    super.dispose();
  }

  void _prefillFromProvider(Map<String, dynamic> profile) {
    if (_prefilled) return;
    _prefilled = true;
    _phoneCtrl.text = profile['phone_number']?.toString() ?? '';
    _bioCtrl.text = profile['bio']?.toString() ?? '';
    _expCtrl.text = profile['experience_years']?.toString() ?? ''; // ✅ đúng field
    _avatarCtrl.text = profile['avatar_url']?.toString() ?? '';
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{};
      if (_phoneCtrl.text.isNotEmpty) body['phone_number'] = _phoneCtrl.text.trim();
      if (_bioCtrl.text.isNotEmpty) body['bio'] = _bioCtrl.text.trim();
      if (_expCtrl.text.isNotEmpty) body['experience_years'] = int.tryParse(_expCtrl.text.trim()) ?? 0; // ✅ đúng field
      if (_avatarCtrl.text.isNotEmpty) body['avatar_url'] = _avatarCtrl.text.trim();
      await context.read<DoctorDashboardProvider>().updateProfile(body);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cập nhật thành công!'), backgroundColor: Colors.green),
      );
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
    final auth = context.watch<AuthProvider>();
    final provider = context.watch<DoctorDashboardProvider>();
    final user = auth.currentUser;
    final initial = (user?.fullName ?? user?.email ?? 'D')[0].toUpperCase();

    if (provider.profile != null) _prefillFromProvider(provider.profile!);

    final content = SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (provider.loadingProfile)
            const Center(child: CircularProgressIndicator(color: brandCyan))
          else
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFE2E8F0))),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  CircleAvatar(backgroundColor: const Color(0xFF22C55E), radius: 28,
                      child: Text(initial, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))),
                  const SizedBox(width: 14),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(user?.fullName ?? 'Bác sĩ', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)), overflow: TextOverflow.ellipsis),
                    Text(user?.email ?? '', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ])),
                ]),
                const SizedBox(height: 20),
                const Divider(color: Color(0xFFE2E8F0)),
                const SizedBox(height: 16),
                const Row(children: [
                  Icon(Icons.person_pin_outlined, color: brandCyan, size: 18),
                  SizedBox(width: 8),
                  Text('Cập nhật thông tin', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                ]),
                const SizedBox(height: 16),
                _buildField('Số điện thoại', _phoneCtrl, hint: '0901234567', keyboardType: TextInputType.phone),
                const SizedBox(height: 14),
                _buildField('Giới thiệu bản thân', _bioCtrl, hint: 'Mô tả kinh nghiệm và chuyên môn...', maxLines: 4),
                const SizedBox(height: 14),
                _buildField('Số năm kinh nghiệm', _expCtrl, hint: '10', keyboardType: TextInputType.number),
                const SizedBox(height: 14),
                _buildField('URL ảnh đại diện', _avatarCtrl, hint: 'https://...'),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.save_outlined, size: 18),
                    label: Text(_saving ? 'Đang lưu...' : 'Lưu thay đổi', style: const TextStyle(fontWeight: FontWeight.w600)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ]),
            ),
          const SizedBox(height: 20),
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
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Hồ sơ bác sĩ',
      sidebar: const DoctorSidebar(activeMenu: 'Hồ sơ bác sĩ'),
      // showBackButton chỉ dùng khi push route, không dùng trong IndexedStack
      body: content,
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, {String? hint, int maxLines = 1, TextInputType? keyboardType}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
      const SizedBox(height: 6),
      TextField(
        controller: ctrl, maxLines: maxLines, keyboardType: keyboardType, style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          hintText: hint, hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          filled: true, fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: brandCyan, width: 1.5)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        ),
      ),
    ]);
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
        content: const Text('Bạn có chắc chắn muốn đăng xuất?',
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
