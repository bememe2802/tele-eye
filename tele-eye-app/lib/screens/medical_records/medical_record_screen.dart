// lib/screens/medical_records/medical_record_screen.dart
import 'package:flutter/material.dart';
import '../../models/appointment_model.dart';
import '../../services/booking_service.dart';
import '../../widgets/app_sidebar.dart';
import '../../widgets/responsive_scaffold.dart';

class MedicalRecordScreen extends StatefulWidget {
  final AppointmentModel appointment;
  const MedicalRecordScreen({super.key, required this.appointment});

  @override
  State<MedicalRecordScreen> createState() => _MedicalRecordScreenState();
}

class _MedicalRecordScreenState extends State<MedicalRecordScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);

  final BookingService _bookingService = BookingService();
  Map<String, dynamic>? _record;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _fetchRecord();
  }

  Future<void> _fetchRecord() async {
    try {
      final data = await _bookingService.getMedicalRecord(widget.appointment.id);
      setState(() { _record = data; _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final content = SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Hồ sơ bệnh án', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
          const SizedBox(height: 4),
          Text('Kết quả khám ngày ${widget.appointment.date}', style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          const SizedBox(height: 16),
          if (_loading)
            const Center(child: Padding(padding: EdgeInsets.all(60), child: CircularProgressIndicator(color: brandCyan)))
          else if (_error != null)
            _buildErrorState()
          else if (_record == null)
            _buildEmptyState()
          else
            _buildContent(),
          const SizedBox(height: 80),
        ],
      ),
    );

    return ResponsiveScaffold(
      title: 'Hồ sơ bệnh án',
      sidebar: const AppSidebar(activeMenu: 'Lịch hẹn của tôi'),
      showBackButton: true,
      body: content,
    );
  }

  Widget _buildContent() {
    final r = _record!;

    // Backend response structure:
    // { appointment_id, status, patient_info, doctor_info, medical_record: {
    //     chief_complaint, diagnosis_od, diagnosis_os, icd_10_code,
    //     management_plan, doctor_notes,
    //     drug_prescription: { items: [{ quantity, dosage, note, drug: { name, unit } }] },
    //     glasses_prescription: { od_sphere, os_sphere, ... }
    // } }
    final medRecord = r['medical_record'] as Map<String, dynamic>? ?? {};

    final diagnosisOD = medRecord['diagnosis_od']?.toString() ?? '';
    final diagnosisOS = medRecord['diagnosis_os']?.toString() ?? '';
    final icd10       = medRecord['icd_10_code']?.toString() ?? '';
    final diagnosisText = [
      if (diagnosisOD.isNotEmpty) 'Mắt phải (OD): $diagnosisOD',
      if (diagnosisOS.isNotEmpty) 'Mắt trái (OS): $diagnosisOS',
      if (icd10.isNotEmpty) 'ICD-10: $icd10',
    ].join('\n').isNotEmpty
        ? [
            if (diagnosisOD.isNotEmpty) 'Mắt phải (OD): $diagnosisOD',
            if (diagnosisOS.isNotEmpty) 'Mắt trái (OS): $diagnosisOS',
            if (icd10.isNotEmpty) 'ICD-10: $icd10',
          ].join('\n')
        : 'Chưa có chẩn đoán';

    final doctorNotes = medRecord['doctor_notes']?.toString()
        ?? medRecord['management_plan']?.toString()
        ?? 'Không có ghi chú';

    // Đơn thuốc: medical_record.drug_prescription.items
    final drugPrescription = medRecord['drug_prescription'] as Map<String, dynamic>?;
    final prescriptionItems = drugPrescription != null
        ? (drugPrescription['items'] as List? ?? [])
        : [];

    // Đơn kính
    final glassesPrescription = medRecord['glasses_prescription'] as Map<String, dynamic>?;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Info bác sĩ + lịch hẹn
        _buildPanel(
          title: 'Thông tin lịch khám',
          icon: Icons.calendar_today_outlined,
          child: Row(
            children: [
              Expanded(child: _buildInfoBox('Bác sĩ', widget.appointment.doctorName)),
              const SizedBox(width: 16),
              Expanded(child: _buildInfoBox('Chuyên khoa', widget.appointment.specialization)),
              const SizedBox(width: 16),
              Expanded(child: _buildInfoBox('Ngày khám', '${widget.appointment.date}  |  ${widget.appointment.time}')),
              const SizedBox(width: 16),
              Expanded(child: _buildInfoBox('Trạng thái',
                  widget.appointment.status == 'COMPLETED' ? 'Hoàn thành ✓' : widget.appointment.status)),
            ],
          ),
        ),
        const SizedBox(height: 20),

        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left: Chẩn đoán + ghi chú
            Expanded(
              flex: 3,
              child: Column(
                children: [
                  // Chẩn đoán
                  _buildPanel(
                    title: 'Chẩn đoán',
                    icon: Icons.medical_information_outlined,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFFBBF7D0)),
                      ),
                      child: Text(
                        diagnosisText,
                        style: const TextStyle(fontSize: 14, color: Color(0xFF166534), height: 1.6, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Ghi chú bác sĩ
                  _buildPanel(
                    title: 'Ghi chú của bác sĩ',
                    icon: Icons.edit_note,
                    child: Text(
                      doctorNotes,
                      style: const TextStyle(fontSize: 14, color: Color(0xFF475569), height: 1.7),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 20),

            // Right: Đơn thuốc + tái khám
            Expanded(
              flex: 2,
              child: Column(
                children: [
                  // Đơn thuốc
                  _buildPanel(
                    title: 'Đơn thuốc',
                    icon: Icons.medication_outlined,
                    child: prescriptionItems.isEmpty
                        ? const Text('Không có đơn thuốc',
                            style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8)))
                        : Column(
                            children: prescriptionItems.asMap().entries.map((entry) {
                              final item = entry.value as Map<String, dynamic>? ?? {};
                              final drug = item['drug'] as Map<String, dynamic>? ?? {};
                              final name = drug['name']?.toString() ?? 'Thuốc ${entry.key + 1}';
                              final unit = drug['unit']?.toString() ?? '';
                              final quantity = item['quantity']?.toString() ?? '';
                              final dosage = item['dosage']?.toString() ?? '';
                              final note = item['note']?.toString() ?? '';
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(children: [
                                      const Icon(Icons.circle, color: brandCyan, size: 8),
                                      const SizedBox(width: 8),
                                      Expanded(child: Text(
                                          unit.isNotEmpty ? '$name ($unit)' : name,
                                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)))),
                                    ]),
                                    if (quantity.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Padding(padding: const EdgeInsets.only(left: 16),
                                          child: Text('Số lượng: $quantity', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                                    ],
                                    if (dosage.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Padding(padding: const EdgeInsets.only(left: 16),
                                          child: Text('Liều dùng: $dosage', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                                    ],
                                    if (note.isNotEmpty) ...[
                                      const SizedBox(height: 4),
                                      Padding(padding: const EdgeInsets.only(left: 16),
                                          child: Text('Ghi chú: $note', style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)))),
                                    ],
                                  ],
                                ),
                              );
                            }).toList(),
                          ),
                  ),
                  const SizedBox(height: 20),

                  // Đơn kính (nếu có)
                  if (glassesPrescription != null)
                    _buildPanel(
                      title: 'Đơn kính',
                      icon: Icons.visibility_outlined,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _buildGlassesRow('Mắt phải (OD)',
                              glassesPrescription['od_sphere']?.toString() ?? '—',
                              glassesPrescription['od_cylinder']?.toString() ?? '—',
                              glassesPrescription['od_axis']?.toString() ?? '—'),
                          const SizedBox(height: 8),
                          _buildGlassesRow('Mắt trái (OS)',
                              glassesPrescription['os_sphere']?.toString() ?? '—',
                              glassesPrescription['os_cylinder']?.toString() ?? '—',
                              glassesPrescription['os_axis']?.toString() ?? '—'),
                          if ((glassesPrescription['notes']?.toString() ?? '').isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text('Ghi chú: ${glassesPrescription['notes']}',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                          ],
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildGlassesRow(String eye, String sphere, String cylinder, String axis) {
    return Row(children: [
      SizedBox(width: 100, child: Text(eye, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)))),
      _glassCell('Cầu', sphere),
      const SizedBox(width: 8),
      _glassCell('Trụ', cylinder),
      const SizedBox(width: 8),
      _glassCell('Trục', axis),
    ]);
  }

  Widget _glassCell(String label, String value) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
      Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
    ]);
  }

  Widget _buildPanel({required String title, required IconData icon, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 12, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: brandCyan, size: 18),
              const SizedBox(width: 8),
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: Color(0xFFF1F5F9)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }

  Widget _buildInfoBox(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(10)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.w500)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 40),
          const Icon(Icons.error_outline, color: Colors.red, size: 48),
          const SizedBox(height: 12),
          Text('Không thể tải hồ sơ: $_error',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red, fontSize: 14)),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () { setState(() { _loading = true; _error = null; }); _fetchRecord(); },
            style: ElevatedButton.styleFrom(backgroundColor: brandCyan, foregroundColor: Colors.white),
            child: const Text('Thử lại'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(60),
        child: Column(
          children: [
            Icon(Icons.folder_open_outlined, color: Color(0xFF94A3B8), size: 48),
            SizedBox(height: 12),
            Text('Chưa có hồ sơ bệnh án', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

