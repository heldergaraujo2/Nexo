import 'package:flutter/material.dart';

void main() {
  runApp(const NexoApp());
}

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Nexo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
        useMaterial3: true,
      ),
      home: const NexoHomePage(),
    );
  }
}

class NexoHomePage extends StatelessWidget {
  const NexoHomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nexo')),
      body: const Center(
        child: Text('Nexo — conectando quem precisa a quem pode fazer.'),
      ),
    );
  }
}
