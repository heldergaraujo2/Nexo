import 'dart:async';

import 'package:flutter/material.dart';

import 'account_tabs.dart';
import 'api.dart';
import 'location.dart';
import 'login_page.dart';
import 'theme.dart';

class PassengerShell extends StatefulWidget {
  const PassengerShell({
    super.key,
    required this.api,
    required this.profile,
    required this.apiUrl,
    this.locate,
    this.apiFactory,
  });
  final NexoApi api;
  final Map<String, dynamic> profile;
  final String apiUrl;
  final Locate? locate;
  final ApiFactory? apiFactory;

  @override
  State<PassengerShell> createState() => _PassengerShellState();
}

class _PassengerShellState extends State<PassengerShell> {
  int tab = 0;
  Timer? timer;

  NexoLocation? position;
  String? locationError;
  String? flowError;
  bool busy = false;

  final destLat = TextEditingController();
  final destLng = TextEditingController();
  final cancelReason = TextEditingController();
  String vehicle = 'car';

  String? requestId;
  Map<String, dynamic>? estimate;
  String? serviceId;
  Map<String, dynamic>? ride;

  @override
  void initState() {
    super.initState();
    locate();
  }

  @override
  void dispose() {
    timer?.cancel();
    destLat.dispose();
    destLng.dispose();
    cancelReason.dispose();
    super.dispose();
  }

  Future<void> locate() async {
    try {
      final loc = await (widget.locate ?? deviceLocate)();
      if (mounted) {
        setState(() {
          position = loc;
          locationError = null;
        });
      }
    } catch (e) {
      if (mounted) setState(() => locationError = e.toString());
    }
  }

  Future<void> requestRide() async {
    FocusScope.of(context).unfocus();
    final validation = validateCoordinate(destLat.text, destLng.text);
    if (validation != null) {
      setState(() => flowError = validation);
      return;
    }
    if (position == null) {
      setState(() => flowError =
          'Precisamos da sua localização para solicitar. Toque no ícone de GPS na barra superior.');
      return;
    }
    setState(() {
      busy = true;
      flowError = null;
    });
    try {
      final destination = NexoLocation(
        latitude: double.parse(destLat.text.trim().replaceAll(',', '.')),
        longitude: double.parse(destLng.text.trim().replaceAll(',', '.')),
      );
      final result = await widget.api.send('POST', '/rides/requests', key: NexoApi.key(), body: {
        'vehicleType': vehicle,
        'origin': position!.toJson(),
        'destination': destination.toJson(),
      }) as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        requestId = result['requestId'] as String?;
        estimate = result;
      });
      startPolling();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Solicitação enviada ao servidor Nexo.')),
      );
    } catch (e) {
      if (mounted) setState(() => flowError = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void startPolling() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 2), (_) => refreshTrip());
  }

  Future<void> refreshTrip() async {
    if (requestId == null) return;
    try {
      if (serviceId == null) {
        final history = await widget.api.send('GET', '/me/services/history') as List<dynamic>;
        final match = history.whereType<Map<String, dynamic>>().where(
              (s) => s['requestId'] == requestId && s['status'] != 'cancelled',
            );
        if (match.isNotEmpty) serviceId = match.first['id'] as String?;
      }
      if (serviceId != null && ride == null) {
        final service = await widget.api.send('GET', '/services/$serviceId') as Map<String, dynamic>;
        final rideId = service['rideId'] as String?;
        if (rideId != null) {
          ride = await widget.api.send('GET', '/rides/$rideId') as Map<String, dynamic>;
        }
      } else if (ride != null) {
        ride = await widget.api.send('GET', '/rides/${ride!['id']}') as Map<String, dynamic>;
      }
      if (mounted) setState(() {});
    } catch (_) {
      // Transient polling failures are retried on the next tick.
    }
  }

  Future<void> askCancel() async {
    cancelReason.clear();
    final ok = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancelar solicitação'),
        content: TextField(
          controller: cancelReason,
          maxLength: 500,
          decoration: const InputDecoration(labelText: 'Motivo (opcional)'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Voltar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Confirmar cancelamento'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    await cancelTrip();
  }

  Future<void> cancelTrip() async {
    setState(() {
      busy = true;
      flowError = null;
    });
    try {
      final reason = cancelReason.text.trim();
      final body = reason.isEmpty ? <String, dynamic>{} : <String, dynamic>{'reason': reason};
      if (ride != null) {
        await widget.api.send('POST', '/rides/${ride!['id']}/cancel', key: NexoApi.key(), body: body);
      } else if (requestId != null) {
        await widget.api.send('POST', '/requests/$requestId/cancel', key: NexoApi.key(), body: body);
      }
      if (!mounted) return;
      setState(() {
        requestId = null;
        estimate = null;
        serviceId = null;
        ride = null;
      });
      timer?.cancel();
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Solicitação cancelada.')));
    } catch (e) {
      if (mounted) setState(() => flowError = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  void resetTrip() {
    timer?.cancel();
    setState(() {
      requestId = null;
      estimate = null;
      serviceId = null;
      ride = null;
      flowError = null;
    });
  }

  void logout() {
    timer?.cancel();
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute<void>(builder: (_) => LoginPage(apiFactory: widget.apiFactory)),
      (route) => false,
    );
  }

  String get tripState {
    if (ride != null) return nexoStateLabel(ride!['state'] as String?);
    if (serviceId != null) return 'MOTORISTA A CAMINHO';
    return 'PROCURANDO MOTORISTA';
  }

  bool get tripFinished =>
      ride != null && (ride!['state'] == 'completed' || ride!['state'] == 'cancelled');

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
          title: const BrandMark(compact: true),
          actions: [
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: IconButton(
                tooltip: 'Atualizar localização',
                onPressed: locate,
                icon: const Icon(Icons.my_location_rounded, color: AppColors.purpleBright),
              ),
            ),
          ],
        ),
        body: IndexedStack(
          index: tab,
          children: [
            homeTab(),
            TripsTab(api: widget.api),
            ProfileTab(
              api: widget.api,
              profile: widget.profile,
              apiUrl: widget.apiUrl,
              roleLabel: 'PASSAGEIRO',
              onLogout: logout,
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          backgroundColor: AppColors.surface,
          selectedIndex: tab,
          onDestinationSelected: (value) => setState(() => tab = value),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.home_rounded), label: 'Início'),
            NavigationDestination(icon: Icon(Icons.receipt_long_rounded), label: 'Viagens'),
            NavigationDestination(icon: Icon(Icons.person_outline_rounded), label: 'Perfil'),
          ],
        ),
      );

  Widget homeTab() => PageColumn(children: [
        const Eyebrow('Área do passageiro'),
        const SizedBox(height: 8),
        Text('Olá, ${widget.profile['displayName'] ?? 'bem-vindo(a)'} 👋',
            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
        const SizedBox(height: 6),
        const Text('Para onde vamos hoje?', style: TextStyle(color: AppColors.muted)),
        const SizedBox(height: 22),
        Container(
          height: 178,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF30204E), Color(0xFF171323), Color(0xFF10101A)]),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.line),
          ),
          child: Stack(children: [
            Positioned(right: -8, top: -22, child: Icon(Icons.route_rounded, size: 160, color: AppColors.purple.withValues(alpha: .12))),
            Padding(
              padding: const EdgeInsets.all(18),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                StatusPill(position == null ? 'LOCALIZANDO GPS' : 'GPS LOCALIZADO', green: position != null),
                const Spacer(),
                const Text('Sua cidade.\nSeu caminho.',
                    style: TextStyle(fontSize: 23, height: 1.12, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text(
                  position == null
                      ? 'Precisamos da sua localização para solicitar.'
                      : '${position!.latitude.toStringAsFixed(4)}, ${position!.longitude.toStringAsFixed(4)}',
                  style: const TextStyle(color: AppColors.muted, fontSize: 12),
                ),
              ]),
            ),
          ]),
        ),
        if (locationError != null) ...[const SizedBox(height: 14), ErrorPanel(locationError!)],
        const SizedBox(height: 18),
        if (requestId == null) requestPanel() else tripPanel(),
        if (flowError != null) ...[const SizedBox(height: 16), ErrorPanel(flowError!)],
      ]);

  Widget requestPanel() => Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Solicitar uma viagem', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 5),
        const Text('Escolha a categoria e informe o destino real.',
            style: TextStyle(color: AppColors.muted, fontSize: 12)),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: vehicleCard('car', 'Nexo Carro', 'Viagem particular', Icons.directions_car_rounded)),
          const SizedBox(width: 10),
          Expanded(child: vehicleCard('motorcycle', 'Nexo Moto', 'Mais ágil', Icons.motorcycle_rounded)),
        ]),
        const SizedBox(height: 16),
        const Text('Destino (coordenadas)', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 5),
        const Text(
          'A busca de endereços ainda não está integrada. Informe a latitude e a longitude do destino.',
          style: TextStyle(color: AppColors.muted, fontSize: 11),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: destLat,
          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
          decoration: const InputDecoration(labelText: 'Latitude do destino', hintText: 'ex.: -23.550520'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: destLng,
          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
          decoration: const InputDecoration(labelText: 'Longitude do destino', hintText: 'ex.: -46.633308'),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: busy || position == null ? null : requestRide,
          child: Text(busy ? 'Enviando solicitação…' : 'Solicitar corrida  →'),
        ),
        const SizedBox(height: 10),
        const Text(
          'A distância e a tarifa são calculadas pelo servidor. Nenhum destino é preenchido automaticamente.',
          style: TextStyle(color: AppColors.muted, fontSize: 11),
        ),
      ]));

  Widget vehicleCard(String value, String title, String subtitle, IconData icon) {
    final selected = vehicle == value;
    return InkWell(
      borderRadius: BorderRadius.circular(15),
      onTap: () => setState(() => vehicle = value),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface2,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: selected ? AppColors.purple : AppColors.line),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF34264E),
            child: Icon(icon, color: AppColors.purpleBright, size: 20),
          ),
          const SizedBox(height: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: AppColors.muted, fontSize: 11)),
        ]),
      ),
    );
  }

  Widget tripPanel() => Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.radar_rounded, color: AppColors.purpleBright, size: 28),
          const SizedBox(width: 10),
          Expanded(child: Text(tripState, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))),
          StatusPill(nexoMoney(estimate?['fareCents'] ?? ride?['fareCents'])),
        ]),
        const SizedBox(height: 12),
        if (estimate != null) ...[
          Text(
            'Distância estimada: ${nexoMeters(estimate?['distanceMeters'])} m',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 4),
        ],
        if (ride != null) ...[
          Text(
            'Distância da corrida: ${nexoMeters(ride?['distanceMeters'])} m',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
          const SizedBox(height: 4),
          Text(
            'Atualizado pelo servidor: ${nexoDateTime(ride!['updatedAt'])}',
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
        if (requestId != null) ...[
          const SizedBox(height: 6),
          Text('Solicitação: $requestId', style: const TextStyle(color: AppColors.muted, fontSize: 11)),
        ],
        const SizedBox(height: 14),
        if (tripFinished)
          FilledButton(onPressed: resetTrip, child: const Text('Fazer nova solicitação'))
        else
          FilledButton(
            onPressed: busy ? null : askCancel,
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.errorBg,
              foregroundColor: AppColors.errorText,
            ),
            child: const Text('Cancelar solicitação'),
          ),
        const SizedBox(height: 10),
        const Text(
          'O cancelamento envia o motivo ao servidor e segue as regras de estado da API.',
          style: TextStyle(color: AppColors.muted, fontSize: 11),
        ),
      ]));
}
