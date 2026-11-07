import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

/// Passenger home for the current operational API. No simulated map, fare or ETA.
class NexoPassengerHome extends StatelessWidget {
  const NexoPassengerHome({
    super.key,
    required this.displayName,
    required this.position,
    required this.ride,
    required this.busy,
    required this.onRequestRide,
    required this.onLocate,
    this.error,
  });

  final String displayName;
  final Position? position;
  final Map<String, dynamic>? ride;
  final bool busy;
  final VoidCallback onRequestRide;
  final VoidCallback onLocate;
  final String? error;

  static const _background = Color(0xFF0B1020);
  static const _surface = Color(0xFF192039);
  static const _violet = Color(0xFF8A3FFC);
  static const _mint = Color(0xFF31E8C5);

  @override
  Widget build(BuildContext context) {
    final state = ride?['state']?.toString();
    final fare = ride?['fareCents'];
    final price = fare is num ? 'R\$ ${(fare / 100).toStringAsFixed(2)}' : null;
    return Scaffold(
      backgroundColor: _background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          children: [
            Row(children: [
              Container(width: 4, height: 46, decoration: BoxDecoration(
                color: _violet, borderRadius: BorderRadius.circular(4))),
              const SizedBox(width: 12),
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('NEXO', style: TextStyle(color: Colors.white,
                    fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2)),
                Text('PASSAGEIRO  /  MOBILIDADE',
                    style: TextStyle(color: Color(0xFFB2A4D6), fontSize: 10,
                        letterSpacing: 1.3)),
              ]),
              const Spacer(),
              IconButton(
                tooltip: 'Atualizar localização',
                onPressed: onLocate,
                icon: const Icon(Icons.my_location_rounded, color: _mint),
              ),
            ]),
            const SizedBox(height: 34),
            Text('Olá, ${displayName.isEmpty ? 'passageiro' : displayName}',
                style: const TextStyle(color: Color(0xFFB8BED3), fontSize: 15)),
            const SizedBox(height: 7),
            const Text('Para onde vamos?', style: TextStyle(
                color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800)),
            const SizedBox(height: 22),
            _panel(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Row(children: [
                  Icon(Icons.location_on_outlined, color: _mint),
                  SizedBox(width: 10),
                  Expanded(child: Text('Sua localização atual',
                      style: TextStyle(color: Colors.white,
                          fontWeight: FontWeight.w600, fontSize: 16))),
                ]),
                const SizedBox(height: 12),
                Text(position == null
                    ? 'Aguardando permissão e sinal GPS'
                    : 'GPS disponível • ${position!.latitude.toStringAsFixed(4)}, '
                      '${position!.longitude.toStringAsFixed(4)}',
                    style: const TextStyle(color: Color(0xFFB8BED3), fontSize: 12)),
                const SizedBox(height: 15),
                const Divider(color: Color(0xFF303850)),
                const SizedBox(height: 10),
                const Row(children: [
                  Icon(Icons.flag_outlined, color: Color(0xFFBCA0FF)),
                  SizedBox(width: 10),
                  Expanded(child: Text('Destino de teste operacional',
                      style: TextStyle(color: Color(0xFFD5D6E6)))),
                ]),
                const SizedBox(height: 10),
                const Text('Nesta versão, o destino é definido pelo fluxo '
                    'de teste da API. A escolha de endereço e o mapa real '
                    'serão integrados em uma etapa posterior.',
                    style: TextStyle(color: Color(0xFF9BA4BF), fontSize: 12)),
              ]),
            ),
            const SizedBox(height: 18),
            Container(
              height: 152,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: const LinearGradient(colors: [
                  Color(0xFF272044), Color(0xFF142D39)]),
              ),
              child: Stack(alignment: Alignment.center, children: [
                for (final diameter in [126.0, 90.0, 54.0])
                  Container(width: diameter, height: diameter,
                    decoration: BoxDecoration(shape: BoxShape.circle,
                      border: Border.all(color: _violet.withValues(alpha: .45)))),
                const Icon(Icons.near_me_rounded, color: _mint, size: 30),
                const Positioned(left: 16, bottom: 12,
                    child: Text('NEXO  •  MOBILIDADE INTELIGENTE',
                      style: TextStyle(color: Color(0xFFC5B5E9),
                        fontSize: 10, letterSpacing: 1))),
              ]),
            ),
            const SizedBox(height: 20),
            if (ride != null) _panel(child: Column(
              crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('SUA CORRIDA', style: TextStyle(
                    color: _mint, fontSize: 11, letterSpacing: 1.5)),
                const SizedBox(height: 10),
                Text('Estado: ${state ?? 'atualizando'}',
                    style: const TextStyle(color: Colors.white,
                      fontSize: 18, fontWeight: FontWeight.bold)),
                if (price != null) Padding(
                  padding: const EdgeInsets.only(top: 10),
                  child: Text('Valor confirmado pelo servidor: $price',
                      style: const TextStyle(color: Color(0xFFE7D8FF),
                          fontSize: 15))),
              ],
            )),
            if (ride != null) const SizedBox(height: 16),
            SizedBox(height: 56, child: FilledButton.icon(
              onPressed: busy || position == null ? null : onRequestRide,
              style: FilledButton.styleFrom(
                backgroundColor: _violet,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(17))),
              icon: busy
                  ? const SizedBox(width: 18, height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2,
                          color: Colors.white))
                  : const Icon(Icons.local_taxi_outlined),
              label: Text(busy ? 'Solicitando...' : 'Solicitar corrida de teste',
                style: const TextStyle(fontWeight: FontWeight.bold)),
            )),
            if (error != null) Padding(
              padding: const EdgeInsets.only(top: 18),
              child: Text(error!, style: const TextStyle(
                  color: Color(0xFFFFA8B5)))),
            const SizedBox(height: 16),
            const Text('Prévia visual integrada ao fluxo operacional existente. '
                'Não representa mapa em tempo real, estimativa de chegada '
                'ou confirmação de pagamento.',
                style: TextStyle(color: Color(0xFF8790A8), fontSize: 11)),
          ],
        ),
      ),
    );
  }

  Widget _panel({required Widget child}) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: _surface, borderRadius: BorderRadius.circular(22),
      border: Border.all(color: const Color(0xFF343450))),
    child: child,
  );
}
