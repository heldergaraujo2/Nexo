import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

/// GPS-denied checklist item (Section 6): the app must treat a denied location
/// permission gracefully — clear message, no crash — both at the plugin layer
/// ([deviceLocate]) and in the passenger UI (PassengerShell).
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('deviceLocate reports a clear error when location permission is denied', () async {
    // geolocator plugin channel mocked at the platform seam: service ON,
    // permission denied, re-request denied again.
    const channel = MethodChannel('flutter.baseflow.com/geolocator');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
      switch (call.method) {
        case 'isLocationServiceEnabled':
          return true;
        case 'checkPermission':
        case 'requestPermission':
          return 0; // LocationPermission.denied.index
        case 'getCurrentPosition':
          fail('getCurrentPosition must not be called when permission is denied');
      }
      return null;
    });
    addTearDown(() => TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null));

    await expectLater(
      deviceLocate(),
      throwsA(
        isA<NexoUserException>().having(
          (e) => e.message,
          'message',
          contains('Permissão de localização negada'),
        ),
      ),
    );
  });

  testWidgets('passenger area shows a friendly GPS error and keeps working without a crash',
      (tester) async {
    tester.view.physicalSize = const Size(1200, 2800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final client = mockClient(<RecordedCall>[], (method, path, body) => null);
    await tester.pumpWidget(MaterialApp(
      theme: nexoTheme(),
      home: PassengerShell(
        api: NexoApi('https://api.test/v1', client: client),
        profile: const {'displayName': 'Ana', 'email': 'ana@example.com'},
        apiUrl: 'https://api.test/v1',
        locate: () async =>
            throw const NexoUserException('Permissão de localização negada. Habilite-a nas configurações do dispositivo.'),
      ),
    ));
    await tester.pumpAndSettle();

    // Graceful treatment: the exact user-facing message is on screen…
    expect(
      find.textContaining('Permissão de localização negada'),
      findsOneWidget,
    );
    // …the rest of the flow still works (form validates without GPS)…
    await tester.enterText(find.byType(TextField).at(0), '999');
    await tester.enterText(find.byType(TextField).at(1), '-46.633308');
    await tester.ensureVisible(find.text('Solicitar corrida  →'));
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();
    expect(find.text('Latitude inválida: informe um número entre -90 e 90.'), findsOneWidget);
    // …and nothing crashed.
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ride request without a resolved position asks the user to tap GPS (no crash)',
      (tester) async {
    tester.view.physicalSize = const Size(1200, 2800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);

    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) => null);
    await tester.pumpWidget(MaterialApp(
      theme: nexoTheme(),
      home: PassengerShell(
        api: NexoApi('https://api.test/v1', client: client),
        profile: const {'displayName': 'Ana', 'email': 'ana@example.com'},
        apiUrl: 'https://api.test/v1',
        locate: () async =>
            throw const NexoUserException('Permissão de localização negada.'),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '-23.55');
    await tester.enterText(find.byType(TextField).at(1), '-46.63');
    await tester.ensureVisible(find.text('Solicitar corrida  →'));
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();

    expect(
      find.textContaining('Precisamos da sua localização'),
      findsOneWidget,
    );
    expect(log.where((c) => c.path == '/rides/requests'), isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
