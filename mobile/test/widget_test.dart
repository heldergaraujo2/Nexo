import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

void main() {
  testWidgets('payment flow exposes allowed methods and blocks amount mismatch', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: PaymentRecordPage(expectedAmountCents: 1234)));
    expect(find.text(r'R$ 12.34'), findsOneWidget);
    expect(find.text('Dinheiro'), findsOneWidget);
    expect(find.text('Confirmar pagamento'), findsOneWidget);
    await tester.enterText(find.byType(TextField), '1235');
    await tester.pump();
    final button = tester.widget<FilledButton>(
      find.ancestor(of: find.text('Confirmar pagamento'), matching: find.byType(FilledButton)),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('delivery request flow exposes required fields', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: DeliveryRequestPage()));
    expect(find.text('Nova entrega'), findsOneWidget);
    expect(find.text('Origem'), findsOneWidget);
    expect(find.text('Destino'), findsOneWidget);
    expect(find.text('Descrição do item'), findsOneWidget);
    expect(find.text('Observações (opcional)'), findsOneWidget);
    expect(find.text('Continuar'), findsOneWidget);
    final disabled = tester.widget<FilledButton>(
      find.ancestor(of: find.text('Continuar'), matching: find.byType(FilledButton)),
    );
    expect(disabled.onPressed, isNull);
    await tester.enterText(find.widgetWithText(TextField, 'Descrição do item'), 'Documento');
    await tester.pump();
    final enabled = tester.widget<FilledButton>(
      find.ancestor(of: find.text('Continuar'), matching: find.byType(FilledButton)),
    );
    expect(enabled.onPressed, isNotNull);
  });
}
