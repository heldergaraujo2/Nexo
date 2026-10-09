import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

void main() {
  testWidgets('history, profile and logout navigate against real endpoints', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/me/services/history') {
        return [
          {
            'id': 'svc-1',
            'requestId': 'req-1',
            'category': 'passenger_car',
            'status': 'completed',
            'priceCents': 2500,
            'createdAt': '2026-10-09T20:00:00Z',
          }
        ];
      }
      return null;
    });
    tester.view.physicalSize = const Size(1200, 2800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      theme: nexoTheme(),
      home: PassengerShell(
        api: NexoApi('https://api.test/v1', client: client),
        profile: const {'displayName': 'Ana', 'email': 'ana@example.com'},
        apiUrl: 'https://api.test/v1',
        locate: () async => const NexoLocation(latitude: -23.55, longitude: -46.63),
      ),
    ));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Viagens'));
    await tester.pumpAndSettle();
    expect(find.text('HISTÓRICO DE ATIVIDADES'), findsOneWidget);
    expect(find.text('Viagem de carro'), findsOneWidget);
    expect(find.text('R\$ 25,00'), findsOneWidget);

    await tester.tap(find.text('Perfil'));
    await tester.pumpAndSettle();
    expect(find.text('Sua conta'), findsOneWidget);
    expect(find.text('Ana'), findsOneWidget);
    expect(find.text('PASSAGEIRO'), findsOneWidget);
    expect(find.text('Sair da conta'), findsOneWidget);

    await tester.ensureVisible(find.text('Sair da conta'));
    await tester.tap(find.text('Sair da conta'));
    await tester.pumpAndSettle();
    expect(find.text('Acessar sua conta'), findsOneWidget);
    expect(log.map((c) => '${c.method} ${c.path}'), contains('GET /me/services/history'));
    await tester.pump(const Duration(seconds: 10));
    await tester.pumpWidget(const SizedBox());
  });
}
