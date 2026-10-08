import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'api_client.dart';
import 'location_service.dart';

void main() => runApp(const NexoApp());

class NexoApp extends StatelessWidget {
  const NexoApp({super.key});
  @override Widget build(BuildContext context) => MaterialApp(
    title:'Nexo',debugShowCheckedModeBanner:false,
    theme:ThemeData(colorScheme:ColorScheme.fromSeed(seedColor:Colors.indigo),useMaterial3:true),
    home:const SessionGate());
}

class SessionGate extends StatefulWidget{const SessionGate({super.key});@override State<SessionGate> createState()=>_SessionGateState();}
class _SessionGateState extends State<SessionGate>{
  late Future<Map<String,String>> session;
  @override void initState(){super.initState();session=NexoApiClient.session();}
  @override Widget build(BuildContext context)=>FutureBuilder<Map<String,String>>(future:session,builder:(context,s){
    if(!s.hasData)return const Scaffold(body:Center(child:CircularProgressIndicator()));
    final d=s.data!;if((d['accountId']??'').isEmpty)return const LoginPage();
    return d['role']=='provider'?const DriverHomePage():const PassengerHomePage();
  });
}

class LoginPage extends StatefulWidget{const LoginPage({super.key});@override State<LoginPage> createState()=>_LoginPageState();}
class _LoginPageState extends State<LoginPage>{
  final email=TextEditingController(),password=TextEditingController(),name=TextEditingController(),base=TextEditingController();
  String role='customer';bool register=false,busy=false;String? error;
  @override void initState(){super.initState();NexoApiClient.session().then((s){if(mounted)base.text=s['apiBaseUrl']??'';});}
  @override void dispose(){email.dispose();password.dispose();name.dispose();base.dispose();super.dispose();}
  Future<void> submit()async{
    setState(()=>busy=true);error=null;
    try{
      final url=base.text.trim().isEmpty?const String.fromEnvironment('NEXO_API_BASE_URL',defaultValue:'http://10.0.2.2:3000/v1'):base.text.trim();
      final api=NexoApiClient.forLogin(url);
      final data=await(register?api.post('/auth/register',{'email':email.text.trim(),'password':password.text,'displayName':name.text.trim(),'role':role}:api.post('/auth/login',{'email':email.text.trim(),'password':password.text}));
      await NexoApiClient.saveSession(baseUrl:url,accessToken:data['accessToken'] as String,accountId:data['accountId'] as String,role:data['role'] as String);
      if(!mounted)return;Navigator.pushReplacement(context,MaterialPageRoute<void>(builder:(_)=>data['role']=='provider'?const DriverHomePage():const PassengerHomePage()));
    }catch(e){if(mounted)setState(()=>error=_friendlyError(e));}finally{if(mounted)setState(()=>busy=false);}
  }
  @override Widget build(BuildContext context)=>Scaffold(body:SafeArea(child:Center(child:SingleChildScrollView(padding:const EdgeInsets.all(24),child:ConstrainedBox(
    constraints:const BoxConstraints(maxWidth:460),child:Column(crossAxisAlignment:CrossAxisAlignment.stretch,children:[
      Text('Nexo',style:TextStyle(fontSize:42,fontWeight:FontWeight.bold),textAlign:TextAlign.center),
      SizedBox(height:8),Text('Mobilidade real: passageiro e motorista conectados pela API Nexo.',textAlign:TextAlign.center),SizedBox(height:28),
      TextField(controller:base,decoration:const InputDecoration(labelText:'URL da API',hintText:'http://192.168.0.10:3000/v1'),keyboardType:TextInputType.url),SizedBox(height:12),
      if(register)TextField(controller:name,decoration:const InputDecoration(labelText:'Nome')),if(register)const SizedBox(height:12),
      TextField(controller:email,decoration:const InputDecoration(labelText:'Email'),keyboardType:TextInputType.emailAddress),SizedBox(height:12),
      TextField(controller:password,decoration:const InputDecoration(labelText:'Senha'),obscureText:true),
      if(register)...[const SizedBox(height:12),DropdownButtonFormField<String>(initialValue:role,decoration:const InputDecoration(labelText:'Perfil'),items:const[DropdownMenuItem(value:'customer',child:Text('Passageiro')),DropdownMenuItem(value:'provider',child:Text('Motorista / profissional'))],onChanged:(v)=>setState(()=>role=v!))],
      if(error!=null)Padding(padding:const EdgeInsets.only(top:12),child:Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error))),
      const SizedBox(height:20),FilledButton(onPressed:busy?null:submit,child:Text(register?'Criar conta':'Entrar')),
      TextButton(onPressed:busy?null:()=>setState(()=>register=!register),child:Text(register?'Já tenho uma conta':'Criar nova conta')),
    ]))))));
}

class PassengerHomePage extends StatefulWidget{const PassengerHomePage({super.key});@override State<PassengerHomePage> createState()=>_PassengerHomePageState();}
class _PassengerHomePageState extends State<PassengerHomePage>{
  NexoApiClient? api;final map=MapController();LatLng? origin,destination;String vehicle='car';bool locating=false,requesting=false;String? error;
  @override void initState(){super.initState();NexoApiClient.load().then((a){if(mounted){setState(()=>api=a);locate();}});}
  Future<void> locate()async{setState(()=>locating=true);try{final p=await NexoLocationService.current();final x=LatLng(p.latitude,p.longitude);if(!mounted)return;setState((){origin=x;destination??=LatLng(p.latitude+0.01,p.longitude+0.01);});map.move(x,14);}catch(e){if(mounted)setState(()=>error=_friendlyError(e));}finally{if(mounted)setState(()=>locating=false);}}
  Future<void> requestRide()async{if(api==null||origin==null||destination==null)return;setState(()=>requesting=true);try{final r=await api!.post('/rides/requests',{'vehicleType':vehicle,'origin':{'latitude':origin!.latitude,'longitude':origin!.longitude},'destination':{'latitude':destination!.latitude,'longitude':destination!.longitude}},idempotencyKey:'ride-'+DateTime.now().microsecondsSinceEpoch.toString());if(!mounted)return;Navigator.push(context,MaterialPageRoute<void>(builder:(_)=>RideTrackingPage(api:api!,requestId:r['requestId'] as String,passenger:true)));}catch(e){if(mounted)setState(()=>error=_friendlyError(e));}finally{if(mounted)setState(()=>requesting=false);}}
  @override Widget build(BuildContext context){final c=origin??const LatLng(-16.6869,-49.2648);return Scaffold(
    appBar:AppBar(title:const Text('Nexo • Passageiro'),actions:[IconButton(onPressed:locate,icon:const Icon(Icons.my_location)),IconButton(onPressed:logout,icon:const Icon(Icons.logout))]),
    body:Column(children:[Expanded(child:FlutterMap(mapController:map,options:MapOptions(initialCenter:c,initialZoom:13,onTap:(_,p)=>setState(()=>destination=p)),children:[
      TileLayer(urlTemplate:'https://tile.openstreetmap.org/{z}/{x}/{y}.png',userAgentPackageName:'com.pixelumgames.nexo'),
      MarkerLayer(markers:[if(origin!=null)Marker(point:origin!,width:44,height:44,child:const Icon(Icons.trip_origin,size:36)),if(destination!=null)Marker(point:destination!,width:44,height:44,child:const Icon(Icons.location_pin,size:42))])]),
      Material(elevation:8,child:Padding(padding:const EdgeInsets.all(16),child:Column(children:[
        SegmentedButton<String>(segments:const[ButtonSegment(value:'car',label:Text('Carro'),icon:Icon(Icons.directions_car)),ButtonSegment(value:'motorcycle',label:Text('Moto'),icon:Icon(Icons.two_wheeler))],selected:{vehicle},onSelectionChanged:(v)=>setState(()=>vehicle=v.first)),
        const SizedBox(height:8),Text(destination==null?'Toque no mapa para escolher o destino.':'Destino selecionado. Toque no mapa para alterar.'),
        if(error!=null)Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error)),const SizedBox(height:8),
        SizedBox(width:double.infinity,child:FilledButton.icon(onPressed:locating||requesting||origin==null||destination==null?null:requestRide,icon:const Icon(Icons.local_taxi),label:Text(requesting?'Solicitando...':'Solicitar corrida'))),
      ]))) ]));}
  Future<void> logout()async{await NexoApiClient.clearSession();if(!mounted)return;Navigator.pushAndRemoveUntil(context,MaterialPageRoute<void>(builder:(_)=>const LoginPage()),(_)=>false);}
}

class DriverHomePage extends StatefulWidget{const DriverHomePage({super.key});@override State<DriverHomePage> createState()=>_DriverHomePageState();}
class _DriverHomePageState extends State<DriverHomePage>{
  NexoApiClient? api;Timer? timer;List<Map<String,dynamic>> requests=[];bool online=false,busy=false;String? error;
  @override void initState(){super.initState();NexoApiClient.load().then((a){if(mounted)setState(()=>api=a);});}
  @override void dispose(){timer?.cancel();super.dispose();}
  Future<void> setOnline(bool value)async{if(api==null)return;setState(()=>busy=true);try{await api!.put('/me/marketplace',{'categories':['passenger_car','passenger_motorcycle'],'availability':value?'available':'offline','acceptingRequests':value});setState(()=>online=value);timer?.cancel();if(value){await refresh();timer=Timer.periodic(const Duration(seconds:4),(_)=>refresh());}else{setState(()=>requests=[]);}}catch(e){setState(()=>error=_friendlyError(e));}finally{if(mounted)setState(()=>busy=false);}}
  Future<void> refresh()async{if(api==null||!online)return;try{final d=await api!.get('/requests/available');if(mounted)setState(()=>requests=List<Map<String,dynamic>>.from(d as List));}catch(e){if(mounted)setState(()=>error=_friendlyError(e));}}
  Future<void> accept(Map<String,dynamic> r)async{if(api==null)return;setState(()=>busy=true);try{final s=await api!.post('/requests/'+r['id'].toString()+'/accept',{},idempotencyKey:'accept-'+r['id'].toString()+'-'+DateTime.now().microsecondsSinceEpoch.toString());if(!mounted)return;Navigator.push(context,MaterialPageRoute<void>(builder:(_)=>RideTrackingPage(api:api!,requestId:r['id'].toString(),passenger:false,serviceId:s['id'] as String?)));await refresh();}catch(e){setState(()=>error=_friendlyError(e));}finally{if(mounted)setState(()=>busy=false);}}
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Nexo • Motorista'),actions:[IconButton(onPressed:logout,icon:const Icon(Icons.logout))]),body:RefreshIndicator(onRefresh:refresh,child:ListView(padding:const EdgeInsets.all(16),children:[
    Card(child:SwitchListTile(title:Text(online?'Você está ONLINE':'Você está OFFLINE'),subtitle:Text(online?'Buscando novas corridas automaticamente.':'Fique online para receber solicitações.'),value:online,onChanged:busy?null:setOnline)),
    if(error!=null)Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error)),const SizedBox(height:8),Text('Solicitações disponíveis',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:8),
    if(!online)const Card(child:Padding(padding:EdgeInsets.all(20),child:Text('Ative o modo online.')))else if(requests.isEmpty)const Card(child:Padding(padding:EdgeInsets.all(20),child:Text('Nenhuma corrida agora. Atualização automática ativa.')))
    else ...requests.map((r)=>Card(child:ListTile(leading:Icon(r['category']=='passenger_motorcycle'?Icons.two_wheeler:Icons.directions_car),title:Text(r['category']=='passenger_motorcycle'?'Passageiro • Moto':'Passageiro • Carro'),subtitle:Text('Solicitada por '+(r['customerName']?.toString()??'cliente')),trailing:FilledButton(onPressed:busy?null:()=>accept(r),child:const Text('Aceitar'))))),
  ])));
  Future<void> logout()async{timer?.cancel();await NexoApiClient.clearSession();if(!mounted)return;Navigator.pushAndRemoveUntil(context,MaterialPageRoute<void>(builder:(_)=>const LoginPage()),(_)=>false);}
}

class RideTrackingPage extends StatefulWidget{
  const RideTrackingPage({super.key,required this.api,required this.requestId,required this.passenger,this.serviceId});
  final NexoApiClient api;final String requestId;final bool passenger;final String? serviceId;
  @override State<RideTrackingPage> createState()=>_RideTrackingPageState();
}
class _RideTrackingPageState extends State<RideTrackingPage>{
  Timer? timer;String state='open';int? fare;String? error;String? rideId;
  @override void initState(){super.initState();poll();timer=Timer.periodic(const Duration(seconds:3),(_)=>poll());}
  @override void dispose(){timer?.cancel();super.dispose();}
  Future<void> poll()async{try{
    final r=await widget.api.get('/requests/'+widget.requestId);if(mounted)setState(()=>state=r['status']?.toString()??state);
    final ns=await widget.api.get('/me/notifications');
    if(ns is List)for(final n in ns){if(n is Map){final p=n['payload'];if(p is Map&&p['requestId']==widget.requestId&&n['type']=='service_request.accepted'){state='accepted';final sid=p['serviceId'];if(sid is String){final s=await widget.api.get('/services/'+sid);if(mounted)setState(()=>fare=s['priceCents'] as int?);}}if(n['type'].toString().startsWith('ride.')&&p is Map&&p['rideId']!=null)rideId=p['rideId'].toString();}}
    if(rideId!=null){final ride=await widget.api.get('/rides/'+rideId!);if(mounted)setState(()=>state=ride['state']?.toString()??state);}
  }catch(e){if(mounted)setState(()=>error=_friendlyError(e));}}
  Future<void> action(String a)async{if(rideId==null){setState(()=>error='A corrida ainda está sendo vinculada. Aguarde alguns segundos.');return;}try{await widget.api.post('/rides/'+rideId!+'/'+a,{},idempotencyKey:'ride-'+rideId!+'-'+a+'-'+DateTime.now().microsecondsSinceEpoch.toString());await poll();}catch(e){setState(()=>error=_friendlyError(e));}}
  String label()=>switch(state){'accepted'=>'Motorista aceitou a corrida','driver_en_route'=>'Motorista a caminho','arrived'=>'Motorista chegou','started'=>'Viagem em andamento','completed'=>'Viagem concluída','cancelled'=>'Corrida cancelada',_=>'Aguardando motorista'};
  @override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:Text(widget.passenger?'Sua corrida':'Corrida em atendimento')),body:ListView(padding:const EdgeInsets.all(20),children:[
    Card(child:Padding(padding:const EdgeInsets.all(20),child:Column(children:[const Icon(Icons.local_taxi,size:64),const SizedBox(height:12),Text(label(),style:Theme.of(context).textTheme.headlineSmall,textAlign:TextAlign.center),Text('Solicitação: '+state),if(fare!=null)Text('Tarifa: R\\$ '+(fare!/100).toStringAsFixed(2),style:Theme.of(context).textTheme.titleLarge)]))),
    if(error!=null)Text(error!,style:TextStyle(color:Theme.of(context).colorScheme.error)),
    if(!widget.passenger&&rideId!=null)...[const SizedBox(height:12),FilledButton.icon(onPressed:()=>action('driver-en-route'),icon:const Icon(Icons.navigation),label:const Text('A caminho')),FilledButton.icon(onPressed:()=>action('arrived'),icon:const Icon(Icons.place),label:const Text('Cheguei')),FilledButton.icon(onPressed:()=>action('start'),icon:const Icon(Icons.play_arrow),label:const Text('Iniciar viagem')),FilledButton.icon(onPressed:()=>action('complete'),icon:const Icon(Icons.flag),label:const Text('Finalizar viagem'))],
  ]));
}

class PaymentRecordPage extends StatefulWidget{const PaymentRecordPage({super.key,required this.expectedAmountCents});final int expectedAmountCents;@override State<PaymentRecordPage> createState()=>_PaymentRecordPageState();}
class _PaymentRecordPageState extends State<PaymentRecordPage>{String method='cash';final amount=TextEditingController();@override void initState(){super.initState();amount.text=widget.expectedAmountCents.toString();}@override void dispose(){amount.dispose();super.dispose();}bool get matches=>int.tryParse(amount.text)==widget.expectedAmountCents;@override Widget build(BuildContext context)=>Scaffold(appBar:AppBar(title:const Text('Pagamento')),body:ListView(padding:const EdgeInsets.all(20),children:[Text('Valor do serviço',style:Theme.of(context).textTheme.titleMedium),Text('R\\$ '+(widget.expectedAmountCents/100).toStringAsFixed(2),style:Theme.of(context).textTheme.headlineMedium),const SizedBox(height:20),DropdownButtonFormField<String>(initialValue:method,items:const[DropdownMenuItem(value:'cash',child:Text('Dinheiro')),DropdownMenuItem(value:'pix',child:Text('Pix')),DropdownMenuItem(value:'provider_card_machine',child:Text('Cartão na máquina do profissional'))],onChanged:(v)=>setState(()=>method=v!),decoration:const InputDecoration(labelText:'Método')),const SizedBox(height:16),TextField(controller:amount,keyboardType:TextInputType.number,decoration:const InputDecoration(labelText:'Valor confirmado (centavos)'),onChanged:(_)=>setState((){})),const SizedBox(height:20),FilledButton(onPressed:matches?(){}:null,child:const Text('Confirmar pagamento'))]));}

class DeliveryRequestPage extends StatefulWidget{const DeliveryRequestPage({super.key});@override State<DeliveryRequestPage> createState()=>_DeliveryRequestPageState();}
class _DeliveryRequestPageState extends State<DeliveryRequestPage>{final item=TextEditingController(),notes=TextEditingController(),origin=TextEditingController(),destination=TextEditingController();bool photo=false;@override void dispose(){item.dispose();notes.dispose();origin.dispose();destination.dispose();super.dispose();}@override Widget build(BuildContext context){final ok=item.text.trim().isNotEmpty;return Scaffold(appBar:AppBar(title:const Text('Nova entrega')),body:ListView(padding:const EdgeInsets.all(20),children:[Text('Dados da entrega',style:Theme.of(context).textTheme.headlineSmall),const SizedBox(height:16),TextField(controller:origin,decoration:const InputDecoration(labelText:'Origem')),const SizedBox(height:12),TextField(controller:destination,decoration:const InputDecoration(labelText:'Destino')),const SizedBox(height:12),TextField(controller:item,maxLines:3,decoration:const InputDecoration(labelText:'Descrição do item'),onChanged:(_)=>setState((){})),const SizedBox(height:12),TextField(controller:notes,maxLines:2,decoration:const InputDecoration(labelText:'Observações (opcional)')),SwitchListTile(title:const Text('Tenho foto do item'),value:photo,onChanged:(v)=>setState(()=>photo=v)),FilledButton(onPressed:ok?()=>ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content:Text('Entrega preparada para envio'))):null,child:const Text('Continuar'))]));}}

String _friendlyError(Object e)=>e is NexoApiException?e.message:e.toString().replaceFirst('Exception: ','');
