// lib/services/interfaces/i_profile_service.dart
abstract class IProfileService {
  Future<Map<String, dynamic>> getMyProfile();

  Future<Map<String, dynamic>> getDoctorProfile();

  Future<Map<String, dynamic>> updateMyProfile({
    String? fullName,
    String? phoneNumber,
    String? gender,
    String? address,
    String? dateOfBirth,
    String? avatarUrl,
  });

  Future<List<Map<String, dynamic>>> getDoctors();
}
