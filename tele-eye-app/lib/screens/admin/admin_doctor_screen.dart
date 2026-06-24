// lib/screens/admin/admin_doctor_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../models/doctor_model.dart';
import '../../providers/admin_provider.dart';
import '../../widgets/admin_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class AdminDoctorScreen extends StatefulWidget {
  const AdminDoctorScreen({super.key});

  @override
  State<AdminDoctorScreen> createState() => _AdminDoctorScreenState();
}

class _AdminDoctorScreenState extends State<AdminDoctorScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final _searchController = TextEditingController();
  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<AdminProvider>().loadDoctors());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final adminProvider = context.watch<AdminProvider>();
    final allDoctors = adminProvider.doctors;
    final filtered = _searchQuery.isEmpty
        ? allDoctors
        : allDoctors.where((d) =>
            d.fullName.toLowerCase().contains(_searchQuery) ||
            d.specializations.any((s) => s.toLowerCase().contains(_searchQuery))).toList();

    final content = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Quản lý bác sĩ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    Text('${allDoctors.length} bác sĩ', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                  ]),
                  ElevatedButton.icon(
                    onPressed: () => _showCreateDialog(context),
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Thêm', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _searchController,
                onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
                decoration: InputDecoration(
                  hintText: 'Tìm theo tên hoặc chuyên khoa...',
                  hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
                  filled: true, fillColor: Colors.white,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
        Expanded(child: _buildList(adminProvider, filtered)),
      ],
    );

    return ResponsiveScaffold(
      title: 'Quản lý bác sĩ',
      sidebar: const AdminSidebar(activeMenu: 'Quản lý bác sĩ'),
      showBackButton: true,
      body: content,
    );
  }

  Widget _buildList(AdminProvider provider, List<DoctorModel> filtered) {
    if (provider.loadingDoctors) return const Center(child: CircularProgressIndicator(color: brandCyan));
    if (provider.doctorError != null) return Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(provider.doctorError!, style: const TextStyle(color: Colors.red)),
        const SizedBox(height: 12),
        TextButton(onPressed: () => context.read<AdminProvider>().loadDoctors(), child: const Text('Thử lại')),
      ],
    ));
    if (filtered.isEmpty) return const Center(child: Text('Không có bác sĩ nào', style: TextStyle(color: Color(0xFF94A3B8))));

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, i) {
        final doc = filtered[i];
        final initial = doc.fullName.isNotEmpty ? doc.fullName[0].toUpperCase() : 'B';
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFE2E8F0))),
          child: Row(children: [
            CircleAvatar(backgroundColor: brandCyan, radius: 22,
              child: Text(initial, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(doc.fullName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
              Text(doc.specializations.join(', '), style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              Text(currencyFormatter.format(doc.consultationFee), style: const TextStyle(fontSize: 12, color: Color(0xFF0AA2D1), fontWeight: FontWeight.w500)),
            ])),
            IconButton(
              icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF64748B)),
              onPressed: () => _showEditDialog(context, doc),
              padding: EdgeInsets.zero, constraints: const BoxConstraints(),
            ),
          ]),
        );
      },
    );
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(context: context, builder: (_) => _DoctorFormDialog(
      onSave: (data) async {
        await context.read<AdminProvider>().createDoctor(
          email: data['email']!,
          password: data['password']!,
          fullName: data['fullName']!,
          title: data['title'],
          licenseNumber: data['licenseNumber'],
          consultationFee: int.tryParse(data['fee'] ?? '0') ?? 0,
        );
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Tạo bác sĩ thành công!'), backgroundColor: Colors.green),
        );
      },
    ));
  }

  void _showEditDialog(BuildContext context, DoctorModel doc) {
    showDialog(context: context, builder: (_) => _DoctorFormDialog(
      doctor: doc,
      onSave: (data) async {
        final body = <String, dynamic>{};
        if ((data['fullName'] ?? '').isNotEmpty) body['full_name'] = data['fullName'];
        if ((data['title'] ?? '').isNotEmpty) body['title'] = data['title'];
        if ((data['licenseNumber'] ?? '').isNotEmpty) body['license_number'] = data['licenseNumber'];
        if ((data['fee'] ?? '').isNotEmpty) body['consultation_fee'] = int.tryParse(data['fee']!) ?? 0;
        await context.read<AdminProvider>().updateDoctor(doc.id, body);
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật thành công!'), backgroundColor: Colors.green),
        );
      },
    ));
  }
}

// ===================== FORM DIALOG =====================
class _DoctorFormDialog extends StatefulWidget {
  final DoctorModel? doctor;
  final Future<void> Function(Map<String, String?> data) onSave;
  const _DoctorFormDialog({this.doctor, required this.onSave});

  @override
  State<_DoctorFormDialog> createState() => _DoctorFormDialogState();
}

class _DoctorFormDialogState extends State<_DoctorFormDialog> {
  static const Color brandCyan = Color(0xFF0AA2D1);
  late final TextEditingController _nameCtrl, _emailCtrl, _passwordCtrl, _titleCtrl, _licenseCtrl, _feeCtrl;
  bool _saving = false;
  bool get isEdit => widget.doctor != null;

  @override
  void initState() {
    super.initState();
    final d = widget.doctor;
    _nameCtrl = TextEditingController(text: d?.fullName ?? '');
    _emailCtrl = TextEditingController();
    _passwordCtrl = TextEditingController();
    _titleCtrl = TextEditingController(text: d?.title ?? '');
    _licenseCtrl = TextEditingController(text: d?.licenseNumber ?? '');
    _feeCtrl = TextEditingController(text: d != null ? '${d.consultationFee}' : '');
  }

  @override
  void dispose() {
    for (final c in [_nameCtrl, _emailCtrl, _passwordCtrl, _titleCtrl, _licenseCtrl, _feeCtrl]) c.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_nameCtrl.text.trim().isEmpty) return;
    if (!isEdit && (_emailCtrl.text.trim().isEmpty || _passwordCtrl.text.isEmpty)) return;
    setState(() => _saving = true);
    try {
      await widget.onSave({
        'fullName': _nameCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
        'password': _passwordCtrl.text,
        'title': _titleCtrl.text.trim(),
        'licenseNumber': _licenseCtrl.text.trim(),
        'fee': _feeCtrl.text.trim(),
      });
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(isEdit ? 'Chỉnh sửa bác sĩ' : 'Tạo bác sĩ mới',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 24),
              _field('Họ và tên *', _nameCtrl, hint: 'BS. Nguyễn Văn A'),
              const SizedBox(height: 14),
              if (!isEdit) ...[
                Row(children: [
                  Expanded(child: _field('Email *', _emailCtrl, hint: 'doctor@example.com')),
                  const SizedBox(width: 14),
                  Expanded(child: _field('Mật khẩu *', _passwordCtrl, obscure: true)),
                ]),
                const SizedBox(height: 14),
              ],
              Row(children: [
                Expanded(child: _field('Chức danh', _titleCtrl, hint: 'VD: ThS.BS')),
                const SizedBox(width: 14),
                Expanded(child: _field('Số CCHN', _licenseCtrl, hint: 'CCHN-123456')),
              ]),
              const SizedBox(height: 14),
              _field('Phí khám (VNĐ) *', _feeCtrl, hint: '500000', keyboardType: TextInputType.number),
              const SizedBox(height: 28),
              Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                TextButton(onPressed: () => Navigator.pop(context),
                    child: const Text('Huỷ', style: TextStyle(color: Color(0xFF64748B)))),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 13),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                  child: _saving
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(isEdit ? 'Lưu thay đổi' : 'Tạo bác sĩ', style: const TextStyle(fontWeight: FontWeight.w600)),
                ),
              ]),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController ctrl, {String? hint, bool obscure = false, TextInputType? keyboardType}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
      const SizedBox(height: 6),
      TextField(controller: ctrl, obscureText: obscure, keyboardType: keyboardType, style: const TextStyle(fontSize: 14),
        decoration: InputDecoration(
          hintText: hint, hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
          filled: true, fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: brandCyan, width: 1.5)),
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        )),
    ]);
  }
}
