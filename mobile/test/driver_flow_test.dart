import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

Widget driverApp(NexoApi api) => MaterialApp(
      theme: nexoTheme(),
      home: DriverShell(
        api: api,
        profile: const {'displayName': 'Bruno', 'email': 'bruno@example.com'},
        apiUrl: 'https://api.test/v1',
      ),
    );

void main() {
  testWidgets('radar lists real open requests from the server', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'PUT' && path == '/me/marketplace') {
        return {'accountId': 'acc-2', 'availability': body['availability']};
      }
      if (method == 'GET' && path == '/me/marketplace/open-requests') {
        return {
          'requests': [
            {
              'id': 'req-9',
              'category': 'passenger_car',
              'description': null,
              'status': 'open',
              'createdAt': '2026-10-09T20:00:00Z',
            }
          ]
        };
      }
      return null;
    });
    await tester.pumpWidget(driverApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    expect(find.text('Nova solicitação'), findsOneWidget);
    expect(find.text('Aceitar chamada'), findsOneWidget);
    expect(find.text('ID: req-9'), findsOneWidget);
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('availability toggle writes the offline state to the server', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'PUT' && path == '/me/marketplace') {
        return {'accountId': 'acc-2', 'availability': body['availability']};
      }
      return null;
    });
    await tester.pumpWidget(driverApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    final put = log.lastWhere((c) => c.method == 'PUT' && c.path == '/me/marketplace');
    final body = put.body as Map<String, dynamic>;
    expect(body['availability'], 'offline');
    expect(body['acceptingRequests'], false);
    expect(find.text('OFFLINE'), findsOneWidget);
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('driver executes the full ride state machine with real endpoints', (tester) async {
    var rideState = 'accepted';
    final log = <RecordedCall>[];
    dynamic rideBody() => {
          'id': 'ride-9',
          'state': rideState,
          'fareCents': 247,
          'distanceMeters': 1234,
          'updatedAt': '2026-10-09T20:05:00Z',
        };
    final client = mockClient(log, (method, path, body) {
      if (method == 'PUT' && path == '/me/marketplace') {
        return {'accountId': 'acc-2', 'availability': body['availability']};
      }
      if (method == 'GET' && path == '/me/marketplace/open-requests') {
        return {
          'requests': [
            {
              'id': 'req-9',
              'category': 'passenger_car',
              'description': null,
              'status': 'open',
              'createdAt': '2026-10-09T20:00:00Z',
            }
          ]
        };
      }
      if (method == 'POST' && path == '/requests/req-9/accept') {
        return {'id': 'svc-9', 'requestId': 'req-9', 'status': 'accepted', 'priceCents': 247};
      }
      if (method == 'GET' && path == '/services/svc-9') {
        return {'id': 'svc-9', 'rideId': 'ride-9', 'rideState': rideState};
      }
      if (method == 'GET' && path == '/rides/ride-9') return rideBody();
      if (method == 'POST' && path == '/rides/ride-9/driver-en-route') {
        rideState = 'driver_en_route';
        return rideBody();
      }
      if (method == 'POST' && path == '/rides/ride-9/arrived') {
        rideState = 'arrived';
        return rideBody();
      }
      if (method == 'POST' && path == '/rides/ride-9/start') {
        rideState = 'started';
        return rideBody();
      }
      if (method == 'POST' && path == '/rides/ride-9/complete') {
        rideState = 'completed';
        return rideBody();
      }
      return null;
    });
    await tester.pumpWidget(driverApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    await tester.ensureVisible(find.text('Aceitar chamada'));
    await tester.tap(find.text('Aceitar chamada'));
    await tester.pumpAndSettle();
    expect(find.text('ACCEPTED'), findsOneWidget);

    await tester.ensureVisible(find.text('Iniciar deslocamento'));
    await tester.tap(find.text('Iniciar deslocamento'));
    await tester.pumpAndSettle();
    expect(find.text('DRIVER EN ROUTE'), findsOneWidget);

    await tester.ensureVisible(find.text('Confirmar chegada'));
    await tester.tap(find.text('Confirmar chegada'));
    await tester.pumpAndSettle();
    expect(find.text('ARRIVED'), findsOneWidget);

    await tester.ensureVisible(find.text('Iniciar viagem'));
    await tester.tap(find.text('Iniciar viagem'));
    await tester.pumpAndSettle();
    expect(find.text('STARTED'), findsOneWidget);

    await tester.ensureVisible(find.text('Concluir viagem'));
    await tester.tap(find.text('Concluir viagem'));
    await tester.pumpAndSettle();
    expect(find.text('COMPLETED'), findsOneWidget);
    expect(find.text('VIAGEM CONCLUÍDA'), findsOneWidget);

    final transitions = log
        .where((c) => c.method == 'POST' && c.path.startsWith('/rides/ride-9/'))
        .map((c) => c.path)
        .toList();
    expect(transitions, [
      '/rides/ride-9/driver-en-route',
      '/rides/ride-9/arrived',
      '/rides/ride-9/start',
      '/rides/ride-9/complete',
    ]);
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpWidget(const SizedBox());
  });
}
