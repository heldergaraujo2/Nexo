import 'dart:convert';

import 'package:http/http.dart' as http;

/// Factory used by the app and tests to create API clients.
typedef ApiFactory = NexoApi Function(String url);

/// Builds the production [NexoApi] instance.
NexoApi defaultApiFactory(String url) => NexoApi(url);

/// User-facing failure with a message safe to render in the UI.
class NexoUserException implements Exception {
  NexoUserException(this.message);
  final String message;
  @override
  String toString() => message;
}

class NexoApi {
  NexoApi(String url, {http.Client? client})
      : baseUrl = url.trim().replaceFirst(RegExp(r'/$'), ''),
        _client = client ?? http.Client();

  String baseUrl;
  String? token;
  final http.Client _client;

  Future<dynamic> send(String method, String path, {Object? body, String? key}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers['content-type'] = 'application/json';
    if (token != null) request.headers['authorization'] = 'Bearer $token';
    if (key != null) request.headers['idempotency-key'] = key;
    if (body != null) request.body = jsonEncode(body);
    final http.StreamedResponse response;
    try {
      response = await _client.send(request).timeout(const Duration(seconds: 12));
    } catch (e) {
      throw NexoUserException('Não foi possível falar com a API ($e). Verifique o endereço e a rede.');
    }
    final raw = await response.stream.bytesToString();
    final data = raw.isEmpty ? null : jsonDecode(raw);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final detail = _errorMessage(data) ?? raw;
      throw NexoUserException('HTTP ${response.statusCode}: $detail');
    }
    return data;
  }

  static String? _errorMessage(dynamic data) {
    if (data is Map) {
      final message = data['message'];
      if (message is String && message.isNotEmpty) return message;
      final error = data['error'];
      if (error is Map && error['message'] is String) return error['message'] as String;
      if (error is String && error.isNotEmpty) return error;
    }
    return null;
  }

  /// Timestamp-based idempotency key for critical commands.
  static String key() => '${DateTime.now().microsecondsSinceEpoch}';
}
