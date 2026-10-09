import 'package:geolocator/geolocator.dart';

import 'api.dart';

/// Plain coordinate value used by the app (independent of plugin types).
class NexoLocation {
  const NexoLocation({required this.latitude, required this.longitude});
  final double latitude;
  final double longitude;

  Map<String, dynamic> toJson() => {'latitude': latitude, 'longitude': longitude};
}

/// Resolves the device position. Injectable so tests can run without plugins.
typedef Locate = Future<NexoLocation> Function();

/// Real device location via geolocator, with explicit user-facing errors.
Future<NexoLocation> deviceLocate() async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw NexoUserException('Ative o GPS do dispositivo para continuar.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      throw NexoUserException(
          'Permissão de localização negada. Habilite-a nas configurações do dispositivo.');
    }
    final p = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
    );
    return NexoLocation(latitude: p.latitude, longitude: p.longitude);
  } on NexoUserException {
    rethrow;
  } catch (e) {
    throw NexoUserException('Não foi possível obter a localização ($e).');
  }
}

/// Validates a coordinate pair entered by the user. Returns an error message
/// or null when valid.
String? validateCoordinate(String latText, String lngText) {
  final lat = double.tryParse(latText.trim().replaceAll(',', '.'));
  if (lat == null || lat < -90 || lat > 90) {
    return 'Latitude inválida: informe um número entre -90 e 90.';
  }
  final lng = double.tryParse(lngText.trim().replaceAll(',', '.'));
  if (lng == null || lng < -180 || lng > 180) {
    return 'Longitude inválida: informe um número entre -180 e 180.';
  }
  return null;
}
