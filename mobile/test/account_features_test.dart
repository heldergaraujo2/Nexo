import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:nexo_mobile/main.dart';

import 'helpers.dart';

/// Client that always answers [status] with a JSON payload.
http.Client statusClient(int status, [Object? payload]) =>
    MockClient((request) async => http.Response(
          jsonEncode(payload ?? {'statusCode': status, 'message': 'erro simulado'}),
          status,
          headers: {'content-type': 'application/json'},
        ));

/// Client whose connection fails — backend unavailable scenario (Parte C2).
http.Client downClient() => MockClient(
      (request) async => throw const SocketException('Connection refused'),
    );

Widget wrap(Widget child) => MaterialApp(
      theme: nexoTheme(),
      home: Scaffold(backgroundColor: AppColors.bg, body: child),
    );

void useTall(WidgetTester tester) {
  tester.view.physicalSize = const Size(1200, 2800);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);
}

void main() {
  testWidgets('profile edit form validates locally and saves to PUT /me/profile', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'PUT' && path == '/me/profile') {
        return {
          'id': 'p-1',
          'accountId': 'acc-1',
          'displayName': body['displayName'] ?? 'Ana',
          'bio': body['bio'],
          'professionalInfo': body['professionalInfo'],
          'photoUrl': body['photoUrl'],
          'createdAt': '2026-10-10T10:00:00Z',
        };
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(ProfileEditPanel(
      api: NexoApi('https://api.test/v1', client: client),
      profile: const {'accountId': 'acc-1', 'displayName': 'Ana', 'bio': 'antiga'},
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Abrir'));
    await tester.pumpAndSettle();
    expect(find.text('Salvar perfil'), findsOneWidget);

    // local validation: name too short → no API call
    await tester.enterText(find.byKey(const Key('edit-displayName')), 'A');
    await tester.tap(find.text('Salvar perfil'));
    await tester.pumpAndSettle();
    expect(find.text('O nome precisa ter entre 2 e 120 caracteres.'), findsOneWidget);
    expect(log.where((c) => c.method == 'PUT'), isEmpty);

    await tester.enterText(find.byKey(const Key('edit-displayName')), 'Ana Silva');
    await tester.enterText(find.byKey(const Key('edit-bio')), 'Motora desde 2024');
    await tester.tap(find.text('Salvar perfil'));
    await tester.pumpAndSettle();
    expect(find.text('Perfil atualizado.'), findsOneWidget);
    final put = log.firstWhere((c) => c.method == 'PUT' && c.path == '/me/profile');
    expect((put.body as Map<String, dynamic>)['displayName'], 'Ana Silva');
    expect((put.body as Map<String, dynamic>)['bio'], 'Motora desde 2024');
  });

  testWidgets('profile edit surfaces API failures to the user', (tester) async {
    final client = statusClient(500, {'statusCode': 500, 'message': 'falhou no servidor'});
    useTall(tester);
    await tester.pumpWidget(wrap(ProfileEditPanel(
      api: NexoApi('https://api.test/v1', client: client),
      profile: const {'accountId': 'acc-1', 'displayName': 'Ana'},
    )));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Abrir'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Salvar perfil'));
    await tester.pumpAndSettle();
    expect(find.textContaining('HTTP 500'), findsOneWidget);
    expect(find.textContaining('falhou no servidor'), findsOneWidget);
  });

  testWidgets('payments panel lists server records and registers a new payment', (tester) async {
    final log = <RecordedCall>[];
    var registered = false;
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/me/services/history') {
        return [
          {
            'id': 'svc-1',
            'customerId': 'acc-1',
            'providerId': 'acc-2',
            'category': 'passenger_car',
            'status': 'completed',
            'priceCents': 2500,
            'createdAt': '2026-10-10T12:00:00Z',
          }
        ];
      }
      if (method == 'GET' && path == '/payment-records/services/svc-1') {
        return registered
            ? [
                {
                  'id': 'pay-1',
                  'serviceId': 'svc-1',
                  'method': 'pix',
                  'expectedAmountCents': 2500,
                  'confirmedAmountCents': null,
                  'currency': 'BRL',
                  'status': 'pending',
                }
              ]
            : [];
      }
      if (method == 'POST' && path == '/payment-records/services/svc-1') {
        registered = true;
        return {
          'id': 'pay-1',
          'serviceId': 'svc-1',
          'method': 'pix',
          'expectedAmountCents': 2500,
          'confirmedAmountCents': null,
          'currency': 'BRL',
          'status': 'pending',
        };
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(TripsTab(
      api: NexoApi('https://api.test/v1', client: client),
      profile: const {'accountId': 'acc-1'},
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Pagamentos'));
    await tester.pumpAndSettle();
    expect(find.text('Nenhum registro de pagamento para este serviço.'), findsOneWidget);
    expect(log.map((c) => '${c.method} ${c.path}'), contains('GET /payment-records/services/svc-1'));

    await tester.tap(find.text('Registrar pagamento'));
    await tester.pumpAndSettle();
    expect(find.text('Pagamento registrado.'), findsOneWidget);
    final post = log.firstWhere((c) => c.method == 'POST' && c.path == '/payment-records/services/svc-1');
    expect((post.body as Map<String, dynamic>)['method'], 'pix');
    expect(post.headers.containsKey('idempotency-key'), isTrue);
    expect(find.text('pending'), findsOneWidget);
  });

  testWidgets('provider confirms a pending payment from the payments panel', (tester) async {
    final log = <RecordedCall>[];
    var confirmed = false;
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/me/services/history') {
        return [
          {
            'id': 'svc-1',
            'customerId': 'acc-1',
            'providerId': 'acc-2',
            'category': 'passenger_car',
            'status': 'completed',
            'priceCents': 2500,
            'createdAt': '2026-10-10T12:00:00Z',
          }
        ];
      }
      if (method == 'GET' && path == '/payment-records/services/svc-1') {
        return [
          {
            'id': 'pay-1',
            'serviceId': 'svc-1',
            'method': 'pix',
            'expectedAmountCents': 2500,
            'confirmedAmountCents': confirmed ? 2500 : null,
            'currency': 'BRL',
            'status': confirmed ? 'confirmed' : 'pending',
          }
        ];
      }
      if (method == 'POST' && path == '/payment-records/pay-1/confirm') {
        confirmed = true;
        return {
          'id': 'pay-1',
          'serviceId': 'svc-1',
          'method': 'pix',
          'expectedAmountCents': 2500,
          'confirmedAmountCents': 2500,
          'currency': 'BRL',
          'status': 'confirmed',
        };
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(TripsTab(
      api: NexoApi('https://api.test/v1', client: client),
      profile: const {'accountId': 'acc-2'},
    )));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Pagamentos'));
    await tester.pumpAndSettle();
    expect(find.text('Confirmar pagamento'), findsOneWidget);
    await tester.tap(find.text('Confirmar pagamento'));
    await tester.pumpAndSettle();
    expect(find.text('Pagamento confirmado.'), findsOneWidget);
    final post = log.firstWhere((c) => c.method == 'POST' && c.path == '/payment-records/pay-1/confirm');
    expect((post.body as Map<String, dynamic>)['confirmedAmountCents'], 2500);
  });

  testWidgets('payments panel surfaces API errors', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/me/services/history') {
        return [
          {
            'id': 'svc-1',
            'customerId': 'acc-1',
            'providerId': 'acc-2',
            'category': 'passenger_car',
            'status': 'completed',
            'priceCents': 2500,
            'createdAt': '2026-10-10T12:00:00Z',
          }
        ];
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(TripsTab(
      api: NexoApi('https://api.test/v1', client: client),
      profile: const {'accountId': 'acc-1'},
    )));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Pagamentos'));
    await tester.pumpAndSettle();
    expect(find.textContaining('HTTP 404'), findsOneWidget);
  });

  testWidgets('rating panel posts score and comment to POST /ratings', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'POST' && path == '/ratings') {
        return {
          'id': 'r-1',
          'serviceId': 'svc-1',
          'authorId': 'acc-1',
          'subjectId': 'acc-2',
          'score': body['score'],
          'comment': body['comment'],
          'moderationState': 'published',
          'createdAt': '2026-10-10T12:10:00Z',
        };
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(RateServicePanel(
      api: NexoApi('https://api.test/v1', client: client),
      serviceId: 'svc-1',
      subjectId: 'acc-2',
    )));
    await tester.pumpAndSettle();

    // no score chosen → local validation, no call
    await tester.tap(find.text('Enviar avaliação'));
    await tester.pumpAndSettle();
    expect(find.text('Escolha uma nota de 1 a 5.'), findsOneWidget);
    expect(log.where((c) => c.path == '/ratings'), isEmpty);

    await tester.tap(find.byKey(const Key('star-4')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('rating-comment')), 'Pontual e educado');
    await tester.tap(find.text('Enviar avaliação'));
    await tester.pumpAndSettle();
    expect(find.text('Avaliação enviada.'), findsOneWidget);
    final post = log.firstWhere((c) => c.path == '/ratings');
    final body = post.body as Map<String, dynamic>;
    expect(body['serviceId'], 'svc-1');
    expect(body['subjectId'], 'acc-2');
    expect(body['score'], 4);
    expect(body['comment'], 'Pontual e educado');
  });

  testWidgets('rating server conflicts are surfaced to the user', (tester) async {
    final client = statusClient(409, {'statusCode': 409, 'message': 'Rating already exists for this service'});
    useTall(tester);
    await tester.pumpWidget(wrap(RateServicePanel(
      api: NexoApi('https://api.test/v1', client: client),
      serviceId: 'svc-1',
      subjectId: 'acc-2',
    )));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('star-5')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Enviar avaliação'));
    await tester.pumpAndSettle();
    expect(find.textContaining('HTTP 409'), findsOneWidget);
    expect(find.textContaining('Rating already exists'), findsOneWidget);
  });

  testWidgets('reputation panel shows average, total and recent ratings', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/profiles/acc-2/ratings') {
        return {
          'average': '4.50',
          'total': 2,
          'ratings': [
            {'id': 'r-1', 'score': 5, 'comment': 'Excelente', 'createdAt': '2026-10-10T12:00:00Z'},
            {'id': 'r-2', 'score': 4, 'comment': '', 'createdAt': '2026-10-09T12:00:00Z'},
          ],
        };
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(ReputationPanel(
      api: NexoApi('https://api.test/v1', client: client),
      accountId: 'acc-2',
    )));
    await tester.pumpAndSettle();
    expect(log.map((c) => '${c.method} ${c.path}'), contains('GET /profiles/acc-2/ratings'));
    expect(find.text('4.50'), findsOneWidget);
    expect(find.text('2 avaliação(ões)'), findsOneWidget);
    expect(find.text('Excelente'), findsOneWidget);
    expect(find.text('(sem comentário)'), findsOneWidget);
  });

  testWidgets('notifications tab lists real server notifications', (tester) async {
    final log = <RecordedCall>[];
    final client = mockClient(log, (method, path, body) {
      if (method == 'GET' && path == '/me/notifications') {
        return [
          {
            'id': 'n-1',
            'type': 'payment.confirmed',
            'payload': {'amountCents': 2500},
            'readAt': null,
            'createdAt': '2026-10-10T12:00:00Z',
          },
          {
            'id': 'n-2',
            'type': 'ride.state_changed',
            'payload': {'state': 'completed'},
            'readAt': '2026-10-10T12:05:00Z',
            'createdAt': '2026-10-10T11:00:00Z',
          },
        ];
      }
      return null;
    });
    useTall(tester);
    await tester.pumpWidget(wrap(NotificationsTab(
      api: NexoApi('https://api.test/v1', client: client),
    )));
    await tester.pumpAndSettle();
    expect(log.map((c) => '${c.method} ${c.path}'), contains('GET /me/notifications'));
    expect(find.text('Avisos da sua conta'), findsOneWidget);
    expect(find.text('Pagamento confirmado'), findsOneWidget);
    expect(find.text('Estado da viagem'), findsOneWidget);
    expect(find.text('NOVA'), findsOneWidget);
    expect(find.text('LIDA'), findsOneWidget);
  });

  testWidgets('notifications tab surfaces API errors', (tester) async {
    final client = statusClient(401, {'statusCode': 401, 'message': 'Authentication required'});
    useTall(tester);
    await tester.pumpWidget(wrap(NotificationsTab(
      api: NexoApi('https://api.test/v1', client: client),
    )));
    await tester.pumpAndSettle();
    expect(find.textContaining('HTTP 401'), findsOneWidget);
    expect(find.textContaining('Authentication required'), findsOneWidget);
  });

  testWidgets('backend unavailable shows a friendly error instead of crashing (Parte C2)', (tester) async {
    final client = downClient();
    useTall(tester);
    await tester.pumpWidget(wrap(NotificationsTab(
      api: NexoApi('https://api.test/v1', client: client),
    )));
    await tester.pumpAndSettle();
    expect(find.textContaining('Não foi possível falar com a API'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
