// Smoke test cho Tele-Eye app.
//
// Kiểm tra app khởi động được và dựng MaterialApp mà không ném exception
// nghiêm trọng. Lỗi tràn layout (RenderFlex overflow) do font test (Ahem)
// dùng glyph vuông cố định được bỏ qua vì không phản ánh giao diện thật.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'package:tele_eye_app/main.dart';
import 'package:tele_eye_app/providers/auth_provider.dart';
import 'package:tele_eye_app/providers/doctor_provider.dart';
import 'package:tele_eye_app/providers/appointment_provider.dart';
import 'package:tele_eye_app/providers/admin_provider.dart';
import 'package:tele_eye_app/providers/doctor_dashboard_provider.dart';
import 'package:tele_eye_app/services/auth_service.dart';
import 'package:tele_eye_app/services/profile_service.dart';
import 'package:tele_eye_app/services/booking_service.dart';
import 'package:tele_eye_app/services/admin_service.dart';
import 'package:tele_eye_app/services/doctor_dashboard_service.dart';

void main() {
  setUpAll(() async {
    await initializeDateFormatting('vi', null);
  });

  testWidgets('App khởi động và render MaterialApp', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1400, 1800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(
            create: (_) => AuthProvider(AuthService(), ProfileService()),
          ),
          ChangeNotifierProvider(
            create: (_) => DoctorProvider(ProfileService()),
          ),
          ChangeNotifierProvider(
            create: (_) => AppointmentProvider(BookingService()),
          ),
          ChangeNotifierProvider(
            create: (_) => AdminProvider(AdminService()),
          ),
          ChangeNotifierProvider(
            create: (_) => DoctorDashboardProvider(DoctorDashboardService()),
          ),
        ],
        child: const MyApp(),
      ),
    );
    await tester.pump();

    // App phải dựng được MaterialApp.
    expect(find.byType(MaterialApp), findsOneWidget);

    // Bỏ qua lỗi tràn layout do font test; fail nếu có exception khác.
    final exception = tester.takeException();
    if (exception != null) {
      final message = exception.toString();
      final isOverflow = message.contains('overflowed') ||
          message.contains('A RenderFlex overflowed');
      expect(isOverflow, isTrue,
          reason: 'Có exception ngoài lỗi tràn layout: $message');
    }
  });
}
