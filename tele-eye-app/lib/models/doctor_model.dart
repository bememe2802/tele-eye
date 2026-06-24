// lib/models/doctor_model.dart
class DoctorModel {
  final int id;
  final String fullName;
  final String? title;
  final String? avatarUrl;
  final int consultationFee;
  final List<String> specializations;
  final bool isVerified;
  final String? licenseNumber;

  DoctorModel({
    required this.id,
    required this.fullName,
    this.title,
    this.avatarUrl,
    required this.consultationFee,
    required this.specializations,
    this.isVerified = false,
    this.licenseNumber,
  });

  factory DoctorModel.fromJson(Map<String, dynamic> json) {
    final rawId = json['doctor_id'];
    final rawFee = json['consultation_fee'];
    return DoctorModel(
      id: rawId is String ? int.tryParse(rawId) ?? 0 : rawId ?? 0,
      fullName: json['full_name'] ?? '',
      title: json['title'],
      avatarUrl: json['avatar_url'],
      consultationFee: rawFee is String ? int.tryParse(rawFee) ?? 0 : rawFee ?? 0,
      specializations: List<String>.from(json['specializations'] ?? []),
      isVerified: json['is_verified'] ?? false,
      licenseNumber: json['license_number'],
    );
  }
}
