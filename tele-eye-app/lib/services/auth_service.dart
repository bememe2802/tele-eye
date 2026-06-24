// lib/services/auth_service.dart
import '../config/api_config.dart';
import 'api_service.dart';
import 'storage_service.dart';
import 'interfaces/i_auth_service.dart';

class AuthService implements IAuthService {
  final ApiService _api = ApiService();

  @override
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final response = await _api.post(ApiConfig.register, body: {
      'email': email,
      'password': password,
      'fullName': fullName,
    });
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String token,
  }) async {
    final response = await _api.post(ApiConfig.verifyEmail, body: {
      'email': email,
      'token': token,
    });
    return Map<String, dynamic>.from(response);
  }

  @override
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.post(ApiConfig.login, body: {
      'email': email,
      'password': password,
    });

    final data = Map<String, dynamic>.from(response);

    // Save tokens to local storage
    final user = data['user'] is Map ? Map<String, dynamic>.from(data['user']) : <String, dynamic>{};
    await StorageService.saveTokens(
      accessToken: data['accessToken'],
      refreshToken: data['refreshToken'],
      role: data['role'] ?? user['role'] ?? 'PATIENT',
    );
    await StorageService.saveEmail(email);

    return data;
  }

  @override
  Future<void> logout() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken != null) {
        await _api.post(ApiConfig.logout, body: {
          'refreshToken': refreshToken,
        });
      }
    } catch (_) {
      // Ignore errors during logout
    } finally {
      await StorageService.clearAll();
    }
  }

  @override
  Future<bool> refreshTokens() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null) return false;

      final response = await _api.post(ApiConfig.refreshToken, body: {
        'refreshToken': refreshToken,
      });

      final data = Map<String, dynamic>.from(response);
      final role = await StorageService.getUserRole() ?? 'PATIENT';

      await StorageService.saveTokens(
        accessToken: data['accessToken'],
        refreshToken: data['refreshToken'],
        role: role,
      );
      return true;
    } catch (_) {
      return false;
    }
  }
}
