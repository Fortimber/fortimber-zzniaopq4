// F1-T05 — serviço de contratos (SPEC-F1-03): única porta de acesso aos dados.
// Componentes nunca chamam o SDK diretamente (padrão do projeto).
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
  // do item principal (1 item por contrato no piloto)
  produto: string
  especie: string
  quantidade_vigente: number | null
  unidade: string | null
  saldo_estado: string
  saldo_valor: number | null
  saldo_motivo: string
  // agregados de eventos (calculados no serviço, nunca misturados por unidade)
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
  busca?: string // número/cliente
  mercado?: string
  estado?: string // situação canônica
  produto?: string
  incluirInativos?: boolean // exibir encerrados/cancelados
  page?: number
  perPage?: number
}

const TIPOS_ENTREGA = ['expedicao', 'entrega_confirmada', 'devolucao']

/** Agrega eventos por unidade — nunca soma unidades distintas. */
function agregarEventos(
  eventos: { evento_tipo: string; quantidade: number | null; unidade: string | null }[],
  unidadeItem: string | null,
) {
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

export async function listarContratos(
  f: FiltrosContratos = {},
): Promise<{ items: ContratoLista[]; totalItems: number; totalPages: number }> {
  const filters: string[] = []
  if (f.busca) {
    // pesquisa por número de contrato ou cliente (escape de caracteres especiais)
    const esc = f.busca.replace(/["'\\]/g, '')
    filters.push(`(codigo ~ {:b} || cliente ~ {:b} || numero_contrato ~ {:b})`)
    return runList(f, filters[0], { b: esc })
  }
  if (f.mercado) filters.push(`mercado = {:mercado}`)
  if (f.estado) filters.push(`estado_registro = {:estado}`)
  const filter = filters.join(' && ')
  return runList(f, filter, { mercado: f.mercado ?? '', estado: f.estado ?? '' })
}

async function runList(
  f: FiltrosContratos,
  filter: string,
  bind: Record<string, string>,
): Promise<{ items: ContratoLista[]; totalItems: number; totalPages: number }> {
  const res = await pb.collection('contratos').getList(f.page ?? 1, f.perPage ?? 20, {
    sort: 'prazo_fim,codigo', // prazo mais próximo, estável por código
    ...(filter ? { filter: pb.filter(filter, bind) } : {}),
    expand: 'contratos_itens',
  })
  // expand reverso: itens do contrato
  const items: ContratoLista[] = []
  for (const c of res.items as unknown as Record<string, unknown>[]) {
    const itens = (c.expand as { contratos_itens?: unknown[] })?.contratos_itens ?? []
    // piloto: 1 item por contrato; se houver mais, o primeiro ordenado
    const it = (itens as Record<string, unknown>[])[0] as Record<string, unknown> | undefined
    const unidade = (it?.unidade as string | null) ?? null
    const eventosRaw = it
      ? await pb.collection('contratos_eventos').getFullList({
          filter: pb.filter('item_id = {:i}', { i: String(it.id) }),
        })
      : []
    const { entregue, produzido } = agregarEventos(
      eventosRaw.map((ev) => ({
        evento_tipo: ev.evento_tipo,
        quantidade: ev.quantidade,
        unidade: ev.unidade,
      })),
      unidade,
    )
    items.push({
      id: String(c.id),
      codigo: String(c.codigo),
      cliente: String(c.cliente),
      mercado: String(c.mercado),
      estado_registro: String(c.estado_registro),
      prazo_fim: String(c.prazo_fim ?? ''),
      numero_contrato: String(c.numero_contrato ?? ''),
      sistema_origem: String(c.sistema_origem ?? ''),
      produto: String(it?.produto ?? ''),
      especie: String(it?.especie ?? ''),
      quantidade_vigente: (it?.quantidade_vigente as number | null) ?? null,
      unidade,
      saldo_estado: String(it?.saldo_estado ?? 'nao_calculavel'),
      saldo_valor: (it?.saldo_valor as number | null) ?? null,
      saldo_motivo: String(it?.saldo_motivo ?? ''),
      entregue,
      produzido,
      atualizado_em: String(c.updated ?? ''),
    })
  }
  // filtro de produto/estado ativo é aplicado pós-busca (campos do item)
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
  let c: Record<string, unknown>
  try {
    c = (await pb
      .collection('contratos')
      .getOne(id, { expand: 'contratos_itens' })) as unknown as Record<string, unknown>
  } catch {
    return null
  }
  const itens = (c.expand as { contratos_itens?: unknown[] })?.contratos_itens ?? []
  const it = (itens as Record<string, unknown>[])[0] as Record<string, unknown> | undefined
  const unidade = (it?.unidade as string | null) ?? null
  const eventosRaw = it
    ? await pb.collection('contratos_eventos').getFullList({
        filter: pb.filter('item_id = {:i}', { i: String(it.id) }),
        sort: '-data_evento',
      })
    : []
  const eventos: EventoContrato[] = eventosRaw.map((ev) => ({
    id: String(ev.id),
    evento_tipo: String(ev.evento_tipo),
    quantidade: (ev.quantidade as number | null) ?? null,
    unidade: (ev.unidade as string | null) ?? null,
    data_evento: String(ev.data_evento ?? ''),
    fonte: String(ev.fonte ?? ''),
    registro_origem: String(ev.registro_origem ?? ''),
    carregado_em: String(ev.updated ?? ''),
  }))
  const { entregue, produzido } = agregarEventos(eventos, unidade)
  const carregamentoId = it ? String(it.carregamento_id ?? '') : ''
  let carregamento: ContratoDetalhe['carregamento'] = null
  if (carregamentoId) {
    try {
      const car = await pb.collection('proveniencia_carregamentos').getOne(carregamentoId)
      carregamento = {
        fonte: car.fonte,
        arquivo_lote: car.arquivo_lote,
        carregado_em: car.carregado_em,
      }
    } catch {
      /* proveniência opcional */
    }
  }
  return {
    id: String(c.id),
    codigo: String(c.codigo),
    cliente: String(c.cliente),
    mercado: String(c.mercado),
    estado_registro: String(c.estado_registro),
    prazo_fim: String(c.prazo_fim ?? ''),
    numero_contrato: String(c.numero_contrato ?? ''),
    sistema_origem: String(c.sistema_origem ?? ''),
    produto: String(it?.produto ?? ''),
    especie: String(it?.especie ?? ''),
    quantidade_vigente: (it?.quantidade_vigente as number | null) ?? null,
    unidade,
    saldo_estado: String(it?.saldo_estado ?? 'nao_calculavel'),
    saldo_valor: (it?.saldo_valor as number | null) ?? null,
    saldo_motivo: String(it?.saldo_motivo ?? ''),
    entregue,
    produzido,
    atualizado_em: String(c.updated ?? ''),
    eventos,
    carregamento,
  }
}

/** Resumo do topo — só soma unidades compatíveis; nunca mistura. */
export async function resumoContratos(): Promise<{
  ativos: number
  porUnidade: { unidade: string; contratado: number; entregue: number; saldo: number }[]
  incompletos: number
  divergentes: number
  totalRegistros: number
}> {
  const contratos = await pb.collection('contratos').getFullList({ expand: 'contratos_itens' })
  const porUnidade = new Map<string, { contratado: number; entregue: number; saldo: number }>()
  let ativos = 0
  let incompletos = 0
  let divergentes = 0
  for (const c of contratos as unknown as Record<string, unknown>[]) {
    const itens = (c.expand as { contratos_itens?: unknown[] })?.contratos_itens ?? []
    const it = (itens as Record<string, unknown>[])[0] as Record<string, unknown> | undefined
    if (!it) continue
    const estado = String(c.estado_registro)
    if (estado === 'vigente' || estado === 'suspenso') ativos++
    if (String(it.saldo_estado) === 'nao_calculavel') incompletos++
    if (String(it.saldo_estado) === 'em_divergencia') divergentes++
    const unidade = String(it.unidade ?? '')
    if (!unidade) continue
    const bucket = porUnidade.get(unidade) ?? { contratado: 0, entregue: 0, saldo: 0 }
    const qtd = it.quantidade_vigente as number | null
    if (qtd !== null && qtd !== undefined) bucket.contratado += qtd
    // saldo só entra quando calculado (não converte nulo em zero)
    if (String(it.saldo_estado) === 'calculado' && it.saldo_valor !== null)
      bucket.saldo += it.saldo_valor as number
    porUnidade.set(unidade, bucket)
  }
  // entregue por unidade: soma eventos de itens com saldo calculado
  for (const [unidade, bucket] of porUnidade) {
    const itens = await pb.collection('contratos_itens').getFullList({
      filter: pb.filter('unidade = {:u} && saldo_estado = {:s}', { u: unidade, s: 'calculado' }),
    })
    for (const it of itens) {
      const evs = await pb.collection('contratos_eventos').getFullList({
        filter: pb.filter('item_id = {:i}', { i: it.id }),
      })
      bucket.entregue += evs
        .filter((ev) => TIPOS_ENTREGA.includes(ev.evento_tipo) && ev.quantidade !== null)
        .reduce((s, ev) => s + (ev.quantidade as number), 0)
    }
  }
  return {
    ativos,
    porUnidade: [...porUnidade.entries()].map(([unidade, v]) => ({ unidade, ...v })),
    incompletos,
    divergentes,
    totalRegistros: contratos.length,
  }
}
