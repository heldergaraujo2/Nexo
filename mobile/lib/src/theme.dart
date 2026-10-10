import 'package:flutter/material.dart';

/// Nexo visual system — dark surfaces, violet accent, green operational state.
class AppColors {
  AppColors._();
  static const bg = Color(0xFF0A0912);
  static const surface = Color(0xFF151321);
  static const surface2 = Color(0xFF201C31);
  static const purple = Color(0xFF9B72FF);
  static const purpleBright = Color(0xFFB59AFF);
  static const green = Color(0xFF56E3A2);
  static const muted = Color(0xFFAAA5BC);
  static const line = Color(0xFF302A43);
  static const errorBg = Color(0xFF321D2A);
  static const errorLine = Color(0xFF653448);
  static const errorText = Color(0xFFFFC1CB);
}

ThemeData nexoTheme() => ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.bg,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.purple,
        secondary: AppColors.green,
        surface: AppColors.surface,
      ),
      useMaterial3: true,
      fontFamily: 'Plus Jakarta Sans',
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.bg,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surface2,
        hintStyle: const TextStyle(color: AppColors.muted),
        labelStyle: const TextStyle(color: AppColors.muted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.line),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: AppColors.purple),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.purple,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.surface2,
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ),
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: AppColors.line),
        ),
      ),
    );

/// Formats server-authoritative cent values as BRL.
String nexoMoney(dynamic cents) => cents is num
    ? 'R\$ ${(cents / 100).toStringAsFixed(2).replaceAll('.', ',')}'
    : 'A calcular';

/// Formats a server distance in meters.
String nexoMeters(dynamic value) => value is num ? value.toStringAsFixed(0) : '—';

/// Human label for a ride/service state coming from the API.
String nexoStateLabel(String? state) =>
    (state ?? '—').replaceAll('_', ' ').toUpperCase();

/// Short date-time formatting for history rows.
String nexoDateTime(dynamic iso) {
  final value = iso is String ? DateTime.tryParse(iso) : null;
  if (value == null) return '—';
  final local = value.toLocal();
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year} ${two(local.hour)}:${two(local.minute)}';
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.compact = false});
  final bool compact;
  @override
  Widget build(BuildContext context) => Row(mainAxisSize: MainAxisSize.min, children: [
        Container(
          width: compact ? 36 : 48,
          height: compact ? 36 : 48,
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.purpleBright, AppColors.purple]),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Icon(Icons.bolt_rounded, color: Colors.white, size: compact ? 23 : 30),
        ),
        const SizedBox(width: 11),
        Text('nexo', style: TextStyle(fontSize: compact ? 23 : 30, fontWeight: FontWeight.w800, letterSpacing: -1.2)),
      ]);
}

class Eyebrow extends StatelessWidget {
  const Eyebrow(this.text, {super.key, this.color = AppColors.purpleBright});
  final String text;
  final Color color;
  @override
  Widget build(BuildContext context) => Text(
        text.toUpperCase(),
        style: TextStyle(color: color, fontSize: 11, letterSpacing: 1.4, fontWeight: FontWeight.w800),
      );
}

class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.all(18)});
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Container(
        width: double.infinity,
        padding: padding,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.line),
        ),
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
        decoration: BoxDecoration(
          color: (green ? AppColors.green : AppColors.purple).withValues(alpha: .12),
          borderRadius: BorderRadius.circular(30),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: green ? AppColors.green : AppColors.purpleBright, shape: BoxShape.circle),
          ),
          const SizedBox(width: 7),
          Text(text, style: TextStyle(color: green ? AppColors.green : AppColors.purpleBright, fontSize: 11, fontWeight: FontWeight.w800)),
        ]),
      );
}

class ErrorPanel extends StatelessWidget {
  const ErrorPanel(this.message, {super.key});
  final String message;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.errorBg,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.errorLine),
        ),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Icon(Icons.error_outline_rounded, color: Color(0xFFFFA9B7)),
          const SizedBox(width: 10),
          Expanded(child: Text(message, style: const TextStyle(color: AppColors.errorText, fontSize: 12))),
        ]),
      );
}

/// Constrained, centered page column used by every tab for phone and desktop.
class PageColumn extends StatelessWidget {
  const PageColumn({super.key, required this.children, this.padding = const EdgeInsets.fromLTRB(20, 8, 20, 28)});
  final List<Widget> children;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: ListView(padding: padding, children: children),
        ),
      );
}
