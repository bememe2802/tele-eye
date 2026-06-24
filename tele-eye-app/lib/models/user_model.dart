// lib/models/user_model.dart
class UserModel {
  final int id;
  final String email;
  final String role; // 'ADMIN', 'DOCTOR', 'PATIENT'
  final String? fullName;
  final String? phoneNumber;
  final String? gender;
  final String? address;
  final String? dateOfBirth;
  final String? avatarUrl;

  UserModel({
    required this.id,
    required this.email,
    required this.role,
    this.fullName,
    this.phoneNumber,
    this.gender,
    this.address,
    this.dateOfBirth,
    this.avatarUrl,
  });

  bool get isAdmin => role == 'ADMIN';
  bool get isDoctor => role == 'DOCTOR';
  bool get isPatient => role == 'PATIENT';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    // Backend trả về:
    // GET /profile/patients/me → { patient_id, user_id, full_name, phone_number, gender, address, date_of_birth, avatar_url, user: { email, is_active } }
    // GET /profile/doctors/me  → { doctor_id, user_id, full_name, title, email, role, specializations: [...] }
    // GET /auth/login          → { accessToken, refreshToken, role }  (không có profile)
    final userData = json['user'] ?? {};
    return UserModel(
      id: json['user_id'] ?? json['id'] ?? userData['user_id'] ?? 0,
      email: json['email'] ?? userData['email'] ?? '',
      role: json['role'] ?? userData['role'] ?? 'PATIENT',
      fullName: json['full_name'] ?? json['fullName'] ?? '',
      phoneNumber: json['phone_number'],
      gender: json['gender'] != null ? json['gender'].toString() : null,
      address: json['address'],
      dateOfBirth: json['date_of_birth'] != null
          ? json['date_of_birth'].toString().split('T').first
          : null,
      avatarUrl: json['avatar_url'],
    );
  }
}
