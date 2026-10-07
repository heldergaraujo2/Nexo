import 'package:flutter/material.dart';

void main() => runApp(const NexoApp());

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Nexo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo), useMaterial3: true),
        home: const NexoHomePage(),
      );
}

class NexoHomePage extends StatelessWidget {
  const NexoHomePage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Nexo')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const DeliveryRequestPage()),
                ),
                child: const Text('Solicitar entrega'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(builder: (_) => const SubscriptionPage()),
                ),
                child: const Text('Assinatura profissional'),
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const PaymentRecordPage(expectedAmountCents: 1234),
                  ),
                ),
                child: const Text('Registrar pagamento'),
              ),
            ],
          ),
        ),
      );
}

class PaymentRecordPage extends StatefulWidget {
  const PaymentRecordPage({super.key, required this.expectedAmountCents});
  final int expectedAmountCents;
  @override
  State<PaymentRecordPage> createState() => _PaymentRecordPageState();
}

class _PaymentRecordPageState extends State<PaymentRecordPage> {
  String _method = 'cash';
  final _amountController = TextEditingController();
  @override
  void initState() {
    super.initState();
    _amountController.text = widget.expectedAmountCents.toString();
  }
  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }
  bool get _matchesExpected => int.tryParse(_amountController.text) == widget.expectedAmountCents;
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Pagamento')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            Text('Valor do serviço', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              'R\$ ${(widget.expectedAmountCents / 100).toStringAsFixed(2)}',
              style: Theme.of(context).textTheme.headlineMedium,
            ),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              initialValue: _method,
              decoration: const InputDecoration(labelText: 'Método'),
              items: const [
                DropdownMenuItem(value: 'cash', child: Text('Dinheiro')),
                DropdownMenuItem(value: 'pix', child: Text('Pix')),
                DropdownMenuItem(value: 'provider_card_machine', child: Text('Cartão na máquina do profissional')),
              ],
              onChanged: (value) => setState(() => _method = value!),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Valor confirmado (centavos)',
                helperText: 'O valor confirmado deve ser igual ao preço do serviço.',
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _matchesExpected ? () {} : null,
              child: const Text('Confirmar pagamento'),
            ),
          ],
        ),
      );
}

class SubscriptionPage extends StatefulWidget {
  const SubscriptionPage({super.key});
  @override
  State<SubscriptionPage> createState() => _SubscriptionPageState();
}
class _SubscriptionPageState extends State<SubscriptionPage> {
  String _status = 'Pendente';
  void _activate() => setState(() => _status = 'Ativa');
  void _cancel() => setState(() => _status = 'Cancelada');
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Assinatura profissional')),
    body: ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Plano Profissional', style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 8),
        const Text(r'R$ 99,90 por mês'),
        const SizedBox(height: 8),
        Text('Status: $_status'),
        const SizedBox(height: 16),
        const Text('0% de comissão. Você mantém 100% do valor dos serviços.'),
        const SizedBox(height: 24),
        FilledButton(onPressed: _status == 'Ativa' ? null : _activate, child: const Text('Ativar assinatura')),
        const SizedBox(height: 12),
        OutlinedButton(onPressed: _status == 'Cancelada' ? null : _cancel, child: const Text('Cancelar assinatura')),
      ],
    ),
  );
}

class DeliveryRequestPage extends StatefulWidget {
  const DeliveryRequestPage({super.key});
  @override
  State<DeliveryRequestPage> createState() => _DeliveryRequestPageState();
}

class _DeliveryRequestPageState extends State<DeliveryRequestPage> {
  final _item = TextEditingController();
  final _notes = TextEditingController();
  final _origin = TextEditingController();
  final _destination = TextEditingController();
  bool _hasPhoto = false;
  @override
  void dispose() {
    _item.dispose();
    _notes.dispose();
    _origin.dispose();
    _destination.dispose();
    super.dispose();
  }
  @override
  Widget build(BuildContext context) {
    final canContinue = _item.text.trim().isNotEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Nova entrega')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text('Dados da entrega', style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 16),
          TextField(controller: _origin, decoration: const InputDecoration(labelText: 'Origem')),
          const SizedBox(height: 12),
          TextField(controller: _destination, decoration: const InputDecoration(labelText: 'Destino')),
          const SizedBox(height: 12),
          TextField(
            controller: _item,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Descrição do item'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(controller: _notes, maxLines: 2, decoration: const InputDecoration(labelText: 'Observações (opcional)')),
          const SizedBox(height: 12),
          SwitchListTile(
            title: const Text('Tenho foto do item'),
            value: _hasPhoto,
            onChanged: (value) => setState(() => _hasPhoto = value),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: canContinue ? () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Entrega preparada para envio'))) : null,
            child: const Text('Continuar'),
          ),
        ],
      ),
    );
  }
}
