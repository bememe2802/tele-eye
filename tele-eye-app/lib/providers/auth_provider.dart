// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/interfaces/i_auth_service.dart';
import '../services/interfaces/i_profile_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  final IAuthService _authService;
  final IProfileService _profileService;

  AuthProvider(this._authService, this._profileService);

  UserModel? _currentUser;
  bool _isLoading = false;
  String? _error;

  UserModel? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    final token = await StorageService.getAccessToken();
    if (token != null) {
      await loadUserProfile();
    } else {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.login(email: email, password: password);
      await loadUserProfile();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.register(email: email, password: password, fullName: fullName);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyEmail({required String email, required String token}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _authService.verifyEmail(email: email, token: token);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loadUserProfile() async {
    try {
      final role = await StorageService.getUserRole() ?? 'PATIENT';
      final email = await StorageService.getEmail() ?? '';

      if (role == 'ADMIN') {
        _currentUser = UserModel(
          id: 0,
          email: email,
          role: 'ADMIN',
          fullName: 'Administrator',
        );
      } else if (role == 'DOCTOR') {
        final data = await _profileService.getDoctorProfile();
        _currentUser = UserModel.fromJson(data);
      } else {
        final data = await _profileService.getMyProfile();
        _currentUser = UserModel.fromJson(data);
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = 'Không thể tải thông tin người dùng: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _currentUser = null;
    notifyListeners();
  }
}
