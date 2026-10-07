import 'package:flutter_test/flutter_test.dart';

import 'package:nexo_mobile/main.dart';

void main() {
  testWidgets('Nexo home page renders', (tester) async {
    await tester.pumpWidget(const NexoApp());

    expect(find.text('Nexo'), findsOneWidget);
    expect(
      find.text('Nexo — conectando quem precisa a quem pode fazer.'),
      findsOneWidget,
    );
  });
}
