// lib/providers/appointment_provider.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/appointment_model.dart';
import '../services/interfaces/i_booking_service.dart';

class AppointmentProvider extends ChangeNotifier {
  final IBookingService _bookingService;

  AppointmentProvider(this._bookingService);

  List<AppointmentModel> _appointments = [];
  bool _isLoading = false;
  String? _error;

  List<AppointmentModel> get appointments => _appointments;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadAppointments() async {
    _isLoading = true;
    _error = null;
    Future.microtask(() => notifyListeners());

    try {
      final response = await _bookingService.getMyAppointments();
      debugPrint('>>> loadAppointments response type: ${response.runtimeType}');
      debugPrint('>>> loadAppointments response: $response');
      final List<dynamic> data = response is List
          ? response
          : (response['data'] ?? response['appointments'] ?? []);
      debugPrint('>>> loadAppointments data count: ${data.length}');
      _appointments = data
          .map((e) => AppointmentModel.fromJson(
              _normalizeAppointment(Map<String, dynamic>.from(e))))
          .toList();
      debugPrint('>>> loadAppointments parsed: ${_appointments.length} items');
    } catch (e, stack) {
      debugPrint('>>> loadAppointments ERROR: $e');
      debugPrint('>>> loadAppointments STACK: $stack');
      _error = 'Không thể tải lịch hẹn. Vui lòng thử lại.';
      _appointments = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Chuẩn hóa JSON từ backend thành format AppointmentModel.fromJson hiểu được
  /// Backend trả về nested object (doctor, slot, v.v.) → flatten ra
  Map<String, dynamic> _normalizeAppointment(Map<String, dynamic> json) {
    // Lấy tên bác sĩ từ nested object
    String doctorName = '';
    if (json['doctor'] != null) {
      doctorName = json['doctor']['full_name'] ?? json['doctor']['fullName'] ?? '';
    } else {
      doctorName = json['doctor_name'] ?? '';
    }

    // Lấy chuyên khoa
    String specialization = '';
    if (json['doctor'] != null && json['doctor']['specializations'] != null) {
      final specs = json['doctor']['specializations'] as List;
      specialization = specs.isNotEmpty ? specs.first.toString() : '';
    } else {
      specialization = json['specialization'] ?? '';
    }

    // Parse date + time từ slot
    String date = json['date'] ?? '';
    String time = json['time'] ?? '';
    if (json['slot'] != null) {
      final slot = json['slot'] as Map<String, dynamic>;
      final dateSlot = slot['date_slot'] ?? slot['dateSlot'] ?? '';
      final startTime = slot['start_time'] ?? slot['startTime'] ?? '';
      final endTime = slot['end_time'] ?? slot['endTime'] ?? '';

      // Lấy NGÀY từ date_slot (ngày thực tế của lịch hẹn)
      if (dateSlot.toString().isNotEmpty) {
        try {
          final dateDt = DateTime.parse(dateSlot.toString());
          date = DateFormat('dd/MM/yyyy').format(dateDt);
        } catch (_) {
          date = dateSlot.toString().split('T').first;
        }
      }

      // Lấy GIỜ từ start_time / end_time
      // DB lưu UTC, cộng 7h để ra giờ VN (khớp với booking screen)
      if (startTime.toString().isNotEmpty) {
        try {
          final startDt =
              DateTime.parse(startTime.toString()).add(const Duration(hours: 7));
          final endDt = endTime.toString().isNotEmpty
              ? DateTime.parse(endTime.toString()).add(const Duration(hours: 7))
              : startDt.add(const Duration(minutes: 30));
          time =
              '${DateFormat('HH:mm').format(startDt)} - ${DateFormat('HH:mm').format(endDt)}';
        } catch (_) {
          time = startTime.toString().split('T').last.substring(0, 5);
        }
      }
    }

    // Fee (backend trả Decimal dạng String, cần parse sang int)
    final rawFee = json['consultation_fee'] ??
        json['fee'] ??
        (json['doctor'] != null ? json['doctor']['consultation_fee'] ?? 0 : 0);
    final fee =
        rawFee is int ? rawFee : int.tryParse(rawFee.toString()) ?? 0;

    return {
      'id': json['appointment_id'] ?? json['id'] ?? 0,
      'doctor_name': doctorName,
      'specialization': specialization,
      'date': date,
      'time': time,
      'fee': fee,
      'status': json['status'] ?? 'PENDING',
    };
  }
}
