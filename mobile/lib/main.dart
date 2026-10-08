import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

void main() => runApp(const NexoApp());

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Nexo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo), useMaterial3: true),
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

  Future<void> login() async {
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
    appBar: AppBar(title: const Text('Nexo — teste operacional')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      const Text('URL da API LAN'),
      TextField(controller: apiUrl, keyboardType: TextInputType.url, decoration: const InputDecoration(hintText: 'http://192.168.1.10:3000/v1')),
      const SizedBox(height: 16),
      TextField(controller: email, decoration: const InputDecoration(labelText: 'E-mail')),
      const SizedBox(height: 12),
      TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Senha')),
      if (error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(error!)),
      const SizedBox(height: 20),
      FilledButton(onPressed: busy ? null : login, child: Text(busy ? 'Conectando…' : 'Entrar')),
      const SizedBox(height: 12),
      const Text('No celular, informe o IP LAN do PC. Não use localhost.'),
    ]),
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
      if (!await Geolocator.isLocationServiceEnabled()) throw Exception('Ative o GPS.');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) throw Exception('Permissão de localização negada.');
      final p = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
      if (mounted) setState(() => position = p);
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  Future<void> requestRide() async {
    setState(() { busy = true; error = null; });
    try {
      final p = position ?? await Geolocator.getCurrentPosition();
      await widget.api.send('POST', '/rides/requests', key: NexoApi.key(), body: {
        'vehicleType': 'car',
        'origin': {'latitude': p.latitude, 'longitude': p.longitude},
        'destination': {'latitude': p.latitude + 0.01, 'longitude': p.longitude + 0.01},
      });
      startPolling();
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

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('Passageiro — ${widget.profile['displayName']}')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      Text(position == null ? 'GPS: aguardando…' : 'GPS: ${position!.latitude.toStringAsFixed(5)}, ${position!.longitude.toStringAsFixed(5)}'),
      const SizedBox(height: 16),
      FilledButton(onPressed: busy ? null : requestRide, child: const Text('Solicitar corrida')),
      const SizedBox(height: 20),
      if (ride != null) ...[
        Text('Estado: ${ride!['state']}', style: Theme.of(context).textTheme.headlineSmall),
        Text('Preço server-authoritative: R\$ ${((ride!['fareCents'] as num) / 100).toStringAsFixed(2)}'),
      ] else const Text('Aguardando motorista…'),
      if (error != null) Text(error!),
    ]),
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

  @override void initState() { super.initState(); online(); }
  @override void dispose() { timer?.cancel(); super.dispose(); }

  Future<void> online() async {
    try {
      await widget.api.send('PUT', '/me/marketplace', body: {'categories': ['passenger_car'], 'availability': 'available', 'acceptingRequests': true});
      poll();
      if (mounted) setState(() {});
    } catch (e) { if (mounted) setState(() => error = e.toString()); }
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
    try { service = await widget.api.send('POST', '/requests/$id/accept', key: NexoApi.key()) as Map<String, dynamic>; if (mounted) setState(() {}); }
    catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  Future<void> transition(String action) async {
    final id = ride?['id'] as String?;
    if (id == null) return;
    try { ride = await widget.api.send('POST', '/rides/$id/$action', key: NexoApi.key()) as Map<String, dynamic>; if (mounted) setState(() {}); }
    catch (e) { if (mounted) setState(() => error = e.toString()); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text('Motorista — ${widget.profile['displayName']}')),
    body: ListView(padding: const EdgeInsets.all(20), children: [
      const Text('ONLINE — aguardando chamada'),
      if (service == null) ...requests.map((r) => Card(child: ListTile(
        title: Text('Solicitação ${r['id']}'),
        subtitle: Text('${r['origin']} → ${r['destination']}'),
        trailing: FilledButton(onPressed: () => accept(r['id'] as String), child: const Text('Aceitar')),
      ))) else ...[
        Text('Estado: ${ride?['state'] ?? service?['status'] ?? 'carregando…'}', style: Theme.of(context).textTheme.headlineSmall),
        if (ride?['state'] == 'accepted') FilledButton(onPressed: () => transition('driver-en-route'), child: const Text('A caminho')),
        if (ride?['state'] == 'driver_en_route') FilledButton(onPressed: () => transition('arrived'), child: const Text('Cheguei')),
        if (ride?['state'] == 'arrived') FilledButton(onPressed: () => transition('start'), child: const Text('Iniciar')),
        if (ride?['state'] == 'started') FilledButton(onPressed: () => transition('complete'), child: const Text('Concluir')),
      ],
      if (error != null) Text(error!),
    ]),
  );
}
