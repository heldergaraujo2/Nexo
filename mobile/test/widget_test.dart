import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

void main() {
  testWidgets('Nexo login renders the refreshed visual system and API configuration', (tester) async {
    await tester.pumpWidget(const NexoApp());
    expect(find.text('nexo'), findsOneWidget);
    expect(find.text('Sua próxima\nviagem começa aqui.'), findsOneWidget);
    expect(find.text('Acessar sua conta'), findsOneWidget);
    expect(find.text('URL da API'), findsOneWidget);
    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Senha'), findsOneWidget);
    expect(find.text('Entrar na Nexo'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('login validates the form before calling the API', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) => null);
    await tester.pumpWidget(NexoApp(apiFactory: (url) => NexoApi(url, client: client)));

    await tester.ensureVisible(find.text('Entrar na Nexo'));
    await tester.tap(find.text('Entrar na Nexo'));
    await tester.pump();
    expect(find.text('Informe um e-mail válido.'), findsOneWidget);
    expect(log, isEmpty);

    await tester.enterText(find.byType(TextField).at(1), 'ana@example.com');
    await tester.enterText(find.byType(TextField).at(2), 'curta');
    await tester.ensureVisible(find.text('Entrar na Nexo'));
    await tester.tap(find.text('Entrar na Nexo'));
    await tester.pump();
    expect(find.text('A senha precisa ter pelo menos 8 caracteres.'), findsOneWidget);
    expect(log, isEmpty);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('customer login opens the real passenger area', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/auth/login') return {'accessToken': 'token-1'};
      if (method == 'GET' && path == '/me') {
        return {
          'accountId': 'acc-1',
          'displayName': 'Ana',
          'email': 'ana@example.com',
          'isProvider': false,
        };
      }
      return null;
    });
    await tester.pumpWidget(NexoApp(apiFactory: (url) => NexoApi(url, client: client)));

    await tester.enterText(find.byType(TextField).at(1), 'ana@example.com');
    await tester.enterText(find.byType(TextField).at(2), 'senha-forte-123');
    await tester.ensureVisible(find.text('Entrar na Nexo'));
    await tester.tap(find.text('Entrar na Nexo'));
    await tester.pumpAndSettle();

    expect(find.text('ÁREA DO PASSAGEIRO'), findsOneWidget);
    expect(find.text('Olá, Ana 👋'), findsOneWidget);
    expect(log.map((c) => '${c.method} ${c.path}').toList(), containsAllInOrder([
      'POST /auth/login',
      'GET /me',
    ]));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('provider login opens the real driver area', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/auth/login') return {'accessToken': 'token-2'};
      if (method == 'GET' && path == '/me') {
        return {
          'accountId': 'acc-2',
          'displayName': 'Bruno',
          'email': 'bruno@example.com',
          'isProvider': true,
        };
      }
      if (method == 'PUT' && path == '/me/marketplace') {
        return {'accountId': 'acc-2', 'availability': body['availability']};
      }
      return null;
    });
    await tester.pumpWidget(NexoApp(apiFactory: (url) => NexoApi(url, client: client)));

    await tester.enterText(find.byType(TextField).at(1), 'bruno@example.com');
    await tester.enterText(find.byType(TextField).at(2), 'senha-forte-123');
    await tester.ensureVisible(find.text('Entrar na Nexo'));
    await tester.tap(find.text('Entrar na Nexo'));
    await tester.pumpAndSettle();

    expect(find.text('CENTRAL DO MOTORISTA'), findsOneWidget);
    expect(find.text('Olá, Bruno'), findsOneWidget);
    final put = log.firstWhere((c) => c.method == 'PUT' && c.path == '/me/marketplace');
    expect((put.body as Map<String, dynamic>)['availability'], 'available');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('API failure is reported to the user', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/auth/login') return null;
      return null;
    });
    await tester.pumpWidget(NexoApp(apiFactory: (url) => NexoApi(url, client: client)));

    await tester.enterText(find.byType(TextField).at(1), 'ana@example.com');
    await tester.enterText(find.byType(TextField).at(2), 'senha-forte-123');
    await tester.ensureVisible(find.text('Entrar na Nexo'));
    await tester.tap(find.text('Entrar na Nexo'));
    await tester.pumpAndSettle();

    expect(find.textContaining('HTTP 404'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });
}
