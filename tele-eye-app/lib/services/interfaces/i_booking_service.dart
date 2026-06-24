// lib/services/interfaces/i_booking_service.dart
abstract class IBookingService {
  Future<dynamic> getMyAppointments();

  Future<List<Map<String, dynamic>>> getAvailableSlots({
    String? date,
    int? doctorId,
    int? specialtyId,
  });

  Future<Map<String, dynamic>> lockSlot(int slotId);

  Future<Map<String, dynamic>> createAppointment({
    required int slotId,
    String? description,
    List<String>? medicalFiles,
  });

  Future<Map<String, dynamic>> getPaymentStatus(int appointmentId);

  Future<Map<String, dynamic>> generateSlots();

  Future<Map<String, dynamic>> getMedicalRecord(int appointmentId);

  Future<Map<String, dynamic>> startAppointment(int appointmentId);

  Future<Map<String, dynamic>> completeAppointment(
      int appointmentId, Map<String, dynamic> data);
}
