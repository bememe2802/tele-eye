// lib/providers/admin_provider.dart
import 'package:flutter/material.dart';
import '../models/doctor_model.dart';
import '../services/interfaces/i_admin_service.dart';

class AdminProvider extends ChangeNotifier {
  final IAdminService _adminService;

  AdminProvider(this._adminService);

  // ==================== DOCTORS ====================
  List<DoctorModel> _doctors = [];
  List<DoctorModel> get doctors => _doctors;
  bool _loadingDoctors = false;
  bool get loadingDoctors => _loadingDoctors;
  String? _doctorError;
  String? get doctorError => _doctorError;

  // ==================== DRUGS ====================
  List<Map<String, dynamic>> _drugs = [];
  List<Map<String, dynamic>> get drugs => _drugs;
  bool _loadingDrugs = false;
  bool get loadingDrugs => _loadingDrugs;
  String? _drugError;
  String? get drugError => _drugError;

  // ==================== STATS ====================
  int _totalDoctors = 0;
  int get totalDoctors => _totalDoctors;
  int _totalDrugs = 0;
  int get totalDrugs => _totalDrugs;
  int _todayAppointments = 0;
  int get todayAppointments => _todayAppointments;
  double _totalRevenue = 0;
  double get totalRevenue => _totalRevenue;
  bool _loadingStats = false;
  bool get loadingStats => _loadingStats;

  // ==================== ACTIONS - DOCTORS ====================

  Future<void> loadDoctors() async {
    _loadingDoctors = true;
    _doctorError = null;
    notifyListeners();
    try {
      final list = await _adminService.getAllDoctors();
      _doctors = list.map((e) => DoctorModel.fromJson(e)).toList();
    } catch (e) {
      _doctorError = e.toString();
    } finally {
      _loadingDoctors = false;
      notifyListeners();
    }
  }

  Future<void> createDoctor({
    required String email,
    required String password,
    required String fullName,
    String? title,
    String? licenseNumber,
    required int consultationFee,
  }) async {
    await _adminService.createDoctor(
      email: email,
      password: password,
      fullName: fullName,
      title: title,
      licenseNumber: licenseNumber,
      consultationFee: consultationFee,
    );
    await loadDoctors();
  }

  Future<void> updateDoctor(int doctorId, Map<String, dynamic> dto) async {
    await _adminService.updateDoctor(doctorId, dto);
    await loadDoctors();
  }

  // ==================== ACTIONS - DRUGS ====================

  Future<void> loadDrugs({String? search}) async {
    _loadingDrugs = true;
    _drugError = null;
    notifyListeners();
    try {
      _drugs = await _adminService.getAllDrugs(search: search);
    } catch (e) {
      _drugError = e.toString();
    } finally {
      _loadingDrugs = false;
      notifyListeners();
    }
  }

  Future<void> createDrug({
    required String name,
    String? activeIngredient,
    String? unit,
  }) async {
    await _adminService.createDrug(name: name, activeIngredient: activeIngredient, unit: unit);
    await loadDrugs();
  }

  Future<void> updateDrug(int drugId, Map<String, dynamic> dto) async {
    await _adminService.updateDrug(drugId, dto);
    await loadDrugs();
  }

  Future<void> deleteDrug(int drugId) async {
    await _adminService.deleteDrug(drugId);
    await loadDrugs();
  }

  // ==================== ACTIONS - STATS ====================

  Future<void> loadStats() async {
    _loadingStats = true;
    notifyListeners();
    try {
      final stats = await _adminService.getAdminStats();
      _totalDoctors = stats['total_doctors'] ?? 0;
      _totalDrugs = stats['total_drugs'] ?? 0;
      _todayAppointments = stats['today_appointments'] ?? 0;
      _totalRevenue = (stats['total_revenue'] ?? 0).toDouble();
    } catch (e) {
      // Giữ giá trị mặc định 0 nếu lỗi
    } finally {
      _loadingStats = false;
      notifyListeners();
    }
  }
}
