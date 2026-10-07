import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

void main() {
  testWidgets('payment flow exposes allowed methods and blocks amount mismatch', (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: PaymentRecordPage(expectedAmountCents: 1234),
    ));

    expect(find.text(r'R$ 12.34'), findsOneWidget);
    expect(find.text('Dinheiro'), findsOneWidget);
    expect(find.text('Confirmar pagamento'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '1235');
    await tester.pump();

    final button = tester.widget<FilledButton>(find.text('Confirmar pagamento'));
    expect(button.onPressed, isNull);
  });
}
