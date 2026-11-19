export interface ApkItem {
  id: 'usuario' | 'conductor' | 'supervisor';
  aliases: string[];
  name: string;
  subtitle: string;
  version: string;
  size: string;
  iconName: 'smartphone' | 'car' | 'shield';
  iconColor: string;
  iconBg: string;
  btnGradient: string;
  url: string;
  badge: string;
  fileName: string;
}

export const APKS: ApkItem[] = [
  {
    id: 'usuario',
    aliases: ['usuario', 'pasajero', 'cliente', 'client', 'passenger'],
    name: 'TravelApp Pasajero',
    subtitle: 'App oficial de usuarios para pedir viajes en tiempo real, traslados y experiencias.',
    version: '1.0.0 · Beta v8 (OTA)',
    size: '97.8 MB',
    iconName: 'smartphone',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50',
    url: 'https://expo.dev/artifacts/eas/jHaow85O_dW7Mf0-g34swdOLQ0h84pgny9zuO1uw2Y4.apk',
    badge: 'Pasajeros',
    fileName: 'travelapp-usuario.apk',
  },
  {
    id: 'conductor',
    aliases: ['conductor', 'chofer', 'driver'],
    name: 'TravelApp Conductor',
    subtitle: 'Recepción de viajes con despacho inteligente, telemetría en vivo, alertas viales y Taxímetro Digital SUTRAPPA.',
    version: '1.0.0 · Beta v8 (OTA)',
    size: '93.6 MB',
    iconName: 'car',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    btnGradient: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-950/50',
    url: 'https://expo.dev/artifacts/eas/RXgH8MXcsAGa22fyN7P2Ks-UMnYf9-6EYn7JIok2UWA.apk',
    badge: 'Conductores',
    fileName: 'travelapp-conductor.apk',
  },
  {
    id: 'supervisor',
    aliases: ['supervisor', 'flota', 'guardia'],
    name: 'TravelApp Supervisor',
    subtitle: 'Monitoreo de flota en vivo con mapa radar Google Maps, alertas viales, control de vencimientos y liquidación de caja.',
    version: '1.0.0 · Beta v4 (OTA)',
    size: '89.5 MB',
    iconName: 'shield',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    btnGradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/50',
    url: 'https://expo.dev/artifacts/eas/MtkatHmILQCVe3JW5NMAWPdGZyeAYL-ZjrvGMAn120c.apk',
    badge: 'Supervisión',
    fileName: 'travelapp-supervisor.apk',
  },
];

export function findApkBySlug(slug: string): ApkItem | undefined {
  const clean = (slug || '').trim().toLowerCase();
  return APKS.find((item) => item.id === clean || item.aliases.includes(clean));
}
