// lib/services/interfaces/i_admin_service.dart
abstract class IAdminService {
  // Doctors
  Future<List<Map<String, dynamic>>> getAllDoctors();

  Future<Map<String, dynamic>> createDoctor({
    required String email,
    required String password,
    required String fullName,
    String? title,
    String? licenseNumber,
    required int consultationFee,
    List<int>? specializationIds,
  });

  Future<Map<String, dynamic>> updateDoctor(
      int doctorId, Map<String, dynamic> dto);

  // Drugs
  Future<List<Map<String, dynamic>>> getAllDrugs({String? search});

  Future<Map<String, dynamic>> createDrug({
    required String name,
    String? activeIngredient,
    String? unit,
  });

  Future<Map<String, dynamic>> updateDrug(
      int drugId, Map<String, dynamic> dto);

  Future<void> deleteDrug(int drugId);

  // Stats
  Future<Map<String, dynamic>> getAdminStats();
}
