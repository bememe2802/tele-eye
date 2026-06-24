import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;

class ApiConfig {
  static const String _overrideBaseUrl = String.fromEnvironment('API_BASE_URL');
  // Thay đổi IP khi test trên thiết bị thật
  // Android Emulator: 10.0.2.2:8080
  // iOS Simulator / Web / Desktop: localhost:8080
  static String get baseUrl {
    if (_overrideBaseUrl.isNotEmpty) return _overrideBaseUrl;
    if (kIsWeb) return 'http://localhost:8080/api';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:8080/api';
    return 'http://localhost:8080/api';
  }

  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String verifyEmail = '/auth/verify-email';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';

  // Profile
  static const String patientProfile = '/profile/patients/me';
  static const String doctorList = '/profile/doctors';
  static const String doctorProfile = '/profile/doctors/me';

  // Booking - Schedule
  static const String systemSlots = '/booking/schedule/system-slots';
  static const String calendarSlots = '/booking/schedule/calendar-slots';
  static String lockSlot(int slotId) =>
      '/booking/schedule/calendar-slots/$slotId/lock';

  // Booking - Appointments
  static const String createAppointment = '/booking/appointments';
  static const String myAppointments = '/booking/appointments/patient/my';
  static const String doctorTodayAppointments = '/booking/appointments/doctor/today';
  static String medicalRecord(int appointmentId) =>
      '/booking/appointments/$appointmentId/medical-record';
  static String startAppointment(int id) => '/booking/appointments/$id/start';
  static String completeAppointment(int id) => '/booking/appointments/$id/complete';

  // Doctor Schedule
  static const String doctorAvailability = '/booking/schedule/doctor-availability';
  static const String doctorAvailabilityMe = '/booking/schedule/doctor-availability/me';
  static const String systemSlotsList = '/booking/schedule/system-slots';
  static String deleteAvailability(int id) => '/booking/schedule/doctor-availability/$id';

  // Drugs (shared)
  static const String drugs = '/drugs';

  // Admin
  static const String adminDrugs = '/admin/drugs';
  static String adminDrug(int id) => '/admin/drugs/$id';
  static const String adminStats = '/admin/dashboard/stats';

  // Missing endpoints from Web
  static String paymentStatus(int id) => '/booking/appointments/$id/payment-status';
  static const String generateSlots = '/booking/schedule/generate-slots';
}
