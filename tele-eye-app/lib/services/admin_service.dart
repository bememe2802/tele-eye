// lib/services/admin_service.dart
import '../config/api_config.dart';
import 'api_service.dart';
import 'interfaces/i_admin_service.dart';

class AdminService implements IAdminService {
  final ApiService _api = ApiService();

  // ==================== DOCTORS ====================

  @override
  Future<List<Map<String, dynamic>>> getAllDoctors() async {
    final response = await _api.get(ApiConfig.doctorList);
    return List<Map<String, dynamic>>.from(
      (response as List).map((e) => Map<String, dynamic>.from(e)),
    );
  }

  @override
  Future<Map<String, dynamic>> createDoctor({
    required String email,
    required String password,
    required String fullName,
    String? title,
    String? licenseNumber,
    required int consultationFee,
    List<int>? specializationIds,
  }) async {
    final body = <String, dynamic>{
      'email': email,
      'password': password,
      'full_name': fullName,          // ✅ backend dùng full_name
      'consultation_fee': consultationFee, // ✅ backend dùng consultation_fee
    };
    if (title != null && title.isNotEmpty) body['title'] = title;
    if (licenseNumber != null && licenseNumber.isNotEmpty) body['license_number'] = licenseNumber;
    if (specializationIds != null) body['specializationIds'] = specializationIds;

    final response = await _api.post(ApiConfig.doctorList, body: body);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> updateDoctor(int doctorId, Map<String, dynamic> dto) async {
    final response = await _api.patch('${ApiConfig.doctorList}/$doctorId', body: dto);
    return Map<String, dynamic>.from(response);
  }

  // ==================== DRUGS ====================

  @override
  Future<List<Map<String, dynamic>>> getAllDrugs({String? search}) async {
    final queryParams = search != null && search.isNotEmpty ? {'search': search} : null;
    final response = await _api.get(ApiConfig.drugs, queryParams: queryParams);
    return List<Map<String, dynamic>>.from(
      (response as List).map((e) => Map<String, dynamic>.from(e)),
    );
  }

  @override
  Future<Map<String, dynamic>> createDrug({
    required String name,
    String? activeIngredient,
    String? unit,
  }) async {
    final body = <String, dynamic>{'name': name};
    if (activeIngredient != null && activeIngredient.isNotEmpty) body['active_ingredient'] = activeIngredient;
    if (unit != null && unit.isNotEmpty) body['unit'] = unit;

    final response = await _api.post(ApiConfig.adminDrugs, body: body);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> updateDrug(int drugId, Map<String, dynamic> dto) async {
    final response = await _api.patch('${ApiConfig.adminDrugs}/$drugId', body: dto);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<void> deleteDrug(int drugId) async {
    await _api.delete('${ApiConfig.adminDrugs}/$drugId');
  }

  // ==================== STATS ====================

  @override
  Future<Map<String, dynamic>> getAdminStats() async {
    final response = await _api.get(ApiConfig.adminStats);
    return Map<String, dynamic>.from(response);
  }
}
