import 'package:flutter/material.dart';

import 'api.dart';
import 'theme.dart';

/// ---------------------------------------------------------------------------
/// Profile editing — PUT /me/profile (UpdateProfileDto: displayName, bio,
/// professionalInfo, photoUrl; all optional, trimmed server-side).
/// ---------------------------------------------------------------------------
class ProfileEditPanel extends StatefulWidget {
  const ProfileEditPanel({super.key, required this.api, required this.profile, this.onSaved});
  final NexoApi api;
  final Map<String, dynamic> profile;
  final VoidCallback? onSaved;

  @override
  State<ProfileEditPanel> createState() => _ProfileEditPanelState();
}

class _ProfileEditPanelState extends State<ProfileEditPanel> {
  final name = TextEditingController();
  final bio = TextEditingController();
  final professional = TextEditingController();
  final photo = TextEditingController();
  bool open = false;
  bool busy = false;
  String? error;
  String? done;

  @override
  void initState() {
    super.initState();
    name.text = widget.profile['displayName']?.toString() ?? '';
    bio.text = widget.profile['bio']?.toString() ?? '';
    professional.text = widget.profile['professionalInfo']?.toString() ?? '';
    photo.text = widget.profile['photoUrl']?.toString() ?? '';
  }

  @override
  void dispose() {
    name.dispose();
    bio.dispose();
    professional.dispose();
    photo.dispose();
    super.dispose();
  }

  Future<void> save() async {
    final displayName = name.text.trim();
    if (displayName.isNotEmpty && (displayName.length < 2 || displayName.length > 120)) {
      setState(() => error = 'O nome precisa ter entre 2 e 120 caracteres.');
      return;
    }
    if (bio.text.length > 500) {
      setState(() => error = 'A bio pode ter no máximo 500 caracteres.');
      return;
    }
    if (professional.text.length > 1000) {
      setState(() => error = 'A informação profissional pode ter no máximo 1000 caracteres.');
      return;
    }
    if (photo.text.length > 2048) {
      setState(() => error = 'A URL da foto pode ter no máximo 2048 caracteres.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
      done = null;
    });
    try {
      await widget.api.send('PUT', '/me/profile', body: {
        if (displayName.isNotEmpty) 'displayName': displayName,
        'bio': bio.text,
        'professionalInfo': professional.text,
        'photoUrl': photo.text.isEmpty ? null : photo.text,
      });
      if (!mounted) return;
      setState(() => done = 'Perfil atualizado.');
      widget.onSaved?.call();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Expanded(child: Text('Editar perfil', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800))),
          TextButton(
            onPressed: () => setState(() => open = !open),
            child: Text(open ? 'Fechar' : 'Abrir'),
          ),
        ]),
        if (open) ...[
          const SizedBox(height: 8),
          TextField(
            key: const Key('edit-displayName'),
            controller: name,
            decoration: const InputDecoration(labelText: 'Nome de exibição'),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('edit-bio'),
            controller: bio,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Bio (até 500 caracteres)'),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('edit-professionalInfo'),
            controller: professional,
            maxLines: 2,
            decoration: const InputDecoration(labelText: 'Informação profissional (até 1000)'),
          ),
          const SizedBox(height: 12),
          TextField(
            key: const Key('edit-photoUrl'),
            controller: photo,
            decoration: const InputDecoration(labelText: 'URL da foto (opcional)'),
          ),
          const SizedBox(height: 14),
          FilledButton(
            onPressed: busy ? null : save,
            child: Text(busy ? 'Salvando…' : 'Salvar perfil'),
          ),
          if (done != null) ...[const SizedBox(height: 10), Text(done!, style: const TextStyle(color: AppColors.green, fontSize: 12))],
          if (error != null) ...[const SizedBox(height: 10), ErrorPanel(error!)],
        ],
      ]));
}

/// ---------------------------------------------------------------------------
/// Reputation — GET /profiles/:accountId/ratings →
/// { average: String|null, total: int, ratings: [ {id, serviceId, authorId,
///    subjectId, score, comment, createdAt} ] }
/// ---------------------------------------------------------------------------
class ReputationPanel extends StatefulWidget {
  const ReputationPanel({super.key, required this.api, this.accountId});
  final NexoApi api;
  final String? accountId;

  @override
  State<ReputationPanel> createState() => _ReputationPanelState();
}

class _ReputationPanelState extends State<ReputationPanel> {
  Map<String, dynamic>? data;
  String? error;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    final id = widget.accountId;
    if (id == null || id.isEmpty) return;
    try {
      final result = await widget.api.send('GET', '/profiles/$id/ratings');
      if (mounted && result is Map<String, dynamic>) setState(() => data = result);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final id = widget.accountId;
    if (id == null || id.isEmpty) return const SizedBox.shrink();
    final ratings = (data?['ratings'] as List<dynamic>?) ?? const <dynamic>[];
    return Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Reputação', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
      const SizedBox(height: 10),
      if (data == null && error == null)
        const Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2))
      else if (error != null)
        ErrorPanel(error!)
      else ...[
        Row(children: [
          const Icon(Icons.star_rounded, color: AppColors.purpleBright),
          const SizedBox(width: 6),
          Text('${data?['average'] ?? '—'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(width: 8),
          Text('${data?['total'] ?? 0} avaliação(ões)', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
        ]),
        const SizedBox(height: 12),
        ...ratings.take(5).map((r) {
          final item = r as Map<String, dynamic>;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('${item['score']}★', style: const TextStyle(fontWeight: FontWeight.w800)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  item['comment']?.toString().isNotEmpty == true ? item['comment'].toString() : '(sem comentário)',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ),
            ]),
          );
        }),
      ],
    ]));
  }
}

/// ---------------------------------------------------------------------------
/// Payments — payment-records endpoints:
///   GET  /payment-records/services/:serviceId → [payment]
///   POST /payment-records/services/:serviceId (customer, Idempotency-Key)
///   POST /payment-records/:paymentId/confirm  (provider, Idempotency-Key)
/// payment = { id, serviceId, method, expectedAmountCents, confirmedAmountCents,
///             currency, status, externalReference, ... }
/// ---------------------------------------------------------------------------
class ServicePaymentsPanel extends StatefulWidget {
  const ServicePaymentsPanel({
    super.key,
    required this.api,
    required this.serviceId,
    required this.isCustomer,
    required this.isProvider,
  });
  final NexoApi api;
  final String serviceId;
  final bool isCustomer;
  final bool isProvider;

  @override
  State<ServicePaymentsPanel> createState() => _ServicePaymentsPanelState();
}

class _ServicePaymentsPanelState extends State<ServicePaymentsPanel> {
  bool open = false;
  bool busy = false;
  List<dynamic>? records;
  String? error;
  String? done;
  String method = 'pix';

  Future<void> load() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.api.send('GET', '/payment-records/services/${widget.serviceId}') as List<dynamic>;
      if (mounted) setState(() => records = data);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> toggle() async {
    setState(() => open = !open);
    if (open && records == null && !busy) await load();
  }

  Future<void> register() async {
    setState(() {
      busy = true;
      error = null;
      done = null;
    });
    try {
      await widget.api.send('POST', '/payment-records/services/${widget.serviceId}', body: {
        'method': method,
      }, key: NexoApi.key());
      if (mounted) setState(() => done = 'Pagamento registrado.');
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> confirm(String paymentId, dynamic amountCents) async {
    setState(() {
      busy = true;
      error = null;
      done = null;
    });
    try {
      await widget.api.send('POST', '/payment-records/$paymentId/confirm', body: {
        'confirmedAmountCents': amountCents is num ? amountCents.toInt() : 0,
      }, key: NexoApi.key());
      if (mounted) setState(() => done = 'Pagamento confirmado.');
      await load();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = records ?? const <dynamic>[];
    final hasActive = rows.any((r) {
      final s = (r as Map<String, dynamic>)['status']?.toString();
      return s == 'pending' || s == 'confirmed';
    });
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      TextButton.icon(
        onPressed: busy ? null : toggle,
        icon: const Icon(Icons.payments_outlined, size: 18, color: AppColors.purpleBright),
        label: Text(open ? 'Ocultar pagamentos' : 'Pagamentos'),
      ),
      if (open) ...[
        if (busy && records == null)
          const Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2))
        else
          ...rows.map((r) {
            final p = r as Map<String, dynamic>;
            final canConfirm = widget.isProvider && p['status']?.toString() == 'pending';
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.surface2,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.line),
                ),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(child: Text('${p['method']}', style: const TextStyle(fontWeight: FontWeight.w800))),
                    StatusPill('${p['status']}', green: p['status']?.toString() == 'confirmed'),
                  ]),
                  const SizedBox(height: 6),
                  Text('Esperado: ${nexoMoney(p['expectedAmountCents'])} · Confirmado: ${nexoMoney(p['confirmedAmountCents'])}',
                      style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                  if (canConfirm) ...[
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: busy ? null : () => confirm(p['id'].toString(), p['expectedAmountCents']),
                      child: const Text('Confirmar pagamento'),
                    ),
                  ],
                ]),
              ),
            );
          }),
        if (rows.isEmpty && !busy && error == null)
          const Text('Nenhum registro de pagamento para este serviço.', style: TextStyle(color: AppColors.muted, fontSize: 12)),
        if (widget.isCustomer && !hasActive) ...[
          const SizedBox(height: 8),
          Row(children: [
            Expanded(
              child: DropdownButton<String>(
                value: method,
                isExpanded: true,
                dropdownColor: AppColors.surface2,
                items: const [
                  DropdownMenuItem(value: 'pix', child: Text('pix')),
                  DropdownMenuItem(value: 'cash', child: Text('cash')),
                  DropdownMenuItem(value: 'provider_card_machine', child: Text('provider_card_machine')),
                ],
                onChanged: (v) => setState(() => method = v ?? 'pix'),
              ),
            ),
            const SizedBox(width: 10),
            // Finite minimumSize: the theme's Size.fromHeight(54) sets
            // minWidth=∞, which is only valid when every layout pass hands out
            // bounded width. RenderFlex lays out non-flex Row children with
            // unbounded main-axis constraints first (phase 1); Expanded makes
            // this a flex child (phase 2, bounded share) and the finite
            // minimumSize neutralises the infinite min-width at the source.
            Expanded(
              child: FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(64, 54)),
                onPressed: busy ? null : register,
                child: const Text('Registrar pagamento', overflow: TextOverflow.ellipsis),
              ),
            ),
          ]),
        ],
        if (done != null) ...[const SizedBox(height: 8), Text(done!, style: const TextStyle(color: AppColors.green, fontSize: 12))],
        if (error != null) ...[const SizedBox(height: 8), ErrorPanel(error!)],
      ],
    ]);
  }
}

/// ---------------------------------------------------------------------------
/// Ratings — POST /ratings {serviceId, subjectId, score 1..5, comment?} →
/// { id, serviceId, authorId, subjectId, score, comment, moderationState, createdAt }
/// ---------------------------------------------------------------------------
class RateServicePanel extends StatefulWidget {
  const RateServicePanel({super.key, required this.api, required this.serviceId, required this.subjectId});
  final NexoApi api;
  final String serviceId;
  final String subjectId;

  @override
  State<RateServicePanel> createState() => _RateServicePanelState();
}

class _RateServicePanelState extends State<RateServicePanel> {
  int score = 0;
  final comment = TextEditingController();
  bool busy = false;
  String? error;
  String? done;

  @override
  void dispose() {
    comment.dispose();
    super.dispose();
  }

  Future<void> send() async {
    if (score < 1 || score > 5) {
      setState(() => error = 'Escolha uma nota de 1 a 5.');
      return;
    }
    setState(() {
      busy = true;
      error = null;
      done = null;
    });
    try {
      await widget.api.send('POST', '/ratings', body: {
        'serviceId': widget.serviceId,
        'subjectId': widget.subjectId,
        'score': score,
        if (comment.text.trim().isNotEmpty) 'comment': comment.text.trim(),
      });
      if (mounted) setState(() => done = 'Avaliação enviada.');
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 8),
        const Text('Avaliar este serviço', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 8),
        Row(children: [
          for (var i = 1; i <= 5; i++)
            IconButton(
              key: Key('star-$i'),
              onPressed: () => setState(() => score = i),
              icon: Icon(
                i <= score ? Icons.star_rounded : Icons.star_outline_rounded,
                color: AppColors.purpleBright,
              ),
            ),
        ]),
        TextField(
          key: const Key('rating-comment'),
          controller: comment,
          maxLength: 1000,
          decoration: const InputDecoration(labelText: 'Comentário (opcional)'),
        ),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: busy ? null : send,
          child: Text(busy ? 'Enviando…' : 'Enviar avaliação'),
        ),
        if (done != null) ...[const SizedBox(height: 8), Text(done!, style: const TextStyle(color: AppColors.green, fontSize: 12))],
        if (error != null) ...[const SizedBox(height: 8), ErrorPanel(error!)],
      ]);
}

/// ---------------------------------------------------------------------------
/// Notifications — GET /me/notifications →
/// [ {id, type, payload, readAt, createdAt} ] (LIMIT 100, newest first)
/// ---------------------------------------------------------------------------
class NotificationsTab extends StatefulWidget {
  const NotificationsTab({super.key, required this.api});
  final NexoApi api;

  @override
  State<NotificationsTab> createState() => _NotificationsTabState();
}

class _NotificationsTabState extends State<NotificationsTab> {
  List<dynamic>? items;
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
      final data = await widget.api.send('GET', '/me/notifications') as List<dynamic>;
      if (mounted) setState(() => items = data);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final rows = items ?? const <dynamic>[];
    return PageColumn(children: [
      Row(children: [
        const Expanded(child: Eyebrow('Notificações')),
        IconButton(
          tooltip: 'Atualizar notificações',
          onPressed: busy ? null : load,
          icon: const Icon(Icons.refresh_rounded, color: AppColors.purpleBright),
        ),
      ]),
      const SizedBox(height: 8),
      const Text('Avisos da sua conta', style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
      const SizedBox(height: 6),
      const Text('Carregados do servidor Nexo (últimas 100).', style: TextStyle(color: AppColors.muted)),
      const SizedBox(height: 22),
      if (busy && items == null)
        const Panel(child: Center(child: Padding(padding: EdgeInsets.all(8), child: CircularProgressIndicator(strokeWidth: 2))))
      else if (rows.isEmpty)
        const Panel(child: Column(children: [
          Icon(Icons.notifications_none_rounded, size: 34, color: AppColors.muted),
          SizedBox(height: 12),
          Text('Nenhuma notificação', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        ]))
      else
        ...rows.map((row) {
          final item = row as Map<String, dynamic>;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Expanded(
                  child: Text(_typeLabel(item['type']?.toString()), style: const TextStyle(fontWeight: FontWeight.w800)),
                ),
                StatusPill(item['readAt'] == null ? 'NOVA' : 'LIDA', green: item['readAt'] != null),
              ]),
              const SizedBox(height: 8),
              Text(item['payload']?.toString() ?? '—', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
              const SizedBox(height: 8),
              Text(nexoDateTime(item['createdAt']), style: const TextStyle(color: AppColors.muted, fontSize: 11)),
            ])),
          );
        }),
      if (error != null) ...[const SizedBox(height: 16), ErrorPanel(error!)],
    ]);
  }

  String _typeLabel(String? type) {
    switch (type) {
      case 'service_request.matched':
        return 'Chamada aceita';
      case 'ride.state_changed':
        return 'Estado da viagem';
      case 'payment.created':
        return 'Pagamento registrado';
      case 'payment.confirmed':
        return 'Pagamento confirmado';
      default:
        return type ?? 'Notificação';
    }
  }
}
