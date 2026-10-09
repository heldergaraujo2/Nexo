import 'package:flutter/material.dart';

import 'api.dart';
import 'driver_shell.dart';
import 'passenger_shell.dart';
import 'theme.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, this.apiFactory});
  final ApiFactory? apiFactory;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final apiUrl = TextEditingController(text: 'http://10.0.2.2:3000/v1');
  final email = TextEditingController();
  final password = TextEditingController();
  String? error;
  bool busy = false;
  bool hidePassword = true;

  @override
  void dispose() {
    apiUrl.dispose();
    email.dispose();
    password.dispose();
    super.dispose();
  }

  String? _validate() {
    final url = apiUrl.text.trim();
    if (url.isEmpty || !(url.startsWith('http://') || url.startsWith('https://'))) {
      return 'Informe a URL da API começando com http:// ou https://.';
    }
    final mail = email.text.trim();
    if (mail.isEmpty || !mail.contains('@') || !mail.contains('.')) {
      return 'Informe um e-mail válido.';
    }
    if (password.text.length < 8) {
      return 'A senha precisa ter pelo menos 8 caracteres.';
    }
    return null;
  }

  Future<void> login() async {
    FocusScope.of(context).unfocus();
    final validation = _validate();
    if (validation != null) {
      setState(() => error = validation);
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final api = (widget.apiFactory ?? defaultApiFactory)(apiUrl.text.trim());
      final result = await api.send('POST', '/auth/login', body: {
        'email': email.text.trim(),
        'password': password.text,
      }) as Map<String, dynamic>;
      api.token = result['accessToken'] as String;
      final profile = await api.send('GET', '/me') as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(
        builder: (_) => profile['isProvider'] == true
            ? DriverShell(api: api, profile: profile, apiUrl: api.baseUrl)
            : PassengerShell(api: api, profile: profile, apiUrl: api.baseUrl),
      ));
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const SizedBox(height: 20),
                  const BrandMark(),
                  const SizedBox(height: 42),
                  const Eyebrow('Mobilidade, do seu jeito'),
                  const SizedBox(height: 10),
                  const Text('Sua próxima\nviagem começa aqui.',
                      style: TextStyle(fontSize: 32, height: 1.12, letterSpacing: -1.2, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 14),
                  const Text('Entre para continuar com segurança.',
                      style: TextStyle(color: AppColors.muted, fontSize: 14)),
                  const SizedBox(height: 30),
                  Panel(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Acessar sua conta', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                    const SizedBox(height: 20),
                    TextField(
                      controller: apiUrl,
                      keyboardType: TextInputType.url,
                      decoration: const InputDecoration(
                        labelText: 'URL da API',
                        prefixIcon: Icon(Icons.link_rounded),
                        hintText: 'http://192.168.1.10:3000/v1',
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'E-mail',
                        prefixIcon: Icon(Icons.mail_outline_rounded),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: password,
                      obscureText: hidePassword,
                      onSubmitted: (_) => busy ? null : login(),
                      decoration: InputDecoration(
                        labelText: 'Senha',
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          tooltip: hidePassword ? 'Mostrar senha' : 'Ocultar senha',
                          onPressed: () => setState(() => hidePassword = !hidePassword),
                          icon: Icon(hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                        ),
                      ),
                    ),
                    if (error != null) ...[
                      const SizedBox(height: 14),
                      ErrorPanel(error!),
                    ],
                    const SizedBox(height: 22),
                    FilledButton(
                      onPressed: busy ? null : login,
                      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                        if (busy)
                          const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        else
                          const Icon(Icons.arrow_forward_rounded),
                        const SizedBox(width: 9),
                        Text(busy ? 'Conectando…' : 'Entrar na Nexo'),
                      ]),
                    ),
                  ])),
                  const SizedBox(height: 16),
                  const Row(children: [
                    Icon(Icons.shield_outlined, size: 17, color: AppColors.green),
                    SizedBox(width: 8),
                    Expanded(child: Text('Conexão autenticada com a API do Nexo.', style: TextStyle(color: AppColors.muted, fontSize: 12))),
                  ]),
                  const SizedBox(height: 8),
                  const Text('Android físico: use o IP local do computador. O endereço 10.0.2.2 é para emuladores Android.',
                      style: TextStyle(color: AppColors.muted, fontSize: 11)),
                ]),
              ),
            ),
          ),
        ),
      );
}
