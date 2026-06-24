// lib/services/doctor_dashboard_service.dart
import '../config/api_config.dart';
import 'api_service.dart';
import 'interfaces/i_doctor_dashboard_service.dart';

class DoctorDashboardService implements IDoctorDashboardService {
  final ApiService _api = ApiService();

  @override
  Future<List<Map<String, dynamic>>> getTodayAppointments() async {
    final response = await _api.get(ApiConfig.doctorTodayAppointments);
    final list = response is List ? response : (response['data'] ?? []);
    return List<Map<String, dynamic>>.from(
      list.map((e) => Map<String, dynamic>.from(e)),
    );
  }

  @override
  Future<List<Map<String, dynamic>>> getCurrentSchedule() async {
    final response = await _api.get(ApiConfig.doctorAvailabilityMe);
    final list = response is List ? response : (response['data'] ?? []);
    return List<Map<String, dynamic>>.from(
      list.map((e) => Map<String, dynamic>.from(e)),
    );
  }

  @override
  Future<void> registerAvailability({
    required List<int> daysOfWeek,
    required List<int> systemSlotIds,
  }) async {
    await _api.post(ApiConfig.doctorAvailability, body: {
      'days_of_week': daysOfWeek,
      'system_slot_ids': systemSlotIds,
    });
  }

  @override
  Future<void> generateSlots() async {
    await _api.post(ApiConfig.generateSlots);
  }

  @override
  Future<Map<String, dynamic>> getProfile() async {
    final data = await _api.get(ApiConfig.doctorProfile);
    return Map<String, dynamic>.from(data);
  }

  @override
  Future<void> updateProfile(Map<String, dynamic> body) async {
    await _api.patch(ApiConfig.doctorProfile, body: body);
  }
}
