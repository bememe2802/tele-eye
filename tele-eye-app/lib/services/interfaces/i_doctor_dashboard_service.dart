// lib/services/interfaces/i_doctor_dashboard_service.dart
abstract class IDoctorDashboardService {
  Future<List<Map<String, dynamic>>> getTodayAppointments();

  Future<List<Map<String, dynamic>>> getCurrentSchedule();

  Future<void> registerAvailability({
    required List<int> daysOfWeek,
    required List<int> systemSlotIds,
  });

  Future<void> generateSlots();

  Future<Map<String, dynamic>> getProfile();

  Future<void> updateProfile(Map<String, dynamic> body);
}
