import 'package:flutter_test/flutter_test.dart';
import 'package:nexo_mobile/main.dart';

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
  });
}
