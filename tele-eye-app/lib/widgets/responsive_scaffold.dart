// lib/widgets/responsive_scaffold.dart
import 'package:flutter/material.dart';

class ResponsiveScaffold extends StatelessWidget {
  final Widget sidebar;
  final Widget body;
  final Color backgroundColor;
  final String title;
  final bool showBackButton;
  final VoidCallback? onBack;
  final Widget? floatingActionButton;
  /// Bottom navigation bar để hiển thị trên mobile (dùng khi không dùng IndexedStack)
  final Widget? bottomNavigationBar;
  /// Actions hiển thị bên phải AppBar trên mobile (VD: nút logout)
  final List<Widget>? actions;

  const ResponsiveScaffold({
    super.key,
    required this.sidebar,
    required this.body,
    required this.title,
    this.backgroundColor = const Color(0xFFF8FAFC),
    this.showBackButton = false,
    this.onBack,
    this.floatingActionButton,
    this.bottomNavigationBar,
    this.actions,
  });

  static const Color brandCyan = Color(0xFF0AA2D1);
  static const double _tabletBreakpoint = 700;

  @override
  Widget build(BuildContext context) {
    final isTablet = MediaQuery.of(context).size.width >= _tabletBreakpoint;

    if (isTablet) {
      return Scaffold(
        backgroundColor: backgroundColor,
        floatingActionButton: floatingActionButton,
        body: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            sidebar,
            Expanded(child: body),
          ],
        ),
      );
    }

    // Mobile — sub-screens dùng showBackButton = true, không có bottomNav
    // Vì HomeScreen bọc bên ngoài với IndexedStack + BottomNav rồi
    return Scaffold(
      backgroundColor: backgroundColor,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: bottomNavigationBar,
      appBar: _buildAppBar(context),
      body: body,
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      centerTitle: false,
      leading: showBackButton
          ? IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E293B), size: 20),
              onPressed: onBack ?? () => Navigator.of(context).pop(),
            )
          : null,
      automaticallyImplyLeading: false,
      title: Text(title,
          style: const TextStyle(
              fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
      actions: actions,
      bottom: const PreferredSize(
        preferredSize: Size.fromHeight(1),
        child: Divider(height: 1, color: Color(0xFFE2E8F0)),
      ),
    );
  }
}
