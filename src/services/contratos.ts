// F1-T05 — serviço de contratos (SPEC-F1-03): única porta de acesso aos dados.
// Componentes nunca chamam o SDK diretamente (padrão do projeto).
// NOTA: back-relation expand não é usada — itens/eventos são buscados por filtro
// direto (contrato_id/item_id), que é o caminho suportado pelo PB v0.36 aqui.
import pb from '@/lib/pocketbase/client'

export interface ContratoLista {
  id: string
  codigo: string
  cliente: string
  mercado: string
  estado_registro: string
  prazo_fim: string
  numero_contrato: string
  sistema_origem: string
  produto: string
  especie: string
  quantidade_vigente: number | null
  unidade: string | null
  saldo_estado: string
  saldo_valor: number | null
  saldo_motivo: string
  entregue: number | null
  produzido: number | null
  atualizado_em: string
}

export interface ContratoDetalhe extends ContratoLista {
  eventos: EventoContrato[]
  carregamento: { fonte: string; arquivo_lote: string; carregado_em: string } | null
}

export interface EventoContrato {
  id: string
  evento_tipo: string
  quantidade: number | null
  unidade: string | null
  data_evento: string
  fonte: string
  registro_origem: string
  carregado_em: string
}

export interface FiltrosContratos {
  busca?: string
  mercado?: string
  estado?: string
  produto?: string
  incluirInativos?: boolean
  page?: number
  perPage?: number
}

const TIPOS_ENTREGA = ['expedicao', 'entrega_confirmada', 'devolucao']

/** Agrega eventos por unidade — nunca soma unidades distintas; nulo nunca vira zero. */
function agregarEventos(
  eventos: { evento_tipo: string; quantidade: number | null; unidade: string | null }[],
  unidadeItem: string | null,
): { entregue: number | null; produzido: number | null } {
  let entregue: number | null = null
  let produzido: number | null = null
  if (unidadeItem) {
    const entrega = eventos.filter((ev) => TIPOS_ENTREGA.includes(ev.evento_tipo))
    const prod = eventos.filter((ev) => ev.evento_tipo === 'producao')
    if (
      entrega.length > 0 &&
      entrega.every((ev) => ev.unidade === unidadeItem && ev.quantidade !== null)
    ) {
      entregue = entrega.reduce((s, ev) => s + (ev.quantidade as number), 0)
    }
    if (
      prod.length > 0 &&
      prod.every((ev) => ev.unidade === unidadeItem && ev.quantidade !== null)
    ) {
      produzido = prod.reduce((s, ev) => s + (ev.quantidade as number), 0)
    }
  }
  return { entregue, produzido }
}

interface ContratoRaw {
  id: string
  codigo: string
  cliente: string
  mercado: string
  estado_registro: string
  prazo_fim: string
  numero_contrato: string
  sistema_origem: string
  updated: string
}

async function itemDoContrato(contratoId: string): Promise<Record<string, unknown> | undefined> {
  const res = await pb.collection('contratos_itens').getList(1, 1, {
    filter: pb.filter('contrato_id = {:c}', { c: contratoId }),
  })
  return res.items[0] as unknown as Record<string, unknown> | undefined
}

async function eventosDoItem(
  itemId: string,
  sort = '-data_evento',
): Promise<Record<string, unknown>[]> {
  const res = await pb.collection('contratos_eventos').getFullList({
    filter: pb.filter('item_id = {:i}', { i: itemId }),
    sort,
  })
  return res as unknown as Record<string, unknown>[]
}

function montarLista(
  c: ContratoRaw,
  it: Record<string, unknown> | undefined,
  evs: Record<string, unknown>[],
): ContratoLista {
  const unidade = (it?.unidade as string | null) ?? null
  const { entregue, produzido } = agregarEventos(
    evs.map((ev) => ({
      evento_tipo: String(ev.evento_tipo),
      quantidade: (ev.quantidade as number | null) ?? null,
      unidade: (ev.unidade as string | null) ?? null,
    })),
    unidade,
  )
  return {
    id: c.id,
    codigo: c.codigo,
    cliente: c.cliente,
    mercado: c.mercado,
    estado_registro: c.estado_registro,
    prazo_fim: c.prazo_fim ?? '',
    numero_contrato: c.numero_contrato ?? '',
    sistema_origem: c.sistema_origem ?? '',
    produto: String(it?.produto ?? ''),
    especie: String(it?.especie ?? ''),
    quantidade_vigente: (it?.quantidade_vigente as number | null) ?? null,
    unidade,
    saldo_estado: String(it?.saldo_estado ?? 'nao_calculavel'),
    saldo_valor: (it?.saldo_valor as number | null) ?? null,
    saldo_motivo: String(it?.saldo_motivo ?? ''),
    entregue,
    produzido,
    atualizado_em: c.updated ?? '',
  }
}

export async function listarContratos(
  f: FiltrosContratos = {},
): Promise<{ items: ContratoLista[]; totalItems: number; totalPages: number }> {
  const filters: string[] = []
  const bind: Record<string, string> = {}
  if (f.busca) {
    const esc = f.busca.replace(/["'\\]/g, '')
    filters.push('(codigo ~ {:b} || cliente ~ {:b} || numero_contrato ~ {:b})')
    bind.b = esc
  }
  if (f.mercado) {
    filters.push('mercado = {:mercado}')
    bind.mercado = f.mercado
  }
  if (f.estado) {
    filters.push('estado_registro = {:estado}')
    bind.estado = f.estado
  }
  const filter = filters.join(' && ')

  const res = await pb.collection('contratos').getList(f.page ?? 1, f.perPage ?? 20, {
    sort: 'prazo_fim,codigo',
    ...(filter ? { filter: pb.filter(filter, bind) } : {}),
  })

  const items: ContratoLista[] = []
  for (const raw of res.items as unknown as ContratoRaw[]) {
    const it = await itemDoContrato(raw.id)
    const evs = it ? await eventosDoItem(String(it.id)) : []
    items.push(montarLista(raw, it, evs))
  }

  let filtrados = items
  if (f.produto)
    filtrados = filtrados.filter((x) => x.produto.toLowerCase().includes(f.produto!.toLowerCase()))
  if (!f.incluirInativos)
    filtrados = filtrados.filter(
      (x) => x.estado_registro === 'vigente' || x.estado_registro === 'suspenso',
    )
  return { items: filtrados, totalItems: res.totalItems, totalPages: res.totalPages }
}

export async function obterContrato(id: string): Promise<ContratoDetalhe | null> {
  let c: ContratoRaw
  try {
    c = (await pb.collection('contratos').getOne(id)) as unknown as ContratoRaw
  } catch {
    return null
  }
  const it = await itemDoContrato(id)
  const evs = it ? await eventosDoItem(String(it.id)) : []
  const base = montarLista(c, it, evs)
  const eventos: EventoContrato[] = evs.map((ev) => ({
    id: String(ev.id),
    evento_tipo: String(ev.evento_tipo),
    quantidade: (ev.quantidade as number | null) ?? null,
    unidade: (ev.unidade as string | null) ?? null,
    data_evento: String(ev.data_evento ?? ''),
    fonte: String(ev.fonte ?? ''),
    registro_origem: String(ev.registro_origem ?? ''),
    carregado_em: String(ev.updated ?? ''),
  }))
  const carregamentoId = it ? String(it.carregamento_id ?? '') : ''
  let carregamento: ContratoDetalhe['carregamento'] = null
  if (carregamentoId) {
    try {
      const car = (await pb
        .collection('proveniencia_carregamentos')
        .getOne(carregamentoId)) as unknown as Record<string, string>
      carregamento = {
        fonte: car.fonte,
        arquivo_lote: car.arquivo_lote,
        carregado_em: car.carregado_em,
      }
    } catch {
      /* proveniência opcional */
    }
  }
  return { ...base, eventos, carregamento }
}

/** Resumo do topo — só soma unidades compatíveis; nunca mistura; nulo nunca vira zero. */
export async function resumoContratos(): Promise<{
  ativos: number
  porUnidade: { unidade: string; contratado: number; entregue: number; saldo: number }[]
  incompletos: number
  divergentes: number
  totalRegistros: number
}> {
  const contratos = (await pb.collection('contratos').getFullList()) as unknown as ContratoRaw[]
  const itens = (await pb.collection('contratos_itens').getFullList()) as unknown as Record<
    string,
    unknown
  >[]
  const itemPorContrato = new Map<string, Record<string, unknown>>()
  for (const it of itens) {
    const cid = String(it.contrato_id ?? '')
    if (!itemPorContrato.has(cid)) itemPorContrato.set(cid, it)
  }

  const porUnidade = new Map<string, { contratado: number; entregue: number; saldo: number }>()
  let ativos = 0,
    incompletos = 0,
    divergentes = 0

  for (const c of contratos) {
    const it = itemPorContrato.get(c.id)
    if (!it) continue
    if (c.estado_registro === 'vigente' || c.estado_registro === 'suspenso') ativos++
    if (String(it.saldo_estado) === 'nao_calculavel') incompletos++
    if (String(it.saldo_estado) === 'em_divergencia') divergentes++
    const unidade = String(it.unidade ?? '')
    if (!unidade) continue
    const bucket = porUnidade.get(unidade) ?? { contratado: 0, entregue: 0, saldo: 0 }
    const qtd = it.quantidade_vigente as number | null
    if (qtd !== null && qtd !== undefined) bucket.contratado += qtd
    if (String(it.saldo_estado) === 'calculado' && it.saldo_valor !== null)
      bucket.saldo += it.saldo_valor as number
    porUnidade.set(unidade, bucket)
  }

  // entregue por unidade: soma eventos dos itens com saldo calculado naquela unidade
  const eventos = (await pb.collection('contratos_eventos').getFullList()) as unknown as Record<
    string,
    unknown
  >[]
  const eventosPorItem = new Map<string, Record<string, unknown>[]>()
  for (const ev of eventos) {
    const iid = String(ev.item_id ?? '')
    if (!eventosPorItem.has(iid)) eventosPorItem.set(iid, [])
    eventosPorItem.get(iid)!.push(ev)
  }
  for (const it of itens) {
    if (String(it.saldo_estado) !== 'calculado') continue
    const unidade = String(it.unidade ?? '')
    const bucket = porUnidade.get(unidade)
    if (!bucket) continue
    const evs = eventosPorItem.get(String(it.id)) ?? []
    bucket.entregue += evs
      .filter((ev) => TIPOS_ENTREGA.includes(String(ev.evento_tipo)) && ev.quantidade !== null)
      .reduce((s, ev) => s + (ev.quantidade as number), 0)
  }

  return {
    ativos,
    porUnidade: [...porUnidade.entries()].map(([unidade, v]) => ({ unidade, ...v })),
    incompletos,
    divergentes,
    totalRegistros: contratos.length,
  }
}
