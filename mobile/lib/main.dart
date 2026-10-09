import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

const _bg = Color(0xFF0A0912);
const _surface = Color(0xFF151321);
const _surface2 = Color(0xFF201C31);
const _purple = Color(0xFF9B72FF);
const _purpleBright = Color(0xFFB59AFF);
const _green = Color(0xFF56E3A2);
const _muted = Color(0xFFAAA5BC);
const _line = Color(0xFF302A43);

void main() => runApp(const NexoApp());

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Nexo',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: _bg,
      colorScheme: const ColorScheme.dark(primary: _purple, secondary: _green, surface: _surface),
      useMaterial3: true,
      fontFamily: 'Plus Jakarta Sans',
      appBarTheme: const AppBarTheme(backgroundColor: _bg, foregroundColor: Colors.white, elevation: 0, centerTitle: false),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: _surface2,
        hintStyle: const TextStyle(color: _muted),
        labelStyle: const TextStyle(color: _muted),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: _line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: _line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: _purple)),
      ),
      filledButtonTheme: FilledButtonThemeData(style: FilledButton.styleFrom(
        backgroundColor: _purple, foregroundColor: Colors.white, disabledBackgroundColor: _surface2,
        minimumSize: const Size.fromHeight(54), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      )),
      cardTheme: CardThemeData(color: _surface, elevation: 0, margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: _line))),
    ),
    home: const LoginPage(),
  );
}

class NexoApi {
  NexoApi(String url) : baseUrl = url.trim().replaceFirst(RegExp(r'/$'), '');
  String baseUrl;
  String? token;

  Future<dynamic> send(String method, String path, {Object? body, String? key}) async {
    final request = http.Request(method, Uri.parse('$baseUrl$path'));
    request.headers['content-type'] = 'application/json';
    if (token != null) request.headers['authorization'] = 'Bearer $token';
    if (key != null) request.headers['idempotency-key'] = key;
    if (body != null) request.body = jsonEncode(body);
    final response = await request.send().timeout(const Duration(seconds: 12));
    final raw = await response.stream.bytesToString();
    final data = raw.isEmpty ? null : jsonDecode(raw);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('HTTP ${response.statusCode}: ${data is Map ? data['message'] : raw}');
    }
    return data;
  }

  static String key() => '${DateTime.now().microsecondsSinceEpoch}';
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.compact = false});
  final bool compact;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
    Container(width: compact ? 36 : 48, height: compact ? 36 : 48,
      decoration: BoxDecoration(gradient: const LinearGradient(colors: [_purpleBright, _purple]), borderRadius: BorderRadius.circular(15)),
      child: Icon(Icons.bolt_rounded, color: Colors.white, size: compact ? 23 : 30)),
    const SizedBox(width: 11),
    Text('nexo', style: TextStyle(fontSize: compact ? 23 : 30, fontWeight: FontWeight.w800, letterSpacing: -1.2)),
  ]);
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = _purpleBright});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(), style: TextStyle(color: color, fontSize: 11, letterSpacing: 1.4, fontWeight: FontWeight.w800));
}

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(18)});
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity, padding: padding,
    decoration: BoxDecoration(color: _surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: _line)),
    child: child,
  );
}

class StatusPill extends StatelessWidget {
  const StatusPill(this.text, {super.key, this.green = false});
  final String text;
  final bool green;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
    decoration: BoxDecoration(color: (green ? _green : _purple).withValues(alpha: .12), borderRadius: BorderRadius.circular(30)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Container(width: 6, height: 6, decoration: BoxDecoration(color: green ? _green : _purpleBright, shape: BoxShape.circle)),
      const SizedBox(width: 7),
      Text(text, style: TextStyle(color: green ? _green : _purpleBright, fontSize: 11, fontWeight: FontWeight.w800)),
    ]),
  );
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override State<LoginPage> createState() => _LoginPageState();
}
class _LoginPageState extends State<LoginPage> {
  final apiUrl = TextEditingController(text: 'http://10.0.2.2:3000/v1');
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool busy = false;
  bool hidePassword = true;

  @override
  void dispose() { apiUrl.dispose(); email.dispose(); password.dispose(); super.dispose(); }

  Future<void> login() async {
    FocusScope.of(context).unfocus();
    setState(() { busy = true; error = null; });
    try {
      final api = NexoApi(apiUrl.text);
      final result = await api.send('POST', '/auth/login', body: {'email': email.text.trim(), 'password': password.text});
      api.token = result['accessToken'] as String;
      final profile = await api.send('GET', '/me') as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
        builder: (_) => profile['isProvider'] == true ? DriverPage(api: api, profile: profile) : PassengerPage(api: api, profile: profile),
      ));
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
    finally { if (mounted) setState(() => busy = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(child: Center(child: SingleChildScrollView(padding: const EdgeInsets.all(24), child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 480), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const SizedBox(height: 20),
        const BrandMark(),
        const SizedBox(height: 42),
        const Eyebrow('Mobilidade, do seu jeito'),
        const SizedBox(height: 10),
        const Text('Sua próxima\nviagem começa aqui.', style: TextStyle(fontSize: 32, height: 1.12, letterSpacing: -1.2, fontWeight: FontWeight.w800)),
        const SizedBox(height: 14),
        const Text('Entre para continuar com segurança.', style: TextStyle(color: _muted, fontSize: 14)),
        const SizedBox(height: 30),
        Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Acessar sua conta', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 20),
          TextField(controller: apiUrl, keyboardType: TextInputType.url, decoration: const InputDecoration(labelText: 'URL da API', prefixIcon: Icon(Icons.link_rounded), hintText: 'http://192.168.1.10:3000/v1')),
          const SizedBox(height: 14),
          TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'E-mail', prefixIcon: Icon(Icons.mail_outline_rounded))),
          const SizedBox(height: 14),
          TextField(controller: password, obscureText: hidePassword, onSubmitted: (_) => busy ? null : login(), decoration: InputDecoration(labelText: 'Senha', prefixIcon: const Icon(Icons.lock_outline_rounded), suffixIcon: IconButton(onPressed: () => setState(() => hidePassword = !hidePassword), icon: Icon(hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined)))),
          if (error != null) ...[
            const SizedBox(height: 14),
            Container(width: double.infinity, padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xFF3B1D2A), borderRadius: BorderRadius.circular(12)), child: Text(error!, style: const TextStyle(color: Color(0xFFFFA9B7)))),
          ],
          const SizedBox(height: 22),
          FilledButton(onPressed: busy ? null : login, child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            if (busy) const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) else const Icon(Icons.arrow_forward_rounded),
            const SizedBox(width: 9), Text(busy ? 'Conectando…' : 'Entrar na Nexo'),
          ])),
        ])),
        const SizedBox(height: 16),
        const Row(children: [Icon(Icons.shield_outlined, size: 17, color: _green), SizedBox(width: 8), Expanded(child: Text('Conexão autenticada com a API do Nexo.', style: TextStyle(color: _muted, fontSize: 12)))]),
        const SizedBox(height: 8),
        const Text('Android físico: use o IP local do computador. O endereço 10.0.2.2 é para emuladores Android.', style: TextStyle(color: _muted, fontSize: 11)),
      ]),
    )))),
  );
}

class PassengerPage extends StatefulWidget {
  const PassengerPage({super.key, required this.api, required this.profile});
  final NexoApi api; final Map<String, dynamic> profile;
  @override State<PassengerPage> createState() => _PassengerPageState();
}
class _PassengerPageState extends State<PassengerPage> {
  Position? position;
  Map<String, dynamic>? ride;
  String? serviceId;
  String? error;
  Timer? timer;
  bool busy = false;

  @override void initState() { super.initState(); locate(); }
  @override void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> locate() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) throw Exception('Ative o GPS do dispositivo para continuar.');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) throw Exception('Permissão de localização negada. Habilite-a nas configurações do dispositivo.');
      final p = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
      if (mounted) setState(() { position = p; error = null; });
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  Future<void> requestRide() async {
    setState(() { busy = true; error = null; });
    try {
      final p = position ?? await Geolocator.getCurrentPosition();
      await widget.api.send('POST', '/rides/requests', key: NexoApi.key(), body: {
        'vehicleType': 'car',
        'origin': {'latitude': p.latitude, 'longitude': p.longitude},
        // Temporary test destination retained from the operational prototype.
        'destination': {'latitude': p.latitude + 0.01, 'longitude': p.longitude + 0.01},
      });
      startPolling();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Solicitação enviada à API.')));
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
    finally { if (mounted) setState(() => busy = false); }
  }

  void startPolling() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 2), (_) async {
      try {
        final history = await widget.api.send('GET', '/me/services/history') as List<dynamic>;
        final found = history.cast<Map<String, dynamic>>().firstWhere(
          (s) => s['category'] == 'passenger_car' && s['status'] != 'cancelled',
          orElse: () => <String, dynamic>{},
        );
        if (found.isNotEmpty) {
          serviceId = found['id'] as String;
          final service = await widget.api.send('GET', '/services/$serviceId') as Map<String, dynamic>;
          final rideId = service['rideId'] as String?;
          if (rideId != null) ride = await widget.api.send('GET', '/rides/$rideId') as Map<String, dynamic>;
          if (mounted) setState(() {});
        }
      } catch (_) {}
    });
  }

  String get rideState => (ride?['state'] ?? 'searching').toString().replaceAll('_', ' ').toUpperCase();
  String money(dynamic cents) => cents is num ? 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}' : 'A calcular';

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const BrandMark(compact: true), actions: [Padding(padding: const EdgeInsets.only(right: 16), child: IconButton(tooltip: 'Atualizar localização', onPressed: locate, icon: const Icon(Icons.my_location_rounded, color: _purpleBright)))]),
    body: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 28), children: [
      const Eyebrow('Área do passageiro'),
      const SizedBox(height: 8),
      Text('Olá, ${widget.profile['displayName'] ?? 'bem-vindo(a)'} 👋', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
      const SizedBox(height: 6),
      const Text('Para onde vamos hoje?', style: TextStyle(color: _muted)),
      const SizedBox(height: 22),
      Container(height: 178, decoration: BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF30204E), Color(0xFF171323), Color(0xFF10101A)]),
        borderRadius: BorderRadius.circular(22), border: Border.all(color: _line)),
        child: Stack(children: [
          Positioned(right: -8, top: -22, child: Icon(Icons.route_rounded, size: 160, color: _purple.withValues(alpha: .12))),
          Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            StatusPill(position == null ? 'LOCALIZANDO GPS' : 'GPS LOCALIZADO', green: position != null),
            const Spacer(),
            const Text('Sua cidade.\nSeu caminho.', style: TextStyle(fontSize: 23, height: 1.12, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(position == null ? 'Precisamos da sua localização para solicitar.' : '${position!.latitude.toStringAsFixed(4)}, ${position!.longitude.toStringAsFixed(4)}', style: const TextStyle(color: _muted, fontSize: 12)),
          ])),
        ]),
      ),
      const SizedBox(height: 18),
      Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Solicitar uma viagem', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 5),
        const Text('Categoria disponível no fluxo operacional atual', style: TextStyle(color: _muted, fontSize: 12)),
        const SizedBox(height: 16),
        Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: _surface2, borderRadius: BorderRadius.circular(15), border: Border.all(color: _purple.withValues(alpha: .7))), child: const Row(children: [
          CircleAvatar(backgroundColor: Color(0xFF34264E), child: Icon(Icons.directions_car_rounded, color: _purpleBright)),
          SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Nexo Carro', style: TextStyle(fontWeight: FontWeight.w800)), SizedBox(height: 3), Text('Viagem particular', style: TextStyle(color: _muted, fontSize: 12))])),
          StatusPill('CARRO'),
        ])),
        const SizedBox(height: 16),
        FilledButton(onPressed: busy || position == null ? null : requestRide, child: Text(busy ? 'Enviando solicitação…' : 'Solicitar corrida  →')),
        const SizedBox(height: 10),
        const Text('A tarifa é calculada pelo servidor. O destino automático atual é temporário para testes.', style: TextStyle(color: _muted, fontSize: 11)),
      ])),
      if (ride != null) ...[
        const SizedBox(height: 18),
        Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Eyebrow('Viagem atual'),
          const SizedBox(height: 10),
          Row(children: [const Icon(Icons.radar_rounded, color: _purpleBright, size: 28), const SizedBox(width: 10), Expanded(child: Text(rideState, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800))), StatusPill(money(ride!['fareCents']))]),
          const SizedBox(height: 10),
          const Text('O status é atualizado a partir da API do Nexo.', style: TextStyle(color: _muted, fontSize: 12)),
        ])),
      ],
      if (error != null) ...[const SizedBox(height: 16), _ErrorPanel(error!)],
    ]),
    bottomNavigationBar: Container(color: _surface, padding: const EdgeInsets.fromLTRB(20, 12, 20, 18), child: const Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
      _NavItem(icon: Icons.home_rounded, label: 'Início', selected: true), _NavItem(icon: Icons.receipt_long_rounded, label: 'Viagens'), _NavItem(icon: Icons.person_outline_rounded, label: 'Perfil'),
    ])),
  );
}

class DriverPage extends StatefulWidget {
  const DriverPage({super.key, required this.api, required this.profile});
  final NexoApi api; final Map<String, dynamic> profile;
  @override State<DriverPage> createState() => _DriverPageState();
}
class _DriverPageState extends State<DriverPage> {
  Timer? timer;
  List<dynamic> requests = [];
  Map<String, dynamic>? service;
  Map<String, dynamic>? ride;
  String? error;
  bool connecting = true;

  @override void initState() { super.initState(); online(); }
  @override void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> online() async {
    try {
      await widget.api.send('PUT', '/me/marketplace', body: {'categories': ['passenger_car'], 'availability': 'available', 'acceptingRequests': true});
      poll();
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
    finally { if (mounted) setState(() => connecting = false); }
  }

  void poll() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(seconds: 2), (_) async {
      try {
        if (service == null) {
          final data = await widget.api.send('GET', '/me/marketplace/open-requests') as Map<String, dynamic>;
          requests = data['requests'] as List<dynamic>? ?? [];
        } else {
          service = await widget.api.send('GET', '/services/${service!['id']}') as Map<String, dynamic>;
          final rideId = service!['rideId'] as String?;
          if (rideId != null) ride = await widget.api.send('GET', '/rides/$rideId') as Map<String, dynamic>;
        }
        if (mounted) setState(() {});
      } catch (_) {}
    });
  }

  Future<void> accept(String id) async {
    try {
      service = await widget.api.send('POST', '/requests/$id/accept', key: NexoApi.key()) as Map<String, dynamic>;
      if (mounted) setState(() { error = null; });
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  Future<void> transition(String action) async {
    final id = ride?['id'] as String?;
    if (id == null) return;
    try {
      ride = await widget.api.send('POST', '/rides/$id/$action', key: NexoApi.key()) as Map<String, dynamic>;
      if (mounted) setState(() => error = null);
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const BrandMark(compact: true), actions: [Padding(padding: const EdgeInsets.only(right: 16), child: StatusPill(connecting ? 'CONECTANDO' : error == null ? 'ONLINE' : 'ERRO', green: !connecting && error == null))]),
    body: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 28), children: [
      const Eyebrow('Central do motorista'),
      const SizedBox(height: 8),
      Text('Olá, ${widget.profile['displayName'] ?? 'motorista'}', style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -.7)),
      const SizedBox(height: 6),
      const Text('Pronto para a próxima viagem?', style: TextStyle(color: _muted)),
      const SizedBox(height: 22),
      Container(padding: const EdgeInsets.all(20), decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF30204E), Color(0xFF191425)]), borderRadius: BorderRadius.circular(22), border: Border.all(color: _line)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [const Icon(Icons.radar_rounded, color: _purpleBright, size: 28), const SizedBox(width: 10), const Expanded(child: Text('Radar de chamadas', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800))), StatusPill(connecting ? 'AGUARDE' : 'ATIVO', green: !connecting && error == null)]),
        const SizedBox(height: 12),
        Text(service == null ? '${requests.length} solicitaç${requests.length == 1 ? 'ão disponível' : 'ões disponíveis'}' : 'Você está atendendo uma viagem.', style: const TextStyle(color: _muted)),
        const SizedBox(height: 15),
        const Row(children: [Icon(Icons.sync_rounded, size: 16, color: _green), SizedBox(width: 7), Expanded(child: Text('Atualização automática a cada 2 segundos', style: TextStyle(color: _green, fontSize: 11)))]),
      ])),
      const SizedBox(height: 18),
      if (service == null && requests.isEmpty)
        const Panel(child: Column(children: [Icon(Icons.hourglass_empty_rounded, size: 34, color: _muted), SizedBox(height: 12), Text('Aguardando novas chamadas', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)), SizedBox(height: 5), Text('Mantenha-se online. As solicitações disponíveis aparecerão aqui.', textAlign: TextAlign.center, style: TextStyle(color: _muted, fontSize: 12))]))
      else if (service == null) ...requests.map((r) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [const Icon(Icons.directions_car_rounded, color: _purpleBright), const SizedBox(width: 8), const Expanded(child: Text('Nova solicitação', style: TextStyle(fontWeight: FontWeight.w800))), const StatusPill('NOVA')]),
        const SizedBox(height: 12),
        Text('ID: ${r['id']}', style: const TextStyle(color: _muted, fontSize: 11)),
        const SizedBox(height: 14),
        FilledButton(onPressed: () => accept(r['id'] as String), child: const Text('Aceitar chamada')),
      ]))))
      else ...[
        Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Eyebrow('Atendimento atual'),
          const SizedBox(height: 10),
          Text((ride?['state'] ?? service?['status'] ?? 'carregando…').toString().replaceAll('_', ' ').toUpperCase(), style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
          const SizedBox(height: 7),
          const Text('Execute cada etapa após realizar a ação no mundo real.', style: TextStyle(color: _muted, fontSize: 12)),
          const SizedBox(height: 16),
          if (ride?['state'] == 'accepted') FilledButton(onPressed: () => transition('driver-en-route'), child: const Text('Iniciar deslocamento')),
          if (ride?['state'] == 'driver_en_route') FilledButton(onPressed: () => transition('arrived'), child: const Text('Confirmar chegada')),
          if (ride?['state'] == 'arrived') FilledButton(onPressed: () => transition('start'), child: const Text('Iniciar viagem')),
          if (ride?['state'] == 'started') FilledButton(onPressed: () => transition('complete'), child: const Text('Concluir viagem')),
          if (ride?['state'] == 'completed') const StatusPill('VIAGEM CONCLUÍDA', green: true),
        ])),
      ],
      if (error != null) ...[const SizedBox(height: 16), _ErrorPanel(error!)],
    ]),
    bottomNavigationBar: Container(color: _surface, padding: const EdgeInsets.fromLTRB(20, 12, 20, 18), child: const Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
      _NavItem(icon: Icons.radar_rounded, label: 'Chamadas', selected: true), _NavItem(icon: Icons.route_rounded, label: 'Viagens'), _NavItem(icon: Icons.account_balance_wallet_outlined, label: 'Ganhos'),
    ])),
  );
}

class _NavItem extends StatelessWidget {
  const _NavItem({required this.icon, required this.label, this.selected = false});
  final IconData icon; final String label; final bool selected;
  @override
  Widget build(BuildContext context) => Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(icon, color: selected ? _purpleBright : _muted, size: 21),
    const SizedBox(height: 4),
    Text(label, style: TextStyle(color: selected ? _purpleBright : _muted, fontSize: 10, fontWeight: selected ? FontWeight.w800 : FontWeight.w500)),
  ]);
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: const Color(0xFF321D2A), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF653448))), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Icon(Icons.error_outline_rounded, color: Color(0xFFFFA9B7)), const SizedBox(width: 10), Expanded(child: Text(message, style: const TextStyle(color: Color(0xFFFFC1CB), fontSize: 12))),
  ]));
}
