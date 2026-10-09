import 'package:flutter/material.dart';

import 'src/api.dart';
import 'src/login_page.dart';
import 'src/theme.dart';

export 'src/account_tabs.dart';
export 'src/api.dart';
export 'src/driver_shell.dart';
export 'src/location.dart';
export 'src/login_page.dart';
export 'src/passenger_shell.dart';
export 'src/theme.dart';

void main() => runApp(const NexoApp());

class NexoApp extends StatelessWidget {
  const NexoApp({super.key, this.apiFactory});
  final ApiFactory? apiFactory;

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Nexo',
        debugShowCheckedModeBanner: false,
        theme: nexoTheme(),
        home: LoginPage(apiFactory: apiFactory),
      );
}
