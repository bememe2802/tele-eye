// lib/screens/booking/book_appointment_screen.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/doctor_model.dart';
import '../../services/booking_service.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';
import 'my_appointments_screen.dart';
import 'payment_qr_screen.dart';

class BookAppointmentScreen extends StatefulWidget {
  final DoctorModel doctor;
  const BookAppointmentScreen({super.key, required this.doctor});

  @override
  State<BookAppointmentScreen> createState() => _BookAppointmentScreenState();
}

class _BookAppointmentScreenState extends State<BookAppointmentScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final BookingService _bookingService = BookingService();
  final _descriptionController = TextEditingController();
  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');

  DateTime _selectedDate = DateTime.now().add(const Duration(days: 1));
  Map<String, dynamic>? _selectedSlot;
  List<Map<String, dynamic>> _slots = [];
  bool _loadingSlots = false;
  bool _submitting = false;
  String? _slotError;

  @override
  void initState() {
    super.initState();
    _fetchSlots();
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _fetchSlots() async {
    setState(() { _loadingSlots = true; _slotError = null; _selectedSlot = null; });
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final slots = await _bookingService.getAvailableSlots(
        date: dateStr,
        doctorId: widget.doctor.id,
      );
      setState(() { _slots = slots; _loadingSlots = false; });
    } catch (e) {
      setState(() { _slotError = e.toString(); _loadingSlots = false; _slots = []; });
    }
  }

  Future<void> _handleBook() async {
   if (_selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn giờ khám'), backgroundColor: Colors.orange),
      );
      return;
    }

    final desc = _descriptionController.text.trim();
    if (desc.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập triệu chứng / lý do khám'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final slotId = _selectedSlot!['slot_id'] ?? _selectedSlot!['id'];

      // Bước 1: Lock slot (giữ chỗ tạm thời 15 phút)
      await _bookingService.lockSlot(slotId);

      // Bước 2: Tạo appointment → nhận payment_url
      final result = await _bookingService.createAppointment(
        slotId: slotId,
        description: desc,
      );

      if (!mounted) return;
      setState(() => _submitting = false);

      final appointmentId = result['appointment_id'] as int? ?? 0;
      final slotPrice = double.tryParse(_selectedSlot!['price'].toString()) ?? 0.0;

      // Bước 3: Mở màn hình thanh toán bằng mã QR SePay
      final paymentSuccess = await Navigator.push<bool>(
        context,
        MaterialPageRoute(
          builder: (_) => PaymentQRScreen(
            appointmentId: appointmentId,
            amount: slotPrice,
          ),
        ),
      );

      if (!mounted) return;
      if (paymentSuccess == true) {
        _showSuccessDialog();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Thanh toán chưa hoàn tất. Lịch hẹn đang chờ thanh toán.'),
            backgroundColor: Colors.orange,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
      );
    }
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(color: const Color(0xFFD1FAE5), shape: BoxShape.circle),
                child: const Icon(Icons.check, color: Color(0xFF059669), size: 40),
              ),
              const SizedBox(height: 20),
              const Text('Đặt lịch thành công!',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 10),
              Text(
                'Lịch khám với ${widget.doctor.fullName} đã được xác nhận.',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pop(context);
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(builder: (_) => const MyAppointmentsScreen()),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: brandCyan, foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Xem lịch hẹn', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final String initial = widget.doctor.fullName.isNotEmpty
        ? widget.doctor.fullName.replaceAll('Dr. ', '').replaceAll('BS. ', '')[0].toUpperCase()
        : 'B';

    final isTablet = MediaQuery.of(context).size.width >= 700;

    final leftSection = Column(children: [
      _buildCard(title: 'Chọn ngày khám', icon: Icons.calendar_month, child: _buildDatePicker()),
      const SizedBox(height: 16),
      _buildCard(title: 'Chọn giờ khám', icon: Icons.access_time, child: _buildSlotPicker()),
      const SizedBox(height: 16),
      _buildCard(
        title: 'Triệu chứng (tuỳ chọn)',
        icon: Icons.edit_note,
        child: TextField(
          controller: _descriptionController, maxLines: 4,
          style: const TextStyle(fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Mô tả triệu chứng hoặc lý do khám...',
            hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            filled: true, fillColor: const Color(0xFFF8FAFC),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: brandCyan, width: 1.5)),
          ),
        ),
      ),
    ]);

    final summaryCard = _buildCard(
      title: 'Tóm tắt lịch hẹn',
      icon: Icons.receipt_long_outlined,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: brandCyan.withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
            alignment: Alignment.center,
            child: Text(initial, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: brandCyan)),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.doctor.fullName, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            Text(widget.doctor.title ?? 'Bác sĩ chuyên khoa', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
          ])),
        ]),
        const SizedBox(height: 16),
        const Divider(color: Color(0xFFF1F5F9)),
        const SizedBox(height: 12),
        _buildSummaryRow(Icons.calendar_today_outlined, 'Ngày khám', DateFormat('dd/MM/yyyy (EEEE)', 'vi').format(_selectedDate)),
        const SizedBox(height: 10),
        _buildSummaryRow(Icons.access_time, 'Giờ khám', _selectedSlot != null ? '${_selectedSlot!['start_time'] ?? '—'} – ${_selectedSlot!['end_time'] ?? ''}' : 'Chưa chọn'),
        const SizedBox(height: 16),
        const Divider(color: Color(0xFFF1F5F9)),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Phí khám', style: TextStyle(fontSize: 14, color: Color(0xFF475569))),
          Text(currencyFormatter.format(widget.doctor.consultationFee), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: brandCyan)),
        ]),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _submitting ? null : _handleBook,
          style: ElevatedButton.styleFrom(
            backgroundColor: brandCyan, foregroundColor: Colors.white, elevation: 0,
            padding: const EdgeInsets.symmetric(vertical: 15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
          child: _submitting
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : const Text('Xác nhận đặt lịch', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
        )),
      ]),
    );

    final content = SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Đặt lịch khám', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        const SizedBox(height: 16),
        if (isTablet)
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(flex: 3, child: leftSection),
            const SizedBox(width: 20),
            Expanded(flex: 2, child: summaryCard),
          ])
        else
          Column(children: [leftSection, const SizedBox(height: 16), summaryCard]),
      ]),
    );

    return ResponsiveScaffold(
      title: 'Đặt lịch khám',
      sidebar: const AppSidebar(activeMenu: 'Đặt lịch khám'),
      showBackButton: true,
      body: content,
    );
  }

  Widget _buildDatePicker() {
    final now = DateTime.now();
    return SizedBox(
      height: 52,
      child: OutlinedButton.icon(
        onPressed: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: _selectedDate,
            firstDate: now.add(const Duration(days: 1)),
            lastDate: now.add(const Duration(days: 60)),
            locale: const Locale('vi', 'VN'),
            builder: (ctx, child) => Theme(
              data: Theme.of(ctx).copyWith(
                colorScheme: const ColorScheme.light(primary: brandCyan),
              ),
              child: child!,
            ),
          );
          if (picked != null && picked != _selectedDate) {
            setState(() => _selectedDate = picked);
            _fetchSlots();
          }
        },
        icon: const Icon(Icons.calendar_today_outlined, size: 18, color: brandCyan),
        label: Text(
          DateFormat('EEEE, dd/MM/yyyy', 'vi').format(_selectedDate),
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B)),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFE2E8F0)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          backgroundColor: const Color(0xFFF8FAFC),
          alignment: Alignment.centerLeft,
          padding: const EdgeInsets.symmetric(horizontal: 16),
        ),
      ),
    );
  }

  Widget _buildSlotPicker() {
    if (_loadingSlots) {
      return const Center(child: Padding(
        padding: EdgeInsets.all(16),
        child: CircularProgressIndicator(color: brandCyan, strokeWidth: 2),
      ));
    }
    if (_slotError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Text('Không thể tải slot: $_slotError', style: const TextStyle(color: Colors.red, fontSize: 13)),
        ),
      );
    }
    if (_slots.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('Không có lịch trống cho ngày này', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
        ),
      );
    }

    return Wrap(
      spacing: 10, runSpacing: 10,
      children: _slots.map((slot) {
        final isSelected = _selectedSlot?['slot_id'] == slot['slot_id'] ||
            _selectedSlot?['id'] == slot['id'];
        final startTime = slot['start_time']?.toString() ?? '—';
        return AnimatedScale(
          scale: isSelected ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => setState(() => _selectedSlot = slot),
              borderRadius: BorderRadius.circular(10),
              splashColor: brandCyan.withOpacity(0.2),
              highlightColor: brandCyan.withOpacity(0.1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? brandCyan : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: isSelected ? brandCyan : const Color(0xFFE2E8F0),
                    width: isSelected ? 1.5 : 1.0,
                  ),
                  boxShadow: isSelected
                      ? [BoxShadow(color: brandCyan.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                      : [],
                ),
                child: Text(
                  startTime,
                  style: TextStyle(
                    fontSize: 14, fontWeight: FontWeight.w600,
                    color: isSelected ? Colors.white : const Color(0xFF475569),
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: brandCyan, size: 18),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Color(0xFFF1F5F9)),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildSummaryRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: brandCyan),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
            ],
          ),
        ),
      ],
    );
  }
}

