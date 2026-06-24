// lib/services/booking_service.dart
import '../config/api_config.dart';
import 'api_service.dart';
import 'interfaces/i_booking_service.dart';

class BookingService implements IBookingService {
  final ApiService _api = ApiService();

  @override
  Future<dynamic> getMyAppointments() async {
    return await _api.get(ApiConfig.myAppointments);
  }

  /// Lấy danh sách slot trống (có filter)
  @override
  Future<List<Map<String, dynamic>>> getAvailableSlots({
    String? date,
    int? doctorId,
    int? specialtyId,
  }) async {
    final queryParams = <String, String>{};
    if (date != null) queryParams['date'] = date;
    if (doctorId != null) queryParams['doctorId'] = doctorId.toString();
    if (specialtyId != null) queryParams['specialtyId'] = specialtyId.toString();

    final response = await _api.get(
      ApiConfig.calendarSlots,
      queryParams: queryParams.isEmpty ? null : queryParams,
    );
    return List<Map<String, dynamic>>.from(
      (response as List).map((e) => Map<String, dynamic>.from(e)),
    );
  }

  /// Giữ chỗ tạm thời 15 phút
  @override
  Future<Map<String, dynamic>> lockSlot(int slotId) async {
    final response = await _api.patch(ApiConfig.lockSlot(slotId));
    return Map<String, dynamic>.from(response);
  }

  /// Tạo lịch hẹn + nhận URL thanh toán VNPAY
  @override
  Future<Map<String, dynamic>> createAppointment({
    required int slotId,
    String? description,
    List<String>? medicalFiles,
  }) async {
    final body = <String, dynamic>{
      'slot_id': slotId,
    };
    if (description != null) body['description'] = description;
    if (medicalFiles != null) body['medical_files'] = medicalFiles;

    final response = await _api.post(ApiConfig.createAppointment, body: body);
    return Map<String, dynamic>.from(response);
  }

  /// Lấy trạng thái thanh toán
  @override
  Future<Map<String, dynamic>> getPaymentStatus(int appointmentId) async {
    final response = await _api.get(ApiConfig.paymentStatus(appointmentId));
    return Map<String, dynamic>.from(response);
  }

  /// Sinh slot tự động
  @override
  Future<Map<String, dynamic>> generateSlots() async {
    final response = await _api.post(ApiConfig.generateSlots);
    return Map<String, dynamic>.from(response);
  }

  /// Xem chi tiết bệnh án
  @override
  Future<Map<String, dynamic>> getMedicalRecord(int appointmentId) async {
    final response = await _api.get(ApiConfig.medicalRecord(appointmentId));
    return Map<String, dynamic>.from(response);
  }

  /// Bắt đầu ca khám
  @override
  Future<Map<String, dynamic>> startAppointment(int appointmentId) async {
    final response = await _api.patch(ApiConfig.startAppointment(appointmentId));
    return Map<String, dynamic>.from(response);
  }

  /// Hoàn thành ca khám và kê đơn
  @override
  Future<Map<String, dynamic>> completeAppointment(
      int appointmentId, Map<String, dynamic> data) async {
    final response =
        await _api.patch(ApiConfig.completeAppointment(appointmentId), body: data);
    return Map<String, dynamic>.from(response);
  }
}
