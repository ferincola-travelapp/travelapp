import { BarChart3, FileText, Users, LayoutDashboard, Calendar, History, Bot, MessageSquare, Car, Map, Route, Palmtree, Ticket, Megaphone, TrendingUp, Settings, Gift, PieChart, UserCheck, UserPlus, Vault, BookOpen, AlarmClock, Building2, Zap, Radio, PlusCircle, ShieldAlert, DollarSign, Calculator, Award, Smartphone, Plane, FileSpreadsheet, Compass } from 'lucide-react';

export interface TopNavTab {
  id: string;
  label: string;
  href: string;
  children?: Array<{
    id: string;
    label: string;
    subtitle?: string;
    href: string;
  }>;
}

export const topNavTabs: TopNavTab[] = [
  { id: 'global', label: 'Visión Global', href: '/' },
  { id: 'travelcab', label: 'TravelCab', href: '/travelcab' },
  { id: 'crm', label: 'CRM Ventas', href: '/crm' },
  {
    id: 'experiences',
    label: 'TravelApp Turismo',
    href: '/experiences',
    children: [
      { id: 'unit-travelapp', label: 'TravelApp', subtitle: 'Turismo Emisivo & Marketplace', href: '/experiences?unit=travelapp' },
      { id: 'unit-experience', label: 'Experience', subtitle: 'Servicios B2B & Receptivo', href: '/experiences?unit=experience_b2b' },
      { id: 'unit-lunaviajera', label: 'Luna Viajera', subtitle: 'Excursiones Tucumán & NOA', href: '/experiences?unit=lunaviajera' },
    ],
  },
  { id: 'rewards', label: 'Rewards', href: '/rewards/analytics' },
  { id: 'cms', label: 'CMS Web y Apps', href: '/cms' },
  { id: 'hr', label: 'RRHH', href: '/hr' },
  { id: 'growth', label: 'Marketing', href: '/marketing' },
  { id: 'audit', label: 'Administración', href: '/audit' },
];

export const getSidebarConfig = (pathname: string) => {
  // Configuración para Mensajería
  if (pathname.startsWith('/messages')) {
    return {
      title: 'Centro de Mensajería',
      items: [
        { id: 'conversations', label: 'Conversaciones', href: '/messages', icon: MessageSquare },
        { id: 'automated', label: 'Mensajes Automáticos', href: '/messages#automated', icon: Zap },
        { id: 'broadcast', label: 'Broadcast / Campañas', href: '/messages#broadcast', icon: Radio },
      ]
    };
  }

  // Configuración para Administración & Auditoría Contable
  if (pathname.startsWith('/audit')) {
    return {
      title: 'Administración',
      items: [
        { id: 'audit-overview', label: 'Tablero de Control', href: '/audit', icon: BarChart3 },
      ]
    };
  }

  // Configuración para Recursos Humanos (RRHH)
  if (pathname.startsWith('/hr')) {
    return {
      title: 'Recursos Humanos',
      items: [
        { id: 'partners', label: 'Lista de Socios', href: '/hr', icon: Users },
        { id: 'new-partner', label: 'Nuevo Conductor', href: '/hr/new-partner', icon: UserPlus },
        { id: 'applications', label: 'Postulaciones', href: '/hr#postulaciones', icon: FileText },
        { id: 'staff', label: 'Gestión de Personal', href: '/hr/staff', icon: Users },
        { id: 'org-chart', label: 'Organigrama empresarial', href: '/hr/org-chart', icon: Route },
      ]
    };
  }

  // Configuración para CMS Web y Apps
  if (pathname.startsWith('/cms')) {
    return {
      title: 'CMS Web y Apps',
      items: [
        { id: 'cms-editor', label: 'Gestor de Contenido', href: '/cms', icon: FileText },
      ]
    };
  }

  // Configuración para Rewards
  if (pathname.startsWith('/rewards')) {
    return {
      title: 'Rewards & Fidelización',
      items: [
        { id: 'analytics', label: 'Principal', href: '/rewards/analytics', icon: PieChart },
        { id: 'rewards-create-merchant', label: 'Comercio Asociado', href: '/rewards/merchants/new', icon: UserPlus },
        { id: 'rewards-create-rubro', label: 'Crear Rubro', href: '/rewards/settings?tab=rubros&action=new', icon: PlusCircle },
        { id: 'rewards-create-category', label: 'Crear Categoría', href: '/rewards/settings?tab=categories&action=new', icon: PlusCircle },
        { id: 'validator', label: 'Validador Cupones y Boletos', href: '/rewards/validator', icon: Zap },
        { id: 'merchants', label: 'Gestión de comercios', href: '/rewards/merchants', icon: Building2 },
        { id: 'settings', label: 'Reglas de Recompensa', href: '/rewards/settings', icon: Gift },
      ]
    };
  }

  // Configuración para Marketing / Crecimiento
  if (pathname.startsWith('/marketing')) {
    return {
      title: 'Marketing & Ads',
      items: [
        { id: 'marketing', label: 'Marketing & Ads', href: '/marketing', icon: Megaphone },
        { id: 'partners', label: 'Embajadores & Afiliados', href: '/marketing/partners', icon: Award },
        { id: 'analytics', label: 'Analítica Avanzada', href: '#', icon: TrendingUp },
      ]
    };
  }

  // Configuración para TravelApp Turismo (Concorde 360: TravelApp Emisivo, Experience B2B & Luna Viajera)
  if (pathname.startsWith('/experiences') && !pathname.startsWith('/experiences/hotel-reception')) {
    return {
      title: 'Concorde 360 · Turismo',
      items: [
        { id: 'dashboard', label: 'Tablero Concorde 360', href: '/experiences', icon: LayoutDashboard, section: 'Unidades de Negocio' },
        { id: 'catalog', label: 'Catálogos & Unidades (3)', href: '/experiences/catalog', icon: Palmtree, section: 'Unidades de Negocio' },
        { id: 'reservations', label: 'Files & Reservas (ERP)', href: '/experiences/reservations', icon: FileSpreadsheet, section: 'Operativo & Administrativo' },
        { id: 'create-reservation', label: 'Crear File Multi-Operador', href: '/experiences/reservations/new', icon: Ticket, section: 'Operativo & Administrativo' },
        { id: 'spots', label: 'Stock de Lugares & Cupos', href: '/experiences/spots', icon: Users, section: 'Operativo & Administrativo' },
        { id: 'providers', label: 'Agenda Prestadores & Prov.', href: '/experiences/providers', icon: AlarmClock, section: 'Operativo & Administrativo' },
        { id: 'quoter', label: 'Cotizador & Tarifarios', href: '/experiences/quoter', icon: Calculator, section: 'Operativo & Administrativo' },
        { id: 'customers', label: 'Pasajeros, Clientes & Usuarios', href: '/experiences/customers', icon: Users, section: 'Pasajeros & App' },
        { id: 'create-customer', label: 'Alta Cliente / Pasajero IATA', href: '/experiences/customers/new', icon: UserPlus, section: 'Pasajeros & App' },
        { id: 'my-trip-mgmt', label: 'App "Mi Viaje" & Vouchers', href: '/experiences/my-trip-mgmt', icon: Smartphone, section: 'Pasajeros & App' },
        { id: 'coordinators', label: 'Coordinadores & Guías', href: '/experiences/coordinators', icon: UserCheck, section: 'Pasajeros & App' },
      ]
    };
  }

  // Configuración para TravelCab
  if (pathname.startsWith('/travelcab')) {
    return {
      title: 'Logística TravelCab',
      items: [
        { id: 'dashboard', label: 'Principal', href: '/travelcab', icon: LayoutDashboard },
        { id: 'dispatch', label: 'Central de Despacho', href: '/travelcab/dispatch', icon: Map },
        { id: 'schedule', label: 'Agenda & Calendario', href: '/travelcab/schedule', icon: Calendar },
        { id: 'history', label: 'Trazabilidad & Reportes', href: '/travelcab/history', icon: Route },
        { id: 'branches', label: 'Gestión de Sucursal', href: '/travelcab/branches', icon: Building2 },
        { id: 'drivers', label: 'Gestión de Conductores', href: '/travelcab/drivers', icon: Users },
        { id: 'fleet', label: 'Gestión de Móviles', href: '/travelcab/fleet', icon: Car },
        { id: 'travelcab-create-service', label: 'Crear Servicio', href: '/travelcab/settings?tab=tariffs&action=new', icon: PlusCircle },
        { id: 'travelcab-create-category', label: 'Crear Categoría', href: '/travelcab/settings?tab=categories&action=new', icon: PlusCircle },
        { id: 'settings', label: 'Gestión de Tarifas', href: '/travelcab/settings', icon: DollarSign },
        { id: 'audio-settings', label: 'Audios y Locuciones', href: '/travelcab/settings?tab=system', icon: Megaphone },
        { id: 'security', label: 'Seguridad del Ecosistema', href: '/travelcab/security', icon: ShieldAlert },
      ]
    };
  }

  // Configuración para el CRM
  if (pathname.startsWith('/crm')) {
    return {
      title: 'CRM Ventas',
      items: [
        { id: 'leads', label: 'Tablero de Leads', href: '/crm', icon: LayoutDashboard },
        { id: 'agenda', label: 'Mi Agenda (Meet)', href: '/crm/agenda', icon: Calendar },
        { id: 'history', label: 'Historial de Ventas', href: '/crm/history', icon: History },
        { id: 'customers', label: 'Lista de Clientes', href: '/crm/customers', icon: Users },
        { id: 'travis', label: 'Travis IA ✦', href: '/crm/travis', icon: Bot },
      ]
    };
  }
  
  // Configuración por defecto (Visión Global)
  return {
    title: 'Visión Global',
    items: [
      { id: 'metrics', label: 'Métricas del Sistema', href: '/', icon: BarChart3 },
      { id: 'hotel-reception', label: 'Gestor B2B', href: '/experiences/hotel-reception', icon: Building2 },
      { id: 'users', label: 'Gestión de Usuarios', href: '/users', icon: Users },
      { id: 'branches', label: 'Gestión de Sucursales', href: '/branches', icon: Building2 },
      { id: 'messages', label: 'Centro de Mensajería', href: '/messages', icon: MessageSquare },
    ]
  };
};
