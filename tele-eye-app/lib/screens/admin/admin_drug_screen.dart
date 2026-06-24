// lib/screens/admin/admin_drug_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/admin_provider.dart';
import '../../widgets/admin_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class AdminDrugScreen extends StatefulWidget {
  const AdminDrugScreen({super.key});

  @override
  State<AdminDrugScreen> createState() => _AdminDrugScreenState();
}

class _AdminDrugScreenState extends State<AdminDrugScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<AdminProvider>().loadDrugs());
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final adminProvider = context.watch<AdminProvider>();
    final allDrugs = adminProvider.drugs;
    final filtered = _searchQuery.isEmpty
        ? allDrugs
        : allDrugs.where((d) {
            final name = (d['name'] ?? '').toString().toLowerCase();
            final ingredient = (d['active_ingredient'] ?? '').toString().toLowerCase();
            return name.contains(_searchQuery) || ingredient.contains(_searchQuery);
          }).toList();

    final content = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Danh mục thuốc', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                Text('${allDrugs.length} loại thuốc', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ]),
              ElevatedButton.icon(
                onPressed: () => _showDrugDialog(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Thêm', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
              ),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: _searchController,
              onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
              decoration: InputDecoration(
                hintText: 'Tìm thuốc...', hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
                filled: true, fillColor: Colors.white,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
            const SizedBox(height: 12),
          ]),
        ),
        Expanded(child: _buildTable(adminProvider, filtered)),
      ],
    );

    return ResponsiveScaffold(
      title: 'Danh mục thuốc',
      sidebar: const AdminSidebar(activeMenu: 'Danh mục thuốc'),
      showBackButton: true,
      body: content,
    );
  }



  Widget _buildTable(AdminProvider provider, List<Map<String, dynamic>> filtered) {
    if (provider.loadingDrugs) return const Center(child: CircularProgressIndicator(color: brandCyan));
    if (provider.drugError != null) return Center(child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(provider.drugError!, style: const TextStyle(color: Colors.red)),
        const SizedBox(height: 12),
        TextButton(onPressed: () => context.read<AdminProvider>().loadDrugs(), child: const Text('Thử lại')),
      ],
    ));
    if (filtered.isEmpty) return const Center(child: Text('Không có thuốc nào', style: TextStyle(color: Color(0xFF94A3B8))));

    // Mobile card layout (always - mobile app)
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, i) => _buildMobileCard(filtered[i]),
    );
  }


  Widget _buildMobileCard(Map<String, dynamic> drug) {
    final name = drug['name']?.toString() ?? '';
    final ingredient = drug['active_ingredient']?.toString() ?? '';
    final unit = drug['unit']?.toString() ?? 'Lọ';
    final isActive = drug['is_active'] != false;
    final id = drug['id'] ?? drug['drug_id'];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2))],
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Icon
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(color: const Color(0xFFD1FAE5), borderRadius: BorderRadius.circular(10)),
          alignment: Alignment.center,
          child: const Icon(Icons.medication_outlined, color: Color(0xFF059669), size: 20),
        ),
        const SizedBox(width: 12),
        // Info
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)), maxLines: 2, overflow: TextOverflow.ellipsis),
          if (ingredient.isNotEmpty) ...[
            const SizedBox(height: 3),
            Text(ingredient, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)), maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 4, children: [
            // Đơn vị badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
              child: Text(unit, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: Color(0xFF475569))),
            ),
            // Trạng thái badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFFD1FAE5) : const Color(0xFFFFE4E6),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.circle, size: 6, color: isActive ? const Color(0xFF059669) : Colors.red),
                const SizedBox(width: 4),
                Text(isActive ? 'Hoạt động' : 'Dừng dùng',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: isActive ? const Color(0xFF047857) : Colors.red)),
              ]),
            ),
          ]),
        ])),
        // Actions
        Column(children: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFF64748B)),
            tooltip: 'Sửa', padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            onPressed: () => _showDrugDialog(context, drug: drug),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
            tooltip: 'Xoá', padding: EdgeInsets.zero, constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            onPressed: () => _confirmDelete(context, id, name),
          ),
        ]),
      ]),
    );
  }


  void _showDrugDialog(BuildContext context, {Map<String, dynamic>? drug}) {
    final isEdit = drug != null;
    final nameCtrl = TextEditingController(text: drug?['name']?.toString() ?? '');
    final ingredientCtrl = TextEditingController(text: drug?['active_ingredient']?.toString() ?? '');
    final unitCtrl = TextEditingController(text: drug?['unit']?.toString() ?? '');
    bool saving = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setS) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 440),
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(isEdit ? 'Chỉnh sửa thuốc' : 'Thêm thuốc mới',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                const SizedBox(height: 22),
                _dialogField('Tên thuốc *', nameCtrl, hint: 'VD: Cravit 0.5% 5ml'),
                const SizedBox(height: 14),
                _dialogField('Hoạt chất', ingredientCtrl, hint: 'VD: Levofloxacin 0.5%'),
                const SizedBox(height: 14),
                _dialogField('Đơn vị', unitCtrl, hint: 'VD: Lọ, Viên, Hộp'),
                const SizedBox(height: 26),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(onPressed: () => Navigator.pop(ctx),
                        child: const Text('Huỷ', style: TextStyle(color: Color(0xFF64748B)))),
                    const SizedBox(width: 12),
                    ElevatedButton(
                      onPressed: saving ? null : () async {
                        if (nameCtrl.text.trim().isEmpty) return;
                        setS(() => saving = true);
                        try {
                          final adminProvider = context.read<AdminProvider>();
                          if (isEdit) {
                            await adminProvider.updateDrug(
                              drug['id'] ?? drug['drug_id'],
                              {'name': nameCtrl.text.trim(), 'active_ingredient': ingredientCtrl.text.trim(), 'unit': unitCtrl.text.trim()},
                            );
                          } else {
                            await adminProvider.createDrug(
                              name: nameCtrl.text.trim(),
                              activeIngredient: ingredientCtrl.text.trim(),
                              unit: unitCtrl.text.trim(),
                            );
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(isEdit ? 'Cập nhật thành công!' : 'Thêm thuốc thành công!'), backgroundColor: Colors.green),
                          );
                        } catch (e) {
                          setS(() => saving = false);
                          if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
                          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      child: saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Text(isEdit ? 'Lưu' : 'Thêm thuốc', style: const TextStyle(fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      )),
    );
  }

  Widget _dialogField(String label, TextEditingController ctrl, {String? hint}) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
      const SizedBox(height: 6),
      TextField(controller: ctrl, style: const TextStyle(fontSize: 14),
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

  void _confirmDelete(BuildContext context, dynamic id, String name) {
    showDialog(context: context, builder: (_) => AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      title: const Text('Xác nhận xoá', style: TextStyle(fontWeight: FontWeight.bold)),
      content: Text('Bạn có chắc muốn xoá thuốc "$name"?'),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context),
            child: const Text('Huỷ', style: TextStyle(color: Color(0xFF64748B)))),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(context);
            try {
              await context.read<AdminProvider>().deleteDrug(id is int ? id : int.parse(id.toString()));
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Đã xoá thuốc'), backgroundColor: Colors.green),
              );
            } catch (e) {
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Lỗi xoá: $e'), backgroundColor: Colors.red),
              );
            }
          },
          style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
          child: const Text('Xoá'),
        ),
      ],
    ));
  }
}
