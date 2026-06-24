// lib/screens/booking/doctor_list_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../providers/doctor_provider.dart';
import '../../models/doctor_model.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import 'doctor_detail_screen.dart';

class DoctorListScreen extends StatefulWidget {
  const DoctorListScreen({super.key});

  @override
  State<DoctorListScreen> createState() => _DoctorListScreenState();
}

class _DoctorListScreenState extends State<DoctorListScreen> {
  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');

  @override
  void initState() {
    super.initState();
    // Fetch dữ liệu khi vừa mở màn hình
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<DoctorProvider>().loadDoctors();
    });
  }

  @override
  Widget build(BuildContext context) {
    const Color brandCyan = Color(0xFF0AA2D1);
    
    final doctorProvider = context.watch<DoctorProvider>();

    final content = Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Chọn bác sĩ khám mắt', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            const SizedBox(height: 4),
            const Text('Tìm chuyên gia phù hợp với nhu cầu của bạn', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
            const SizedBox(height: 12),
            TextField(
              decoration: InputDecoration(
                hintText: 'Tìm theo tên bác sĩ hoặc chuyên khoa...',
                hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF94A3B8), size: 18),
                filled: true, fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 12),
          ]),
        ),
        Expanded(
          child: doctorProvider.isLoading
              ? const Center(child: CircularProgressIndicator(color: brandCyan))
              : doctorProvider.doctors.isEmpty
                  ? const Center(child: Text('Không tìm thấy bác sĩ nào', style: TextStyle(color: Colors.grey)))
                  : LayoutBuilder(builder: (ctx, constraints) {
                      final wide = constraints.maxWidth >= 700;
                      if (wide) {
                        return GridView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2, mainAxisExtent: 210, crossAxisSpacing: 16, mainAxisSpacing: 16,
                          ),
                          itemCount: doctorProvider.doctors.length,
                          itemBuilder: (_, i) => _buildDoctorCard(doctorProvider.doctors[i], brandCyan),
                        );
                      }
                      return ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                        itemCount: doctorProvider.doctors.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, i) => _buildDoctorCardMobile(doctorProvider.doctors[i], brandCyan),
                      );
                    }),
        ),
      ],
    );

    return ResponsiveScaffold(
      title: 'Chọn bác sĩ',
      sidebar: const AppSidebar(activeMenu: 'Đặt lịch khám'),
      showBackButton: false,
      body: content,
    );
  }



  // Widget Helper: Thẻ Bác sĩ
  Widget _buildDoctorCard(DoctorModel doc, Color brandCyan) {
    // Lấy chữ cái đầu của tên làm avatar giả nếu avatarUrl null
    final String initial = doc.fullName.isNotEmpty ? doc.fullName.replaceAll('Dr. ', '')[0].toUpperCase() : 'B';
    
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Avatar + Info
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: brandCyan.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0288D1),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc.fullName,
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      doc.title ?? 'Bác sĩ chuyên khoa',
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(children: [
                      const Icon(Icons.star, color: Color(0xFFF59E0B), size: 12),
                      const SizedBox(width: 3),
                      const Flexible(child: Text('4.9', style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w500))),
                    ]),
                  ],
                ),
              )
            ],
          ),
          const SizedBox(height: 16),
          
          // Chuyên khoa (Chips)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: doc.specializations.take(2).map((spec) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFE0F2FE), // Light blue bg
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                spec,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF0369A1), // Dark blue text
                ),
              ),
            )).toList(),
          ),
          
          const Spacer(),
          const Divider(color: Color(0xFFF1F5F9)),
          const SizedBox(height: 8),
          
          // Footer: Giá + Nút Chọn
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Phí khám',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF94A3B8),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    currencyFormatter.format(doc.consultationFee),
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: brandCyan,
                    ),
                  ),
                ],
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => DoctorDetailScreen(doctor: doc)),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: brandCyan,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 0),
                  minimumSize: const Size(60, 36),
                ),
                child: const Text('Chọn', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          )
        ],
      ),
    );
  }

  // ── MOBILE card: list layout, 1 cột, không giới hạn chiều cao ──
  Widget _buildDoctorCardMobile(DoctorModel doc, Color brandCyan) {
    final String initial = doc.fullName.isNotEmpty
        ? doc.fullName.replaceAll('BS. ', '').replaceAll('Dr. ', '')[0].toUpperCase()
        : 'B';
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => DoctorDetailScreen(doctor: doc))),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Avatar
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: brandCyan.withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              alignment: Alignment.center,
              child: Text(initial, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0288D1))),
            ),
            const SizedBox(width: 12),
            // Info (Expanded = tự co)
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(doc.fullName,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 2),
                  Text(doc.title ?? 'Bác sĩ chuyên khoa',
                      style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                      maxLines: 2, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Wrap(spacing: 6, runSpacing: 4,
                    children: doc.specializations.take(2).map((s) => Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFFE0F2FE), borderRadius: BorderRadius.circular(16)),
                      child: Text(s, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF0369A1)),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                    )).toList(),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            // Giá + Chọn
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(currencyFormatter.format(doc.consultationFee),
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: brandCyan)),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: brandCyan, borderRadius: BorderRadius.circular(8)),
                  child: const Text('Chọn', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

}
