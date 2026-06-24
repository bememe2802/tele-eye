import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/home_screen.dart';
import 'screens/admin/admin_home_screen.dart';
import 'screens/doctor/doctor_main_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/doctor_provider.dart';
import 'providers/appointment_provider.dart';
import 'providers/admin_provider.dart';
import 'providers/doctor_dashboard_provider.dart';
import 'services/auth_service.dart';
import 'services/profile_service.dart';
import 'services/booking_service.dart';
import 'services/admin_service.dart';
import 'services/doctor_dashboard_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi', null); // Khởi tạo locale tiếng Việt cho DateFormat
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) =>
              AuthProvider(AuthService(), ProfileService())..checkAuthStatus(),
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
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tele-Eye',
      debugShowCheckedModeBanner: false,
      // Localization delegates for Vietnamese DatePicker, TimePicker, etc.
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('vi', 'VN'),
        Locale('en', 'US'),
      ],
      locale: const Locale('vi', 'VN'),
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF0AA2D1)),
        useMaterial3: true,
        fontFamily: 'Inter',
      ),
      // Route gốc: LoginScreen
      initialRoute: '/',
      routes: {
        '/': (context) => const _AuthGate(),
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const HomeScreen(),
        '/admin': (context) => const AdminHomeScreen(),
      },
    );
  }
}

/// Gate: kiểm tra auth khi khởi động → redirect đúng màn hình
class _AuthGate extends StatelessWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (auth.isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FAFC),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                backgroundColor: Color(0xFF0AA2D1),
                radius: 28,
                child: Icon(Icons.remove_red_eye, color: Colors.white, size: 28),
              ),
              SizedBox(height: 24),
              CircularProgressIndicator(color: Color(0xFF0AA2D1)),
            ],
          ),
        ),
      );
    }

    if (auth.currentUser == null) {
      return const LoginScreen();
    }

    final role = auth.currentUser!.role;
    if (role == 'ADMIN') return const AdminHomeScreen();
    if (role == 'DOCTOR') return const DoctorMainScreen();
    return const HomeScreen(); // PATIENT
  }
}
