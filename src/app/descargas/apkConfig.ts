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
    version: '1.0.0 (Google Maps Live Traffic)',
    size: '96.3 MB',
    iconName: 'smartphone',
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    btnGradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-usuario.apk?alt=media&token=37935279-e972-46f4-96ad-efc841a1c7ee',
    badge: 'Pasajeros',
    fileName: 'travelapp-usuario.apk',
  },
  {
    id: 'conductor',
    aliases: ['conductor', 'chofer', 'driver'],
    name: 'TravelApp Conductor',
    subtitle: 'Recepción de viajes con despacho inteligente, telemetría en vivo, alertas viales y Taxímetro Digital SUTRAPPA.',
    version: '1.0.0 (Google Maps Live Traffic)',
    size: '92.2 MB',
    iconName: 'car',
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    btnGradient: 'from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-conductor.apk?alt=media&token=de915007-552a-4f06-88a4-a3ae6bcaea90',
    badge: 'Conductores',
    fileName: 'travelapp-conductor.apk',
  },
  {
    id: 'supervisor',
    aliases: ['supervisor', 'flota', 'guardia'],
    name: 'TravelApp Supervisor',
    subtitle: 'Monitoreo de flota en vivo con mapa radar Google Maps, alertas viales, control de vencimientos y liquidación de caja.',
    version: '1.0.0 (Google Maps Live Traffic)',
    size: '92.1 MB',
    iconName: 'shield',
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/10 border-blue-500/20',
    btnGradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/50',
    url: 'https://firebasestorage.googleapis.com/v0/b/mvp-travelapp.firebasestorage.app/o/apks%2Ftravelapp-supervisor.apk?alt=media&token=82a48a99-ee4e-4693-bbe3-9848c99d36cd',
    badge: 'Supervisión',
    fileName: 'travelapp-supervisor.apk',
  },
];

export function findApkBySlug(slug: string): ApkItem | undefined {
  const clean = (slug || '').trim().toLowerCase();
  return APKS.find((item) => item.id === clean || item.aliases.includes(clean));
}
