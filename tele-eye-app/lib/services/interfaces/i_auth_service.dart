// lib/services/interfaces/i_auth_service.dart
abstract class IAuthService {
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
  });

  Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String token,
  });

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  });

  Future<void> logout();

  Future<bool> refreshTokens();
}
