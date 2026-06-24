// lib/services/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'storage_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  bool _isRefreshing = false;
  Future<bool>? _refreshFuture;

  // GET request
  Future<dynamic> get(String endpoint, {Map<String, String>? queryParams}) async {
    await _ensureValidToken();

    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint')
        .replace(queryParameters: queryParams);
    final headers = await _getHeaders();
    final response = await http.get(uri, headers: headers);

    // Fallback: nếu vẫn bị 401 (edge case), thử refresh + retry 1 lần
    if (response.statusCode == 401) {
      final refreshed = await _forceRefreshToken();
      if (refreshed) {
        final newHeaders = await _getHeaders();
        final retryResponse = await http.get(uri, headers: newHeaders);
        return _handleResponse(retryResponse);
      }
    }

    return _handleResponse(response);
  }

  // POST request
  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    await _ensureValidToken();

    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final headers = await _getHeaders();
    final encodedBody = body != null ? jsonEncode(body) : null;
    final response = await http.post(uri, headers: headers, body: encodedBody);

    if (response.statusCode == 401) {
      final refreshed = await _forceRefreshToken();
      if (refreshed) {
        final newHeaders = await _getHeaders();
        final retryResponse = await http.post(uri, headers: newHeaders, body: encodedBody);
        return _handleResponse(retryResponse);
      }
    }

    return _handleResponse(response);
  }

  // PATCH request
  Future<dynamic> patch(String endpoint, {Map<String, dynamic>? body}) async {
    await _ensureValidToken();

    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final headers = await _getHeaders();
    final encodedBody = body != null ? jsonEncode(body) : null;
    final response = await http.patch(uri, headers: headers, body: encodedBody);

    if (response.statusCode == 401) {
      final refreshed = await _forceRefreshToken();
      if (refreshed) {
        final newHeaders = await _getHeaders();
        final retryResponse = await http.patch(uri, headers: newHeaders, body: encodedBody);
        return _handleResponse(retryResponse);
      }
    }

    return _handleResponse(response);
  }

  // DELETE request
  Future<dynamic> delete(String endpoint) async {
    await _ensureValidToken();

    final uri = Uri.parse('${ApiConfig.baseUrl}$endpoint');
    final headers = await _getHeaders();
    final response = await http.delete(uri, headers: headers);

    if (response.statusCode == 401) {
      final refreshed = await _forceRefreshToken();
      if (refreshed) {
        final newHeaders = await _getHeaders();
        final retryResponse = await http.delete(uri, headers: newHeaders);
        return _handleResponse(retryResponse);
      }
    }

    return _handleResponse(response);
  }

  // ============================================================
  // PROACTIVE TOKEN REFRESH — Kiểm tra trước mỗi request
  // ============================================================

  /// Kiểm tra access token còn hạn không, nếu sắp hết thì refresh trước
  Future<void> _ensureValidToken() async {
    final token = await StorageService.getAccessToken();
    if (token == null || token.isEmpty) return;

    // Decode JWT payload để lấy thời gian hết hạn (exp)
    final expiry = _getTokenExpiry(token);
    if (expiry == null) return;

    // Nếu token hết hạn trong vòng 60 giây tới → refresh trước
    final now = DateTime.now();
    final buffer = const Duration(seconds: 60);
    if (expiry.isBefore(now.add(buffer))) {
      await _forceRefreshToken();
    }
  }

  /// Decode JWT để lấy thời gian hết hạn
  DateTime? _getTokenExpiry(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;

      // Decode payload (phần thứ 2 của JWT)
      String payload = parts[1];
      // Padding base64 nếu cần
      switch (payload.length % 4) {
        case 2: payload += '=='; break;
        case 3: payload += '='; break;
      }
      final decoded = utf8.decode(base64Url.decode(payload));
      final payloadMap = jsonDecode(decoded) as Map<String, dynamic>;

      final exp = payloadMap['exp'] as int?;
      if (exp == null) return null;

      return DateTime.fromMillisecondsSinceEpoch(exp * 1000);
    } catch (_) {
      return null;
    }
  }

  // ============================================================
  // REFRESH TOKEN — Gọi API để lấy token mới
  // ============================================================

  /// Force refresh token, đảm bảo chỉ 1 request refresh chạy tại 1 thời điểm
  Future<bool> _forceRefreshToken() async {
    // Nếu đang refresh rồi → chờ kết quả chung
    if (_isRefreshing && _refreshFuture != null) {
      return _refreshFuture!;
    }

    _isRefreshing = true;
    _refreshFuture = _doRefreshToken();

    try {
      return await _refreshFuture!;
    } finally {
      _isRefreshing = false;
      _refreshFuture = null;
    }
  }

  /// Thực hiện gọi API refresh token
  Future<bool> _doRefreshToken() async {
    try {
      final refreshToken = await StorageService.getRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) return false;

      final uri = Uri.parse('${ApiConfig.baseUrl}${ApiConfig.refreshToken}');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body);
        final newAccessToken = body['accessToken'] as String?;
        final newRefreshToken = body['refreshToken'] as String?;

        if (newAccessToken != null && newRefreshToken != null) {
          final role = await StorageService.getUserRole() ?? '';
          await StorageService.saveTokens(
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            role: role,
          );
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Build headers with JWT token
  Future<Map<String, String>> _getHeaders() async {
    final token = await StorageService.getAccessToken();
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // Handle response
  dynamic _handleResponse(http.Response response) {
    final body = response.body.isNotEmpty ? jsonDecode(response.body) : null;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    // Extract error message from NestJS response
    String message = 'Đã xảy ra lỗi';
    if (body != null && body is Map) {
      message = body['message']?.toString() ?? message;
      // NestJS sometimes returns message as array
      if (body['message'] is List) {
        message = (body['message'] as List).join(', ');
      }
    }

    throw ApiException(response.statusCode, message);
  }
}
