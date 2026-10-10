import 'package:flutter/material.dart';

import 'account_features.dart';
import 'api.dart';
import 'theme.dart';

/// Real service history tab backed by GET /me/services/history.
class TripsTab extends StatefulWidget {
  const TripsTab({super.key, required this.api, this.profile = const {}});
  final NexoApi api;
  final Map<String, dynamic> profile;

  @override
  State<TripsTab> createState() => _TripsTabState();
}

class _TripsTabState extends State<TripsTab> {
  List<dynamic>? history;
  String? error;
  bool busy = false;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.api.send('GET', '/me/services/history') as List<dynamic>;
      if (mounted) setState(() => history = data);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = history ?? const <dynamic>[];
    return PageColumn(children: [
      Row(children: [
        const Expanded(child: Eyebrow('Histórico de atividades')),
        IconButton(
          tooltip: 'Atualizar histórico',
          onPressed: busy ? null : load,
          icon: const Icon(Icons.refresh_rounded, color: AppColors.purpleBright),
        ),
      ]),
      const SizedBox(height: 8),
      const Text('Suas viagens e serviços', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
      const SizedBox(height: 6),
      const Text('Dados carregados do servidor Nexo.', style: TextStyle(color: AppColors.muted)),
      const SizedBox(height: 22),
      if (busy && history == null)
        const Panel(child: Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2))))
      else if (rows.isEmpty)
        const Panel(child: Column(children: [
          Icon(Icons.receipt_long_rounded, size: 34, color: AppColors.muted),
          SizedBox(height: 12),
          Text('Nenhuma atividade registrada', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          SizedBox(height: 5),
          Text('Quando você concluir uma viagem ou serviço, ele aparecerá aqui.',
              textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted, fontSize: 12)),
        ]))
      else
        ...rows.map((row) {
          final item = row as Map<String, dynamic>;
          final status = item['status']?.toString();
          final done = status == 'completed';
          final ownId = widget.profile['accountId']?.toString();
          final customerId = item['customerId']?.toString();
          final providerId = item['providerId']?.toString();
          final isCustomer = ownId != null && ownId == customerId;
          final isProvider = ownId != null && ownId == providerId;
          final subjectId = isCustomer ? providerId : (isProvider ? customerId : null);
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(_categoryLabel(item['category']?.toString()),
                      style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
                StatusPill(nexoStateLabel(status), green: done),
              ]),
              const SizedBox(height: 10),
              Text('ID: ${item['id']}', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
              const SizedBox(height: 6),
              Row(children: [
                Expanded(child: Text(nexoDateTime(item['createdAt']), style: const TextStyle(color: AppColors.muted, fontSize: 12))),
                Text(nexoMoney(item['priceCents']), style: const TextStyle(fontWeight: FontWeight.w800)),
              ]),
              if (done && item['id'] != null && (isCustomer || isProvider)) ...[
                const SizedBox(height: 8),
                ServicePaymentsPanel(
                  api: widget.api,
                  serviceId: item['id'].toString(),
                  isCustomer: isCustomer,
                  isProvider: isProvider,
                ),
                if (subjectId != null)
                  RateServicePanel(
                    api: widget.api,
                    serviceId: item['id'].toString(),
                    subjectId: subjectId,
                  ),
              ],
            ])),
          );
        }),
      if (error != null) ...[const SizedBox(height: 16), ErrorPanel(error!)],
    ]);
  }

  String _categoryLabel(String? category) {
    switch (category) {
      case 'passenger_car':
        return 'Viagem de carro';
      case 'passenger_motorcycle':
        return 'Viagem de motocicleta';
      case 'delivery':
        return 'Entrega';
      case 'towing':
        return 'Guincho';
      default:
        return category ?? 'Serviço';
    }
  }
}

/// Real account tab backed by GET /me with logout.
class ProfileTab extends StatelessWidget {
  const ProfileTab({
    super.key,
    required this.api,
    required this.profile,
    required this.apiUrl,
    required this.roleLabel,
    required this.onLogout,
  });
  final NexoApi api;
  final Map<String, dynamic> profile;
  final String apiUrl;
  final String roleLabel;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) => PageColumn(children: [
        const Eyebrow('Perfil e configurações'),
        const SizedBox(height: 8),
        const Text('Sua conta', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
        const SizedBox(height: 22),
        Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            CircleAvatar(
              radius: 26,
              backgroundColor: const Color(0xFF34264E),
              child: Text(
                _initials(profile['displayName']?.toString() ?? '?'),
                style: const TextStyle(color: AppColors.purpleBright, fontWeight: FontWeight.w800),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(profile['displayName']?.toString() ?? '—',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 3),
                Text(profile['email']?.toString() ?? '—',
                    style: const TextStyle(color: AppColors.muted, fontSize: 12)),
              ]),
            ),
            StatusPill(roleLabel),
          ]),
          const SizedBox(height: 18),
          const Divider(color: AppColors.line),
          const SizedBox(height: 12),
          _InfoRow(label: 'Conta', value: profile['accountId']?.toString() ?? '—'),
          _InfoRow(label: 'Criada em', value: nexoDateTime(profile['createdAt'])),
          if (profile['bio'] != null && (profile['bio'] as String).isNotEmpty)
            _InfoRow(label: 'Bio', value: profile['bio'].toString()),
        ])),
        const SizedBox(height: 16),
        ProfileEditPanel(api: api, profile: profile),
        const SizedBox(height: 16),
        ReputationPanel(api: api, accountId: profile['accountId']?.toString()),
        const SizedBox(height: 16),
        Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Conexão', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          _InfoRow(label: 'API', value: apiUrl),
          const SizedBox(height: 8),
          const Text(
            'Notificações ficam na aba própria; pagamentos e avaliações ficam em cada serviço do histórico.',
            style: TextStyle(color: AppColors.muted, fontSize: 11),
          ),
        ])),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: onLogout,
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.errorBg,
            foregroundColor: AppColors.errorText,
          ),
          child: const Text('Sair da conta'),
        ),
        const SizedBox(height: 10),
        const Text('Sair encerra a sessão somente neste dispositivo.',
            style: TextStyle(color: AppColors.muted, fontSize: 11)),
      ]);

  String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts.first.isEmpty) return '?';
    final first = parts.first.substring(0, 1).toUpperCase();
    final last = parts.length > 1 ? parts.last.substring(0, 1).toUpperCase() : '';
    return '$first$last';
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 92, child: Text(label, style: const TextStyle(color: AppColors.muted, fontSize: 12))),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600))),
        ]),
      );
}
