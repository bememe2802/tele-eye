// lib/providers/doctor_dashboard_provider.dart
import 'package:flutter/material.dart';
import '../services/interfaces/i_doctor_dashboard_service.dart';

class DoctorDashboardProvider extends ChangeNotifier {
  final IDoctorDashboardService _service;

  DoctorDashboardProvider(this._service);

  // ==================== TODAY APPOINTMENTS ====================
  List<Map<String, dynamic>> _todayAppointments = [];
  List<Map<String, dynamic>> get todayAppointments => _todayAppointments;
  bool _loadingToday = false;
  bool get loadingToday => _loadingToday;
  String? _todayError;
  String? get todayError => _todayError;

  int get waitingCount =>
      _todayAppointments.where((a) => a['status'] == 'CONFIRMED').length;
  int get inProgressCount =>
      _todayAppointments.where((a) => a['status'] == 'IN_PROGRESS').length;
  int get doneCount =>
      _todayAppointments.where((a) => a['status'] == 'COMPLETED').length;

  // ==================== SCHEDULE ====================
  List<Map<String, dynamic>> _currentSchedule = [];
  List<Map<String, dynamic>> get currentSchedule => _currentSchedule;
  bool _loadingSchedule = false;
  bool get loadingSchedule => _loadingSchedule;

  // ==================== PROFILE ====================
  Map<String, dynamic>? _profile;
  Map<String, dynamic>? get profile => _profile;
  bool _loadingProfile = false;
  bool get loadingProfile => _loadingProfile;

  // ==================== ACTIONS ====================

  Future<void> loadTodayAppointments() async {
    _loadingToday = true;
    _todayError = null;
    notifyListeners();
    try {
      _todayAppointments = await _service.getTodayAppointments();
    } catch (e) {
      _todayError = e.toString();
    } finally {
      _loadingToday = false;
      notifyListeners();
    }
  }

  Future<void> loadCurrentSchedule() async {
    _loadingSchedule = true;
    notifyListeners();
    try {
      _currentSchedule = await _service.getCurrentSchedule();
    } catch (_) {
      _currentSchedule = [];
    } finally {
      _loadingSchedule = false;
      notifyListeners();
    }
  }

  Future<void> registerAvailability({
    required List<int> daysOfWeek,
    required List<int> systemSlotIds,
  }) async {
    await _service.registerAvailability(
      daysOfWeek: daysOfWeek,
      systemSlotIds: systemSlotIds,
    );
    await loadCurrentSchedule();
  }

  Future<void> generateSlots() async {
    await _service.generateSlots();
  }

  Future<void> loadProfile() async {
    _loadingProfile = true;
    notifyListeners();
    try {
      _profile = await _service.getProfile();
    } catch (_) {
      _profile = null;
    } finally {
      _loadingProfile = false;
      notifyListeners();
    }
  }

  Future<void> updateProfile(Map<String, dynamic> body) async {
    await _service.updateProfile(body);
    await loadProfile();
  }
}
