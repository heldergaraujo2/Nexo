import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
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

  testWidgets('passenger area shows a friendly GPS error and disables the request button (no crash)',
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
        locate: () async => throw NexoUserException(
            'Permissão de localização negada. Habilite-a nas configurações do dispositivo.'),
      ),
    ));
    await tester.pumpAndSettle();

    // Graceful treatment: the exact user-facing message is on screen…
    expect(find.textContaining('Permissão de localização negada'), findsOneWidget);
    // …the request button is disabled until a position exists (real UI rule:
    // onPressed = busy || position == null ? null : requestRide)…
    final button = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Solicitar corrida  →'),
    );
    expect(button.onPressed, isNull);
    // …the hero card tells the user what is missing…
    expect(find.textContaining('Precisamos da sua localização'), findsOneWidget);
    // …no API call is made and nothing crashed.
    expect(log.where((c) => c.path == '/rides/requests'), isEmpty);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('tapping around the disabled request flow never calls the API (no crash)',
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
        locate: () async => throw NexoUserException('Permissão de localização negada.'),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '-23.55');
    await tester.enterText(find.byType(TextField).at(1), '-46.63');
    await tester.ensureVisible(find.text('Solicitar corrida  →'));
    await tester.tap(find.text('Solicitar corrida  →'), warnIfMissed: false);
    await tester.pump();

    // The disabled button guarantees no ride request leaves the device.
    expect(log.where((c) => c.path == '/rides/requests'), isEmpty);
    expect(find.textContaining('Precisamos da sua localização'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });
}
