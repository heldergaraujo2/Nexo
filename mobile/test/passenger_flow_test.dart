import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

Widget passengerApp(NexoApi api, {Locate? locate}) => MaterialApp(
      theme: nexoTheme(),
      home: PassengerShell(
        api: api,
        profile: const {'displayName': 'Ana', 'email': 'ana@example.com'},
        apiUrl: 'https://api.test/v1',
        locate: locate ?? () async => const NexoLocation(latitude: -23.55, longitude: -46.63),
      ),
    );

void main() {
  testWidgets('invalid destination coordinates are rejected without calling the API', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) => null);
    await tester.pumpWidget(passengerApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '999');
    await tester.enterText(find.byType(TextField).at(1), '-46.633308');
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();

    expect(find.text('Latitude inválida: informe um número entre -90 e 90.'), findsOneWidget);
    expect(log.where((c) => c.path == '/rides/requests'), isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ride request sends the typed destination with no artificial offset', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/rides/requests') {
        return {
          'requestId': 'req-1',
          'category': 'passenger_car',
          'distanceMeters': 1234,
          'tariffCentsPerKm': 200,
          'fareCents': 247,
          'currency': 'BRL',
        };
      }
      return null;
    });
    await tester.pumpWidget(passengerApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '-23.55052');
    await tester.enterText(find.byType(TextField).at(1), '-46.633308');
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();

    final call = log.firstWhere((c) => c.path == '/rides/requests');
    expect(call.method, 'POST');
    expect(call.headers['idempotency-key'], isNotNull);
    final body = call.body as Map<String, dynamic>;
    expect(body['vehicleType'], 'car');
    expect(body['origin'], {'latitude': -23.55, 'longitude': -46.63});
    expect(body['destination'], {'latitude': -23.55052, 'longitude': -46.633308});
    expect(find.text('PROCURANDO MOTORISTA'), findsOneWidget);
    expect(find.text('R\$ 2,47'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('passenger tracks the ride states reported by the server', (tester) async {
    var rideState = 'accepted';
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/rides/requests') {
        return {
          'requestId': 'req-1',
          'category': 'passenger_car',
          'distanceMeters': 1234,
          'tariffCentsPerKm': 200,
          'fareCents': 247,
          'currency': 'BRL',
        };
      }
      if (method == 'GET' && path == '/me/services/history') {
        return [
          {
            'id': 'svc-1',
            'requestId': 'req-1',
            'category': 'passenger_car',
            'status': 'accepted',
            'priceCents': 247,
            'createdAt': '2026-10-09T20:00:00Z',
          }
        ];
      }
      if (method == 'GET' && path == '/services/svc-1') {
        return {'id': 'svc-1', 'rideId': 'ride-1', 'rideState': rideState};
      }
      if (method == 'GET' && path == '/rides/ride-1') {
        return {
          'id': 'ride-1',
          'state': rideState,
          'fareCents': 247,
          'distanceMeters': 1234,
          'updatedAt': '2026-10-09T20:01:00Z',
        };
      }
      return null;
    });
    await tester.pumpWidget(passengerApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '-23.55052');
    await tester.enterText(find.byType(TextField).at(1), '-46.633308');
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();
    expect(find.text('PROCURANDO MOTORISTA'), findsOneWidget);

    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    expect(find.text('ACCEPTED'), findsOneWidget);

    rideState = 'driver_en_route';
    await tester.pump(const Duration(seconds: 2));
    await tester.pump();
    expect(find.text('DRIVER EN ROUTE'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('cancel sends the typed reason to the real cancel endpoint', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/rides/requests') {
        return {
          'requestId': 'req-1',
          'category': 'passenger_car',
          'distanceMeters': 1234,
          'tariffCentsPerKm': 200,
          'fareCents': 247,
          'currency': 'BRL',
        };
      }
      if (method == 'POST' && path == '/requests/req-1/cancel') {
        return {'id': 'req-1', 'status': 'cancelled'};
      }
      return null;
    });
    await tester.pumpWidget(passengerApp(NexoApi('https://api.test/v1', client: client)));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).at(0), '-23.55052');
    await tester.enterText(find.byType(TextField).at(1), '-46.633308');
    await tester.tap(find.text('Solicitar corrida  →'));
    await tester.pump();

    await tester.tap(find.text('Cancelar solicitação'));
    await tester.pumpAndSettle();
    expect(find.text('Cancelar solicitação'), findsWidgets);

    await tester.enterText(
      find.descendant(of: find.byType(AlertDialog), matching: find.byType(TextField)),
      'mudei de planos',
    );
    await tester.tap(find.text('Confirmar cancelamento'));
    await tester.pumpAndSettle();

    final call = log.firstWhere((c) => c.path == '/requests/req-1/cancel');
    expect(call.method, 'POST');
    expect((call.body as Map<String, dynamic>)['reason'], 'mudei de planos');
    expect(find.text('Solicitar uma viagem'), findsOneWidget);
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpWidget(const SizedBox());
  });
}
