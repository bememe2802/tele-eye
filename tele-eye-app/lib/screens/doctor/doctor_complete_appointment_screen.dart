import 'package:flutter/material.dart';
import '../../services/booking_service.dart';
import '../../services/api_service.dart';
import '../../config/api_config.dart';

class DoctorCompleteAppointmentScreen extends StatefulWidget {
  final int appointmentId;

  const DoctorCompleteAppointmentScreen({
    super.key,
    required this.appointmentId,
  });

  @override
  State<DoctorCompleteAppointmentScreen> createState() => _DoctorCompleteAppointmentScreenState();
}

class _DoctorCompleteAppointmentScreenState extends State<DoctorCompleteAppointmentScreen> {
  static const Color brandCyan = Color(0xFF0AA2D1);
  final ApiService _api = ApiService();
  final BookingService _bookingService = BookingService();

  bool _loading = false;
  List<Map<String, dynamic>> _drugs = [];
  
  // Form fields
  final _diagnosisOdController = TextEditingController();
  final _diagnosisOsController = TextEditingController();
  final _icd10Controller = TextEditingController();
  final _managementPlanController = TextEditingController();
  final _doctorNotesController = TextEditingController();
  
  // Glasses fields (od_sphere, od_cylinder, od_axis, od_pd, os_...)
  final Map<String, TextEditingController> _glassesControllers = {};
  final _glassesNotesController = TextEditingController();

  // Drug prescription list
  final List<Map<String, dynamic>> _prescriptionItems = [];

  @override
  void initState() {
    super.initState();
    _loadDrugs();
    
    final glassesFields = ['od_sphere', 'od_cylinder', 'od_axis', 'od_pd', 'os_sphere', 'os_cylinder', 'os_axis', 'os_pd'];
    for (var f in glassesFields) {
      _glassesControllers[f] = TextEditingController();
    }
  }

  @override
  void dispose() {
    _diagnosisOdController.dispose();
    _diagnosisOsController.dispose();
    _icd10Controller.dispose();
    _managementPlanController.dispose();
    _doctorNotesController.dispose();
    _glassesNotesController.dispose();
    for (var c in _glassesControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadDrugs() async {
    try {
      final response = await _api.get(ApiConfig.drugs);
      setState(() {
        _drugs = List<Map<String, dynamic>>.from((response as List).map((e) => Map<String, dynamic>.from(e)));
      });
    } catch (e) {
      debugPrint('Error loading drugs: $e');
    }
  }

  void _addPrescriptionItem() {
    setState(() {
      _prescriptionItems.add({
        'drug_id': 0,
        'quantity': 1,
        'dosage': '',
        'note': '',
      });
    });
  }

  void _removePrescriptionItem(int index) {
    setState(() {
      _prescriptionItems.removeAt(index);
    });
  }

  Future<void> _submit() async {
    setState(() => _loading = true);
    
    try {
      final payload = <String, dynamic>{
        if (_diagnosisOdController.text.isNotEmpty) 'diagnosis_od': _diagnosisOdController.text,
        if (_diagnosisOsController.text.isNotEmpty) 'diagnosis_os': _diagnosisOsController.text,
        if (_icd10Controller.text.isNotEmpty) 'icd_10_code': _icd10Controller.text,
        if (_managementPlanController.text.isNotEmpty) 'management_plan': _managementPlanController.text,
        if (_doctorNotesController.text.isNotEmpty) 'doctor_notes': _doctorNotesController.text,
      };

      // Drug prescriptions
      final validDrugs = _prescriptionItems.where((i) => i['drug_id'] != 0).toList();
      if (validDrugs.isNotEmpty) {
        payload['drug_prescription'] = validDrugs;
      }

      // Glasses prescription
      bool hasGlasses = false;
      final glasses = <String, dynamic>{};
      for (var f in _glassesControllers.keys) {
        if (_glassesControllers[f]!.text.isNotEmpty) {
          hasGlasses = true;
          glasses[f] = double.tryParse(_glassesControllers[f]!.text) ?? 0.0;
        }
      }
      if (_glassesNotesController.text.isNotEmpty) {
        hasGlasses = true;
        glasses['notes'] = _glassesNotesController.text;
      }
      if (hasGlasses) {
        payload['glasses_prescription'] = glasses;
      }

      await _bookingService.completeAppointment(widget.appointmentId, payload);
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ca khám hoàn tất! Email đã gửi cho bệnh nhân.')));
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi khi kết thúc ca khám: $e'), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Kết thúc ca khám', style: TextStyle(color: Color(0xFF1E293B), fontSize: 18, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 1,
        centerTitle: true,
        leading: IconButton(icon: const Icon(Icons.close, color: Color(0xFF1E293B)), onPressed: () => Navigator.pop(context)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildSection(
              title: 'Chẩn đoán',
              child: Column(
                children: [
                  _buildTextField('Chẩn đoán mắt phải (OD)', _diagnosisOdController),
                  const SizedBox(height: 12),
                  _buildTextField('Chẩn đoán mắt trái (OS)', _diagnosisOsController),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(child: _buildTextField('Mã ICD-10', _icd10Controller)),
                      const SizedBox(width: 12),
                      Expanded(child: _buildTextField('Kế hoạch điều trị', _managementPlanController)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  _buildTextField('Ghi chú bác sĩ', _doctorNotesController, maxLines: 2),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _buildSection(
              title: 'Kê đơn thuốc',
              action: TextButton.icon(
                onPressed: _addPrescriptionItem,
                icon: const Icon(Icons.add, size: 16, color: brandCyan),
                label: const Text('Thêm thuốc', style: TextStyle(color: brandCyan)),
              ),
              child: _prescriptionItems.isEmpty
                  ? const Center(child: Text('Chưa có đơn thuốc', style: TextStyle(color: Colors.grey)))
                  : Column(
                      children: _prescriptionItems.asMap().entries.map((entry) {
                        final idx = entry.key;
                        final item = entry.value;
                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(12)),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    flex: 2,
                                    child: DropdownButtonFormField<int>(
                                      decoration: const InputDecoration(
                                        labelText: 'Tên thuốc',
                                        isDense: true, border: OutlineInputBorder(),
                                      ),
                                      value: item['drug_id'] == 0 ? null : item['drug_id'],
                                      items: _drugs.map((d) => DropdownMenuItem<int>(
                                        value: d['drug_id'],
                                        child: Text(d['name'], style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                                      )).toList(),
                                      onChanged: (val) => setState(() => item['drug_id'] = val ?? 0),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextFormField(
                                      initialValue: item['quantity'].toString(),
                                      decoration: const InputDecoration(labelText: 'SL', isDense: true, border: OutlineInputBorder()),
                                      keyboardType: TextInputType.number,
                                      onChanged: (val) => item['quantity'] = int.tryParse(val) ?? 1,
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete, color: Colors.red),
                                    onPressed: () => _removePrescriptionItem(idx),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: TextFormField(
                                      initialValue: item['dosage'],
                                      decoration: const InputDecoration(labelText: 'Liều dùng', isDense: true, border: OutlineInputBorder()),
                                      onChanged: (val) => item['dosage'] = val,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: TextFormField(
                                      initialValue: item['note'],
                                      decoration: const InputDecoration(labelText: 'Ghi chú', isDense: true, border: OutlineInputBorder()),
                                      onChanged: (val) => item['note'] = val,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
            ),
            const SizedBox(height: 16),
            _buildSection(
              title: 'Đơn kính (tuỳ chọn)',
              child: Column(
                children: [
                  _buildGlassesRow('Mắt phải (OD)', 'od'),
                  const SizedBox(height: 12),
                  _buildGlassesRow('Mắt trái (OS)', 'os'),
                  const SizedBox(height: 12),
                  _buildTextField('Ghi chú đơn kính', _glassesNotesController),
                ],
              ),
            ),
            const SizedBox(height: 80), // Padding cho nút
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, -5))]),
        child: ElevatedButton(
          onPressed: _loading ? null : _submit,
          style: ElevatedButton.styleFrom(
            backgroundColor: brandCyan, foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: _loading
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Lưu & Kết thúc ca khám', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ),
      ),
    );
  }

  Widget _buildSection({required String title, required Widget child, Widget? action}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              if (action != null) action,
            ],
          ),
          const Divider(),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField(String label, TextEditingController controller, {int maxLines = 1}) {
    return TextField(
      controller: controller,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }

  Widget _buildGlassesRow(String label, String prefix) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF64748B), fontSize: 13)),
        const SizedBox(height: 6),
        Row(
          children: [
            Expanded(child: _buildTextField('SPH', _glassesControllers['${prefix}_sphere']!)),
            const SizedBox(width: 6),
            Expanded(child: _buildTextField('CYL', _glassesControllers['${prefix}_cylinder']!)),
            const SizedBox(width: 6),
            Expanded(child: _buildTextField('AXIS', _glassesControllers['${prefix}_axis']!)),
            const SizedBox(width: 6),
            Expanded(child: _buildTextField('PD', _glassesControllers['${prefix}_pd']!)),
          ],
        )
      ],
    );
  }
}
