import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

void main() {
  testWidgets('operational login exposes LAN API and credentials', (tester) async {
    await tester.pumpWidget(const NexoApp());
    expect(find.text('Nexo — teste operacional'), findsOneWidget);
    expect(find.text('URL da API LAN'), findsOneWidget);
    expect(find.text('E-mail'), findsOneWidget);
    expect(find.text('Senha'), findsOneWidget);
    expect(find.text('Entrar'), findsOneWidget);
  });
}
