// lib/services/profile_service.dart
import '../config/api_config.dart';
import 'api_service.dart';
import 'interfaces/i_profile_service.dart';

class ProfileService implements IProfileService {
  final ApiService _api = ApiService();

  @override
  Future<Map<String, dynamic>> getMyProfile() async {
    final response = await _api.get(ApiConfig.patientProfile);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> getDoctorProfile() async {
    final response = await _api.get(ApiConfig.doctorProfile);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> updateMyProfile({
    String? fullName,
    String? phoneNumber,
    String? gender,
    String? address,
    String? dateOfBirth,
    String? avatarUrl,
  }) async {
    final body = <String, dynamic>{};
    if (fullName != null) body['full_name'] = fullName;
    if (phoneNumber != null) body['phone_number'] = phoneNumber;
    if (gender != null) body['gender'] = gender;
    if (address != null) body['address'] = address;
    if (dateOfBirth != null) body['date_of_birth'] = dateOfBirth;
    if (avatarUrl != null) body['avatar_url'] = avatarUrl;

    final response = await _api.patch(ApiConfig.patientProfile, body: body);
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<List<Map<String, dynamic>>> getDoctors() async {
    final response = await _api.get(ApiConfig.doctorList);
    return List<Map<String, dynamic>>.from(
      (response as List).map((e) => Map<String, dynamic>.from(e)),
    );
  }
}
