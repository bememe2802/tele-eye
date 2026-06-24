// lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/profile_service.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  final VoidCallback? onBack;
  const ProfileScreen({super.key, this.onBack});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final _nameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _avatarUrlCtrl = TextEditingController();
  final _dobCtrl = TextEditingController();
  String _selectedGender = 'Nam';
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadProfile());
  }

  void _loadProfile() {
    final user = context.read<AuthProvider>().currentUser;
    if (user != null) {
      _nameCtrl.text = user.fullName ?? '';
      _phoneCtrl.text = user.phoneNumber ?? '';
      _addressCtrl.text = user.address ?? '';
      _avatarUrlCtrl.text = user.avatarUrl ?? '';
      _dobCtrl.text = user.dateOfBirth ?? '';
      if (user.gender != null) {
        if (user.gender == 'MALE' || user.gender == 'Nam') {
          _selectedGender = 'Nam';
        } else if (user.gender == 'FEMALE' || user.gender == 'Nữ') {
          _selectedGender = 'Nữ';
        } else {
          _selectedGender = 'Khác';
        }
      }
      setState(() {});
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSaving = true);
    try {
      final profileService = ProfileService();
      String? genderValue;
      if (_selectedGender == 'Nam') genderValue = 'MALE';
      else if (_selectedGender == 'Nữ') genderValue = 'FEMALE';
      else genderValue = 'OTHER';

      await profileService.updateMyProfile(
        fullName: _nameCtrl.text.isNotEmpty ? _nameCtrl.text : null,
        phoneNumber: _phoneCtrl.text.isNotEmpty ? _phoneCtrl.text : null,
        gender: genderValue,
        address: _addressCtrl.text.isNotEmpty ? _addressCtrl.text : null,
        dateOfBirth: _dobCtrl.text.isNotEmpty ? _dobCtrl.text : null,
        avatarUrl: _avatarUrlCtrl.text.isNotEmpty ? _avatarUrlCtrl.text : null,
      );

      // Reload profile trong AuthProvider
      if (mounted) {
        await context.read<AuthProvider>().loadUserProfile();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật hồ sơ thành công!'), backgroundColor: Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2000, 1, 1),
      firstDate: DateTime(1940),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        // Gửi lên backend theo format yyyy-MM-dd (ISO)
        _dobCtrl.text = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  void _confirmLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Bạn có chắc muốn đăng xuất khỏi tài khoản?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Huỷ', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              await context.read<AuthProvider>().logout();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _avatarUrlCtrl.dispose();
    _dobCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.currentUser;
    final String displayName = user?.fullName ?? user?.email.split('@')[0] ?? 'Khách';
    final String displayEmail = user?.email ?? '';
    final String displayAvatar = displayName.isNotEmpty ? displayName[0].toUpperCase() : 'U';

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final bodyContent = SingleChildScrollView(
      padding: EdgeInsets.all(isTablet ? 40 : 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (isTablet) ...[const Text('Hồ sơ cá nhân', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))), const SizedBox(height: 24)],
          if (isTablet)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(width: 280, child: _avatarCard(displayAvatar, displayName, displayEmail)),
                const SizedBox(width: 24),
                Expanded(child: _formCard()),
              ],
            )
          else
            Column(children: [
              _avatarCard(displayAvatar, displayName, displayEmail),
              const SizedBox(height: 16),
              _formCard(),
              const SizedBox(height: 80),
            ]),
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Hồ sơ cá nhân',
      sidebar: const AppSidebar(activeMenu: 'Hồ sơ cá nhân'),
      showBackButton: widget.onBack != null,
      onBack: widget.onBack,
      body: bodyContent,
    );
  }

  Widget _avatarCard(String avatar, String name, String email) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(children: [
        CircleAvatar(
          radius: 40, backgroundColor: brandCyan,
          child: Text(avatar, style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
        ),
        const SizedBox(height: 12),
        Text(name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 4),
        Text(email, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(20)),
          child: const Text('Bệnh nhân', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857))),
        ),
        const SizedBox(height: 16),
        const Divider(color: Color(0xFFE2E8F0)),
        const SizedBox(height: 8),
        const Align(alignment: Alignment.centerLeft, child: Text('URL ảnh đại diện', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)))),
        const SizedBox(height: 6),
        TextField(
          controller: _avatarUrlCtrl,
          style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          decoration: InputDecoration(
            hintText: 'https://...', isDense: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          ),
        ),
      ]),
    );
  }

  Widget _formCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white, borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Thông tin cá nhân', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 16),
        _formField('Họ và tên *', _nameCtrl, Icons.person_outline),
        const SizedBox(height: 14),
        _formField('Số điện thoại', _phoneCtrl, Icons.phone_outlined),
        const SizedBox(height: 14),
        _genderDropdown(),
        const SizedBox(height: 14),
        _dateField(),
        const SizedBox(height: 14),
        _formField('Địa chỉ', _addressCtrl, Icons.location_on_outlined),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _isSaving ? null : _saveProfile,
            icon: _isSaving
                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.save_outlined, size: 18),
            label: Text(_isSaving ? 'Đang lưu...' : 'Lưu thay đổi', style: const TextStyle(fontWeight: FontWeight.w600)),
            style: ElevatedButton.styleFrom(
              backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
        const SizedBox(height: 24),
        const Divider(color: Color(0xFFE2E8F0)),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () => _confirmLogout(),
            icon: const Icon(Icons.logout, size: 18),
            label: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.w600)),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFDC2626),
              side: const BorderSide(color: Color(0xFFFCA5A5)),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      ]),
    );
  }

  Widget _formField(String label, TextEditingController ctrl, IconData icon) {

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ]),
      const SizedBox(height: 8),
      TextField(
        controller: ctrl,
        decoration: InputDecoration(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    ]);
  }

  Widget _genderDropdown() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [
        Icon(Icons.wc_outlined, size: 16, color: Color(0xFF94A3B8)),
        SizedBox(width: 6),
        Text('Giới tính', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ]),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        value: _selectedGender,
        items: ['Nam', 'Nữ', 'Khác'].map((g) => DropdownMenuItem(value: g, child: Text(g))).toList(),
        onChanged: (v) => setState(() => _selectedGender = v ?? 'Nam'),
        decoration: InputDecoration(
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    ]);
  }

  Widget _dateField() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [
        Icon(Icons.calendar_today_outlined, size: 16, color: Color(0xFF94A3B8)),
        SizedBox(width: 6),
        Text('Ngày sinh', style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
      ]),
      const SizedBox(height: 8),
      TextField(
        controller: _dobCtrl,
        readOnly: true,
        onTap: _pickDate,
        decoration: InputDecoration(
          suffixIcon: const Icon(Icons.calendar_today, size: 18, color: Color(0xFF94A3B8)),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    ]);
  }
}
