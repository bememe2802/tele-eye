// lib/providers/doctor_provider.dart
import 'package:flutter/material.dart';
import '../models/doctor_model.dart';
import '../services/interfaces/i_profile_service.dart';

class DoctorProvider extends ChangeNotifier {
  final IProfileService _profileService;

  DoctorProvider(this._profileService);

  List<DoctorModel> _doctors = [];
  bool _isLoading = false;
  String? _error;

  List<DoctorModel> get doctors => _doctors;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadDoctors() async {
    _isLoading = true;
    _error = null;
    Future.microtask(() => notifyListeners());

    try {
      final data = await _profileService.getDoctors();
      _doctors = data.map((e) => DoctorModel.fromJson(e)).toList();
    } catch (e) {
      _error = 'Không thể tải danh sách bác sĩ. Vui lòng thử lại.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
