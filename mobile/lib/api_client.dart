import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class NexoApiException implements Exception {
  const NexoApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;
  @override
  String toString() => 'NexoApiException($statusCode): $message';
}

class NexoApiClient {
  NexoApiClient._(this._baseUrl, this._token);
  final String _baseUrl;
  final String? _token;

  static NexoApiClient forLogin(String baseUrl) => NexoApiClient._(baseUrl.replaceFirst(RegExp(r'/
    final prefs = await SharedPreferences.getInstance();
    final configured = prefs.getString('apiBaseUrl');
    final base = (configured ?? const String.fromEnvironment(
      'NEXO_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000/v1',
    )).replaceFirst(RegExp(r'/$'), '');
    return NexoApiClient._(base, prefs.getString('accessToken'));
  }

  static Future<void> saveSession({
    required String baseUrl,
    required String accessToken,
    required String accountId,
    required String role,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('apiBaseUrl', baseUrl.replaceFirst(RegExp(r'/$'), ''));
    await prefs.setString('accessToken', accessToken);
    await prefs.setString('accountId', accountId);
    await prefs.setString('role', role);
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('accountId');
    await prefs.remove('role');
  }

  static Future<Map<String, String>> session() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'accountId': prefs.getString('accountId') ?? '',
      'role': prefs.getString('role') ?? '',
      'apiBaseUrl': prefs.getString('apiBaseUrl') ?? '',
    };
  }

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> post(String path, Map<String, dynamic> body, {String? idempotencyKey}) =>
      _request('POST', path, body: body, idempotencyKey: idempotencyKey);
  Future<dynamic> put(String path, Map<String, dynamic> body) =>
      _request('PUT', path, body: body);

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? idempotencyKey,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) headers['Authorization'] = 'Bearer $_token';
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;

    final response = switch (method) {
      'GET' => await http.get(_uri(path), headers: headers),
      'PUT' => await http.put(_uri(path), headers: headers, body: jsonEncode(body ?? {})),
      _ => await http.post(_uri(path), headers: headers, body: jsonEncode(body ?? {})),
    };
    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      decoded = response.body;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? (decoded['message'] ?? decoded['error'] ?? 'Request failed') : 'Request failed';
      throw NexoApiException(response.statusCode, message.toString());
    }
    return decoded;
  }
}
), ''), null);

  static Future<NexoApiClient> load() async {
    final prefs = await SharedPreferences.getInstance();
    final configured = prefs.getString('apiBaseUrl');
    final base = (configured ?? const String.fromEnvironment(
      'NEXO_API_BASE_URL',
      defaultValue: 'http://10.0.2.2:3000/v1',
    )).replaceFirst(RegExp(r'/$'), '');
    return NexoApiClient._(base, prefs.getString('accessToken'));
  }

  static Future<void> saveSession({
    required String baseUrl,
    required String accessToken,
    required String accountId,
    required String role,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('apiBaseUrl', baseUrl.replaceFirst(RegExp(r'/$'), ''));
    await prefs.setString('accessToken', accessToken);
    await prefs.setString('accountId', accountId);
    await prefs.setString('role', role);
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('accessToken');
    await prefs.remove('accountId');
    await prefs.remove('role');
  }

  static Future<Map<String, String>> session() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'accountId': prefs.getString('accountId') ?? '',
      'role': prefs.getString('role') ?? '',
      'apiBaseUrl': prefs.getString('apiBaseUrl') ?? '',
    };
  }

  Uri _uri(String path) => Uri.parse('$_baseUrl$path');

  Future<dynamic> get(String path) => _request('GET', path);
  Future<dynamic> post(String path, Map<String, dynamic> body, {String? idempotencyKey}) =>
      _request('POST', path, body: body, idempotencyKey: idempotencyKey);
  Future<dynamic> put(String path, Map<String, dynamic> body) =>
      _request('PUT', path, body: body);

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    String? idempotencyKey,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) headers['Authorization'] = 'Bearer $_token';
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;

    final response = switch (method) {
      'GET' => await http.get(_uri(path), headers: headers),
      'PUT' => await http.put(_uri(path), headers: headers, body: jsonEncode(body ?? {})),
      _ => await http.post(_uri(path), headers: headers, body: jsonEncode(body ?? {})),
    };
    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      decoded = response.body;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map ? (decoded['message'] ?? decoded['error'] ?? 'Request failed') : 'Request failed';
      throw NexoApiException(response.statusCode, message.toString());
    }
    return decoded;
  }
}
