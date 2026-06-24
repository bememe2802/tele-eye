// lib/models/appointment_model.dart
class AppointmentModel {
  final int id;
  final String doctorName;
  final String specialization;
  final String date;
  final String time;
  final int fee;
  final String status; // 'CONFIRMED', 'COMPLETED', 'CANCELLED'

  AppointmentModel({
    required this.id,
    required this.doctorName,
    required this.specialization,
    required this.date,
    required this.time,
    required this.fee,
    required this.status,
  });

  factory AppointmentModel.fromJson(Map<String, dynamic> json) {
    final rawFee = json['fee'] ?? 0;
    return AppointmentModel(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      doctorName: json['doctor_name']?.toString() ?? '',
      specialization: json['specialization']?.toString() ?? '',
      date: json['date']?.toString() ?? '',
      time: json['time']?.toString() ?? '',
      fee: rawFee is int ? rawFee : int.tryParse(rawFee.toString()) ?? 0,
      status: json['status']?.toString() ?? 'PENDING',
    );
  }
}
