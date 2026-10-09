import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// One HTTP call recorded by [mockClient].
class RecordedCall {
  RecordedCall(this.method, this.path, this.body, this.headers);
  final String method;
  final String path;
  final dynamic body;
  final Map<String, String> headers;

  @override
  String toString() => '$method $path';
}

/// Builds a mock HTTP client that records calls and answers with JSON maps.
///
/// The responder receives the method and the path with the `/v1` prefix
/// stripped, and returns a JSON-encodable object or null for a 404.
http.Client mockClient(
  List<RecordedCall> log,
  dynamic Function(String method, String path, dynamic body) responder,
) {
  return MockClient((request) async {
    final path = request.url.path.replaceFirst('/v1', '');
    final dynamic body = request.body.isEmpty ? null : jsonDecode(request.body);
    log.add(RecordedCall(request.method, path, body, request.headers));
    final data = responder(request.method, path, body);
    if (data == null) {
      return http.Response(
        '{"error":{"code":"NOT_FOUND","message":"sem mock para $path"}}',
        404,
        headers: {'content-type': 'application/json'},
      );
    }
    return http.Response(
      jsonEncode(data),
      200,
      headers: {'content-type': 'application/json'},
    );
  });
}
