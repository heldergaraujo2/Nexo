import 'dart:async';

import 'package:flutter/material.dart';

import 'account_tabs.dart';
import 'api.dart';
import 'login_page.dart';
import 'theme.dart';

class DriverShell extends StatefulWidget {
  const DriverShell({
    super.key,
    required this.api,
    required this.profile,
    required this.apiUrl,
    this.apiFactory,
  });
  final NexoApi api;
  final Map<String, dynamic> profile;
  final String apiUrl;
  final ApiFactory? apiFactory;

  @override
  State<DriverShell> createState() => _DriverShellState();
}

class _DriverShellState extends State<DriverShell> {
  int tab = 0;
  Timer? timer;
  bool available = true;
  bool connecting = true;
  bool busy = false;
  String? error;
  List<dynamic> requests = [];
  Map<String, dynamic>? service;
  Map<String, dynamic>? ride;

  @override
  void initState() {
    super.initState();
    setAvailability(true);
  }

  @override
  void dispose() {
    timer?.cancel();
    super.dispose();
  }

  Future<void> setAvailability(bool value) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      await widget.api.send('PUT', '/me/marketplace', body: {
        'categories': ['passenger_car'],
        'availability': value ? 'available' : 'offline',
        'acceptingRequests': value,
      });
      if (!mounted) return;
      setState(() {
        available = value;
        if (!value) requests = [];
      });
      if (value) {
        startPolling();
      } else {
        timer?.cancel();
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) {
        setState(() {
          connecting = false;
          busy = false;
        });
      }
    }
  }

  void startPolling() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 2), (_) => poll());
  }

  Future<void> poll() async {
    try {
      if (ride != null) {
        ride = await widget.api.send('GET', '/rides/${ride!['id']}') as Map<String, dynamic>;
      } else if (service != null) {
        final data = await widget.api.send('GET', '/services/${service!['id']}') as Map<String, dynamic>;
        service = data;
        final rideId = data['rideId'] as String?;
        if (rideId != null) {
          ride = await widget.api.send('GET', '/rides/$rideId') as Map<String, dynamic>;
        }
      } else if (available) {
        final data = await widget.api.send('GET', '/me/marketplace/open-requests') as Map<String, dynamic>;
        requests = (data['requests'] as List<dynamic>?) ?? [];
      }
      if (mounted) setState(() {});
    } catch (_) {
      // Transient polling failures are retried on the next tick.
    }
  }

  Future<void> accept(String requestId) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final data = await widget.api.send('POST', '/requests/$requestId/accept', key: NexoApi.key())
          as Map<String, dynamic>;
      final serviceId = data['id'] as String?;
      Map<String, dynamic>? loadedService;
      if (serviceId != null) {
        loadedService = await widget.api.send('GET', '/services/$serviceId') as Map<String, dynamic>;
      }
      Map<String, dynamic>? loadedRide;
      final rideId = loadedService?['rideId'] as String?;
      if (rideId != null) {
        loadedRide = await widget.api.send('GET', '/rides/$rideId') as Map<String, dynamic>;
      }
      if (!mounted) return;
      setState(() {
        service = loadedService ?? data;
        ride = loadedRide;
        requests = [];
      });
      startPolling();
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> transition(String action) async {
    final rideId = ride?['id'] as String?;
    if (rideId == null) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      ride = await widget.api.send('POST', '/rides/$rideId/$action', key: NexoApi.key())
          as Map<String, dynamic>;
      if (mounted) setState(() {});
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void finishRide() {
    timer?.cancel();
    setState(() {
      service = null;
      ride = null;
    });
    startPolling();
  }

  void logout() {
    timer?.cancel();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => LoginPage(apiFactory: widget.apiFactory)),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const BrandMark(compact: true),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: StatusPill(
                connecting ? 'CONECTANDO' : available ? 'ONLINE' : 'OFFLINE',
                green: !connecting && available,
              ),
            ),
          ],
        ),
        body: IndexedStack(
          index: tab,
          children: [
            radarTab(),
            TripsTab(api: widget.api),
            ProfileTab(
              api: widget.api,
              profile: widget.profile,
              apiUrl: widget.apiUrl,
              roleLabel: 'MOTORISTA',
              onLogout: logout,
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          backgroundColor: AppColors.surface,
          selectedIndex: tab,
          onDestinationSelected: (value) => setState(() => tab = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.radar_rounded), label: 'Chamadas'),
            NavigationDestination(icon: Icon(Icons.route_rounded), label: 'Viagens'),
            NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Perfil'),
          ],
        ),
      );

  Widget radarTab() => PageColumn(children: [
        const Eyebrow('Central do motorista'),
        const SizedBox(height: 8),
        Text('Olá, ${widget.profile['displayName'] ?? 'motorista'}',
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
        const SizedBox(height: 6),
        const Text('Pronto para a próxima viagem?', style: TextStyle(color: AppColors.muted)),
        const SizedBox(height: 22),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF30204E), Color(0xFF191425)]),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.line),
          ),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.radar_rounded, color: AppColors.purpleBright, size: 28),
              const SizedBox(width: 10),
              const Expanded(child: Text('Radar de chamadas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
              StatusPill(connecting ? 'AGUARDE' : available ? 'ATIVO' : 'PAUSADO', green: !connecting && available),
            ]),
            const SizedBox(height: 12),
            Text(
              service != null
                  ? 'Você está atendendo uma viagem.'
                  : '${requests.length} solicitaç${requests.length == 1 ? 'ão disponível' : 'ões disponíveis'}',
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 12),
            Row(children: [
              const Expanded(
                child: Text(
                  'Disponibilidade registrada no servidor',
                  style: TextStyle(color: AppColors.green, fontSize: 11),
                ),
              ),
              Switch(
                value: available,
                onChanged: busy ? null : setAvailability,
              ),
            ]),
          ]),
        ),
        const SizedBox(height: 18),
        if (service == null && requests.isEmpty)
          const Panel(child: Column(children: [
            Icon(Icons.hourglass_empty_rounded, size: 34, color: AppColors.muted),
            SizedBox(height: 12),
            Text('Aguardando novas chamadas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            SizedBox(height: 5),
            Text('Mantenha-se online. As solicitações disponíveis aparecerão aqui.',
                textAlign: TextAlign.center, style: TextStyle(color: AppColors.muted, fontSize: 12)),
          ]))
        else if (service == null)
          ...requests.map((r) {
            final item = r as Map<String, dynamic>;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  const Icon(Icons.directions_car_rounded, color: AppColors.purpleBright),
                  const SizedBox(width: 8),
                  const Expanded(child: Text('Nova solicitação', style: TextStyle(fontWeight: FontWeight.w800))),
                  const StatusPill('NOVA'),
                ]),
                const SizedBox(height: 12),
                Text('ID: ${item['id']}', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
                const SizedBox(height: 4),
                Text('Categoria: ${item['category']}', style: const TextStyle(color: AppColors.muted, fontSize: 12)),
                const SizedBox(height: 14),
                FilledButton(
                  onPressed: busy ? null : () => accept(item['id'] as String),
                  child: const Text('Aceitar chamada'),
                ),
              ])),
            );
          })
        else
          activeRidePanel(),
        if (error != null) ...[const SizedBox(height: 16), ErrorPanel(error!)],
      ]);

  Widget activeRidePanel() {
    final state = (ride?['state'] ?? service?['status'])?.toString();
    return Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Eyebrow('Atendimento atual'),
      const SizedBox(height: 10),
      Text(nexoStateLabel(state), style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
      const SizedBox(height: 7),
      const Text('Execute cada etapa após realizar a ação no mundo real.',
          style: TextStyle(color: AppColors.muted, fontSize: 12)),
      if (ride != null) ...[
        const SizedBox(height: 10),
        Text('Tarifa do servidor: ${nexoMoney(ride!['fareCents'])}',
            style: const TextStyle(fontWeight: FontWeight.w800)),
      ],
      const SizedBox(height: 16),
      if (ride?['state'] == 'accepted')
        FilledButton(onPressed: busy ? null : () => transition('driver-en-route'), child: const Text('Iniciar deslocamento')),
      if (ride?['state'] == 'driver_en_route')
        FilledButton(onPressed: busy ? null : () => transition('arrived'), child: const Text('Confirmar chegada')),
      if (ride?['state'] == 'arrived')
        FilledButton(onPressed: busy ? null : () => transition('start'), child: const Text('Iniciar viagem')),
      if (ride?['state'] == 'started')
        FilledButton(onPressed: busy ? null : () => transition('complete'), child: const Text('Concluir viagem')),
      if (ride?['state'] == 'completed') ...[
        const StatusPill('VIAGEM CONCLUÍDA', green: true),
        const SizedBox(height: 12),
        FilledButton(onPressed: busy ? null : finishRide, child: const Text('Voltar ao radar')),
      ],
      if (ride?['state'] == 'cancelled') ...[
        const StatusPill('VIAGEM CANCELADA'),
        const SizedBox(height: 12),
        FilledButton(onPressed: busy ? null : finishRide, child: const Text('Voltar ao radar')),
      ],
    ]));
  }
}
