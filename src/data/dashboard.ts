export interface KpiData {
  id: string
  label: string
  value: string
  unit?: string
  delta: string
  deltaType: 'positive' | 'negative'
  icon: 'FileText' | 'ClipboardList' | 'Factory' | 'Truck'
}

export interface VolumeMonthlyPoint {
  month: string
  monthShort: string
  contratado: number // m³
  produzido: number // m³
  entregue: number // m³
}

export type ContractStatus = 'Em andamento' | 'Atenção' | 'Concluído' | 'Em risco'

export interface ContractRow {
  id: string
  cliente: string
  volume: number // m³
  prazo: string
  status: ContractStatus
  progresso?: number
}

export interface NavItemConfig {
  id: string
  label: string
  group: 'PRINCIPAL' | 'OPERACIONAL' | 'SISTEMA'
  icon:
    | 'LayoutDashboard'
    | 'FileText'
    | 'CalendarRange'
    | 'Factory'
    | 'Warehouse'
    | 'Truck'
    | 'Bell'
    | 'Settings'
  disabled: boolean
  path: string
}

export const NAVIGATION_ITEMS: NavItemConfig[] = [
  // PRINCIPAL
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    group: 'PRINCIPAL',
    icon: 'LayoutDashboard',
    disabled: false,
    path: '/',
  },
  {
    id: 'contratos',
    label: 'Contratos',
    group: 'PRINCIPAL',
    icon: 'FileText',
    disabled: true,
    path: '/contratos',
  },
  {
    id: 'cargas',
    label: 'Cargas',
    group: 'PRINCIPAL',
    icon: 'FileText',
    disabled: false,
    path: '/cargas',
  },

  // OPERACIONAL
  {
    id: 'planejamento',
    label: 'Planejamento',
    group: 'OPERACIONAL',
    icon: 'CalendarRange',
    disabled: true,
    path: '/planejamento',
  },
  {
    id: 'producao',
    label: 'Produção',
    group: 'OPERACIONAL',
    icon: 'Factory',
    disabled: true,
    path: '/producao',
  },
  {
    id: 'estoque',
    label: 'Estoque',
    group: 'OPERACIONAL',
    icon: 'Warehouse',
    disabled: true,
    path: '/estoque',
  },
  {
    id: 'expedicoes',
    label: 'Expedições',
    group: 'OPERACIONAL',
    icon: 'Truck',
    disabled: true,
    path: '/expedicoes',
  },

  // SISTEMA
  {
    id: 'alertas',
    label: 'Alertas',
    group: 'SISTEMA',
    icon: 'Bell',
    disabled: true,
    path: '/alertas',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    group: 'SISTEMA',
    icon: 'Settings',
    disabled: true,
    path: '/configuracoes',
  },
]

export const DASHBOARD_KPIS: KpiData[] = [
  {
    id: 'contratos-ativos',
    label: 'Contratos Ativos',
    value: '24',
    delta: '+2 este mês',
    deltaType: 'positive',
    icon: 'FileText',
  },
  {
    id: 'volume-contratado',
    label: 'Volume Contratado',
    value: '412.850 m³',
    delta: '+8,2%',
    deltaType: 'positive',
    icon: 'ClipboardList',
  },
  {
    id: 'volume-produzido',
    label: 'Volume Produzido',
    value: '287.430 m³',
    delta: '−3,1%',
    deltaType: 'negative',
    icon: 'Factory',
  },
  {
    id: 'volume-entregue',
    label: 'Volume Entregue',
    value: '251.780 m³',
    delta: '+5,4%',
    deltaType: 'positive',
    icon: 'Truck',
  },
]

// 12 months (Jan-Dez) of volumes (m³)
// Contratado: 30.000–38.000
// Produzido: 28.000–34.000
// Entregue: 24.000–31.000
// Paths cross visibly (e.g. Produzido peaks above Contratado around Apr/May and drops below in Aug)
export const MONTHLY_VOLUME_DATA: VolumeMonthlyPoint[] = [
  { month: 'Janeiro', monthShort: 'Jan', contratado: 31200, produzido: 28400, entregue: 24300 },
  { month: 'Fevereiro', monthShort: 'Fev', contratado: 32500, produzido: 29800, entregue: 25100 },
  { month: 'Março', monthShort: 'Mar', contratado: 33800, produzido: 32100, entregue: 27400 },
  { month: 'Abril', monthShort: 'Abr', contratado: 32900, produzido: 33900, entregue: 28900 }, // Produzido crosses above Contratado
  { month: 'Maio', monthShort: 'Mai', contratado: 34100, produzido: 34500, entregue: 29800 }, // Produzido higher than Contratado
  { month: 'Junho', monthShort: 'Jun', contratado: 35600, produzido: 33200, entregue: 30400 }, // Contratado crosses back above Produzido
  { month: 'Julho', monthShort: 'Jul', contratado: 36200, produzido: 31800, entregue: 30800 },
  { month: 'Agosto', monthShort: 'Ago', contratado: 35100, produzido: 29400, entregue: 28700 },
  { month: 'Setembro', monthShort: 'Set', contratado: 36800, produzido: 32600, entregue: 29500 },
  { month: 'Outubro', monthShort: 'Out', contratado: 37400, produzido: 33700, entregue: 30200 },
  { month: 'Novembro', monthShort: 'Nov', contratado: 36900, produzido: 32100, entregue: 28900 },
  { month: 'Dezembro', monthShort: 'Dez', contratado: 37800, produzido: 30900, entregue: 27800 },
]

export const CONTRACTS_DATA: ContractRow[] = [
  {
    id: 'ct-001',
    cliente: 'Companhia Florestal Vale Verde',
    volume: 85000,
    prazo: 'Dez/2026',
    status: 'Em andamento',
  },
  {
    id: 'ct-002',
    cliente: 'Papeleira Sul S.A.',
    volume: 64500,
    prazo: 'Mar/2026',
    status: 'Atenção',
  },
  {
    id: 'ct-003',
    cliente: 'Madeireira Rio Claro',
    volume: 52300,
    prazo: 'Jun/2025',
    status: 'Concluído',
  },
  {
    id: 'ct-004',
    cliente: 'Indústria de Celulose Horizonte',
    volume: 41800,
    prazo: 'Set/2025',
    status: 'Em risco',
  },
  {
    id: 'ct-005',
    cliente: 'Agroflorestal Paraná',
    volume: 37200,
    prazo: 'Fev/2027',
    status: 'Em andamento',
  },
]

export const USER_PROFILE = {
  name: 'Ricardo Mendes',
  role: 'Diretor de Operações',
  initials: 'RM',
}

export const SAMPLE_NOTIFICATION = {
  id: 'notif-1',
  title: 'Alerta Operacional',
  message: 'Volume de entrega abaixo do planejado em Expedição #102',
  timestamp: 'Há 25 minutos',
  unread: true,
}
