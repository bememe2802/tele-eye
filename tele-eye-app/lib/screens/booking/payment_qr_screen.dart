import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../services/booking_service.dart';

class PaymentQRScreen extends StatefulWidget {
  final int appointmentId;
  final double amount;

  const PaymentQRScreen({
    super.key,
    required this.appointmentId,
    required this.amount,
  });

  @override
  State<PaymentQRScreen> createState() => _PaymentQRScreenState();
}

class _PaymentQRScreenState extends State<PaymentQRScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);
  final BookingService _bookingService = BookingService();

  static const String bankId = 'TPB';
  static const String accountNo = '28220051308';
  static const String accountName = 'NGUYEN HUYNH DUC';

  bool _isChecking = false;
  Timer? _pollingTimer;
  String? _copiedField;

  late final String transferContent;
  late final String qrUrl;

  final currencyFormatter = NumberFormat.currency(locale: 'vi_VN', symbol: '₫');

  @override
  void initState() {
    super.initState();
    transferContent = 'TELEEYE ${widget.appointmentId}';
    final amountInt = widget.amount.round();
    qrUrl = 'https://qr.sepay.vn/img?acc=$accountNo&bank=$bankId&amount=$amountInt&des=${Uri.encodeComponent(transferContent)}&template=compact&download=false';

    _startPolling();
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  void _startPolling() {
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      _checkPaymentStatus(manual: false);
    });
  }

  Future<void> _checkPaymentStatus({bool manual = true}) async {
    if (_isChecking) return;
    
    if (manual) {
      setState(() => _isChecking = true);
    }

    try {
      final response = await _bookingService.getPaymentStatus(widget.appointmentId);
      final isPaid = response['paid'] == true;
      
      if (!mounted) return;

      if (isPaid) {
        _pollingTimer?.cancel();
        Navigator.pop(context, true); // Success
      } else if (manual) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hệ thống chưa ghi nhận thanh toán. Vui lòng đợi hoặc thử lại.')),
        );
      }
    } catch (e) {
      if (manual && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không kiểm tra được trạng thái thanh toán lúc này: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (manual && mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  void _handleCopy(String text, String field) {
    Clipboard.setData(ClipboardData(text: text));
    setState(() => _copiedField = field);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted && _copiedField == field) {
        setState(() => _copiedField = null);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Thanh toán QR'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        elevation: 1,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, false),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 450),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5)),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.qr_code, color: brandCyan, size: 24),
                      SizedBox(width: 8),
                      Text('Quét QR SePay để thanh toán', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 2),
                    ),
                    child: Image.network(
                      qrUrl,
                      width: 220,
                      height: 220,
                      fit: BoxFit.contain,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      children: [
                        _buildInfoRow('Ngân hàng', 'TPBank'),
                        const SizedBox(height: 12),
                        _buildCopyRow('Số tài khoản', accountNo, 'account'),
                        const SizedBox(height: 12),
                        _buildInfoRow('Chủ tài khoản', accountName),
                        const SizedBox(height: 12),
                        _buildInfoRow('Số tiền', currencyFormatter.format(widget.amount), valueColor: brandCyan, valueWeight: FontWeight.bold, valueSize: 16),
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Divider(color: Color(0xFFE2E8F0), height: 1),
                        ),
                        _buildCopyRow('Nội dung CK', transferContent, 'content'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Quét mã bằng ứng dụng ngân hàng (chọn SePay) và chuyển đúng nội dung thanh toán để hệ thống tự xác nhận.',
                      style: TextStyle(fontSize: 13, color: Color(0xFFB45309)),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF94A3B8))),
                      SizedBox(width: 8),
                      Text('Đang chờ xác nhận thanh toán...', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isChecking ? null : () => _checkPaymentStatus(manual: true),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: brandCyan,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 0,
                      ),
                      child: _isChecking
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Tôi đã chuyển khoản, kiểm tra lại', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor, FontWeight? valueWeight, double? valueSize}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
        Text(
          value,
          style: TextStyle(
            fontSize: valueSize ?? 14,
            fontWeight: valueWeight ?? FontWeight.w600,
            color: valueColor ?? const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }

  Widget _buildCopyRow(String label, String value, String fieldId) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
        const SizedBox(width: 16),
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Flexible(
                child: Text(
                  value,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                  textAlign: TextAlign.right,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 6),
              GestureDetector(
                onTap: () => _handleCopy(value, fieldId),
                child: Icon(
                  _copiedField == fieldId ? Icons.check : Icons.copy,
                  size: 16,
                  color: brandCyan,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
