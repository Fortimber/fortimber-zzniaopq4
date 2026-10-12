// F1-T03 — fixtures minimizadas (SPEC-F1-01 §10): casos normais + exceções
// Dados anonimizadas; quantidades em m3; valores esperados validados no núcleo
// de domínio (17 provas offline, 0 falhas).
migrate(
  (app) => {
    const carreg = app.findCollectionByNameOrId('proveniencia_carregamentos')
    const c1 = new Record(carreg)
    c1.set('fonte', 'fixture-piloto')
    c1.set('arquivo_lote', 'fixtures-f1-t03-v1')
    c1.set('execucao_id', 'fx-0001')
    c1.set('estado_validacao', 'ok')
    c1.set('registros_lidos', 8)
    c1.set('registros_publicados', 8)
    c1.set('registros_erro', 0)
    c1.set('observacoes', 'Fixtures F1-T03 — casos 1-8 da SPEC-F1-01 §10 (anonimizadas)')
    app.save(c1)

    const contratos = app.findCollectionByNameOrId('contratos')
    const itens = app.findCollectionByNameOrId('contratos_itens')
    const eventos = app.findCollectionByNameOrId('contratos_eventos')

    function novoContrato(
      codigo,
      idExterno,
      mercado,
      cliente,
      estado,
      prazo,
      revisao,
      preco,
      moeda,
    ) {
      const r = new Record(contratos)
      r.set('codigo', codigo)
      r.set('sistema_origem', 'fixture')
      r.set('id_externo', idExterno)
      r.set('numero_contrato', codigo)
      r.set('mercado', mercado)
      r.set('cliente', cliente)
      r.set('estado_registro', estado)
      r.set('data_inicio', '2026-01-01 00:00:00.000Z')
      r.set('prazo_fim', prazo)
      r.set('moeda', moeda)
      r.set('preco_unitario', preco)
      r.set('revisao', revisao)
      app.save(r)
      return r
    }

    function novoItem(
      contratoRec,
      produto,
      especie,
      qtd,
      unidade,
      saldoEstado,
      saldoValor,
      motivo,
    ) {
      const r = new Record(itens)
      r.set('contrato_id', contratoRec.id)
      r.set('produto', produto)
      r.set('especie', especie)
      r.set('id_externo_item', produto.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
      r.set('quantidade_vigente', qtd)
      r.set('unidade', unidade)
      r.set('saldo_estado', saldoEstado)
      r.set('saldo_valor', saldoValor)
      r.set('saldo_motivo', motivo)
      r.set('saldo_calculado_em', new DateTime().string())
      app.save(r)
      return r
    }

    function novoEvento(itemRec, contratoRec, tipo, qtd, unidade, data, registro, obs) {
      const r = new Record(eventos)
      r.set('item_id', itemRec.id)
      r.set('contrato_id', contratoRec.id)
      r.set('evento_tipo', tipo)
      r.set('quantidade', qtd)
      r.set('unidade', unidade)
      r.set('data_evento', data)
      r.set('fonte', 'fixture-piloto')
      r.set('registro_origem', registro)
      r.set('carregamento_id', c1.id)
      r.set('observacao', obs || '')
      app.save(r)
      return r
    }

    // C1 — contrato simples: 1000 m3, entrega 400 → saldo 600 (calculado)
    const k1 = novoContrato(
      'FX-001',
      'ext-001',
      'nacional',
      'Cliente Alpha',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      95.5,
      'BRL',
    )
    const i1 = novoItem(k1, 'Pinus serrado', 'Pinus elliottii', 1000, 'm3', 'calculado', 600, '')
    novoEvento(i1, k1, 'expedicao', 400, 'm3', '2026-09-10 00:00:00.000Z', 'EXP-001', 'caso 1')

    // C2 — entrega parcial: 1000, entrega 250 → saldo 750
    const k2 = novoContrato(
      'FX-002',
      'ext-002',
      'nacional',
      'Cliente Beta',
      'vigente',
      '2027-03-31 00:00:00.000Z',
      1,
      88,
      'BRL',
    )
    const i2 = novoItem(k2, 'Pinus serrado', 'Pinus elliottii', 1000, 'm3', 'calculado', 750, '')
    novoEvento(i2, k2, 'expedicao', 250, 'm3', '2026-08-20 00:00:00.000Z', 'EXP-002', 'caso 2')

    // C3 — aditivo: revisão 2 eleva 1000→1200, entregou 400 → saldo 800
    const k3 = novoContrato(
      'FX-003',
      'ext-003',
      'internacional',
      'Cliente Gama',
      'vigente',
      '2027-12-31 00:00:00.000Z',
      2,
      102,
      'USD',
    )
    const i3 = novoItem(k3, 'Pinus tratado', 'Pinus taeda', 1200, 'm3', 'calculado', 800, '')
    novoEvento(
      i3,
      k3,
      'entrega_confirmada',
      400,
      'm3',
      '2026-09-05 00:00:00.000Z',
      'ENT-003',
      'caso 3 — aditivo revisão 2',
    )

    // C4 — unidade incompatível: entrega em tonelada → nao_calculavel
    const k4 = novoContrato(
      'FX-004',
      'ext-004',
      'nacional',
      'Cliente Delta',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      77,
      'BRL',
    )
    const i4 = novoItem(
      k4,
      'Eucalipto',
      'Eucalyptus grandis',
      500,
      'm3',
      'nao_calculavel',
      null,
      'unidade incompatível ou quantidade ausente em 1 evento(s)',
    )
    novoEvento(
      i4,
      k4,
      'expedicao',
      120,
      'tonelada',
      '2026-09-15 00:00:00.000Z',
      'EXP-004',
      'caso 4 — unidade incompatível',
    )

    // C6/C7 — produzido separado do entregue: produção 900, entrega 400 → saldo 600, produzido 900
    const k6 = novoContrato(
      'FX-006',
      'ext-006',
      'nacional',
      'Cliente Epsilon',
      'vigente',
      '2027-09-30 00:00:00.000Z',
      1,
      91,
      'BRL',
    )
    const i6 = novoItem(k6, 'Pinus serrado', 'Pinus elliottii', 1000, 'm3', 'calculado', 600, '')
    novoEvento(
      i6,
      k6,
      'producao',
      900,
      'm3',
      '2026-09-01 00:00:00.000Z',
      'PROD-006',
      'caso 6 — produzido separado',
    )
    novoEvento(i6, k6, 'expedicao', 400, 'm3', '2026-09-10 00:00:00.000Z', 'EXP-006', 'caso 6')

    // C7 — quantidade ausente: null em quantidade_vigente → nao_calculavel (nunca zero)
    const k7 = novoContrato(
      'FX-007',
      'ext-007',
      'internacional',
      'Cliente Zeta',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      100,
      'USD',
    )
    novoItem(
      k7,
      'Pinus seco',
      'Pinus elliottii',
      null,
      'm3',
      'nao_calculavel',
      null,
      'quantidade contratada ausente — não converter ausência em zero',
    )

    // C7b — sem eventos: 800 m3 sem entrega → sem_eventos
    const k7b = novoContrato(
      'FX-008',
      'ext-008',
      'nacional',
      'Cliente Eta',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      85,
      'BRL',
    )
    novoItem(
      k7b,
      'Pinus serrado',
      'Pinus elliottii',
      800,
      'm3',
      'sem_eventos',
      null,
      'nenhum evento de entrega reconhecido',
    )

    // C8a — excedente: contrato 1000, entrega 1100 → saldo -100 (não trunca)
    const k8 = novoContrato(
      'FX-009',
      'ext-009',
      'nacional',
      'Cliente Theta',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      93,
      'BRL',
    )
    const i8 = novoItem(k8, 'Pinus serrado', 'Pinus elliottii', 1000, 'm3', 'calculado', -100, '')
    novoEvento(
      i8,
      k8,
      'expedicao',
      1100,
      'm3',
      '2026-10-01 00:00:00.000Z',
      'EXP-009',
      'caso 8a — excedente visível',
    )

    // C8b — cancelado: sem saldo
    const k8b = novoContrato(
      'FX-010',
      'ext-010',
      'nacional',
      'Cliente Iota',
      'cancelado',
      '2027-06-30 00:00:00.000Z',
      1,
      90,
      'BRL',
    )
    const i8b = novoItem(
      k8b,
      'Pinus serrado',
      'Pinus elliottii',
      700,
      'm3',
      'cancelado',
      null,
      'contrato cancelado',
    )
    novoEvento(
      i8b,
      k8b,
      'expedicao',
      200,
      'm3',
      '2026-07-10 00:00:00.000Z',
      'EXP-010',
      'caso 8b — cancelado',
    )

    // C8d — devolução: entrega 400, devolveu 100 → saldo 700
    const k8d = novoContrato(
      'FX-011',
      'ext-011',
      'nacional',
      'Cliente Kappa',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      89,
      'BRL',
    )
    const i8d = novoItem(k8d, 'Pinus serrado', 'Pinus elliottii', 1000, 'm3', 'calculado', 700, '')
    novoEvento(i8d, k8d, 'expedicao', 400, 'm3', '2026-08-15 00:00:00.000Z', 'EXP-011', 'caso 8d')
    novoEvento(
      i8d,
      k8d,
      'devolucao',
      -100,
      'm3',
      '2026-09-01 00:00:00.000Z',
      'DEV-011',
      'caso 8d — devolução',
    )

    // C8c — divergência entre fontes: erp=400 vs planilha=500 → em_divergencia
    const k8c = novoContrato(
      'FX-012',
      'ext-012',
      'nacional',
      'Cliente Lambda',
      'vigente',
      '2027-06-30 00:00:00.000Z',
      1,
      87,
      'BRL',
    )
    const i8c = novoItem(
      k8c,
      'Pinus serrado',
      'Pinus elliottii',
      1000,
      'm3',
      'em_divergencia',
      null,
      'fontes de entrega conflitantes — valores preservados nos eventos',
    )
    novoEvento(
      i8c,
      k8c,
      'expedicao',
      400,
      'm3',
      '2026-09-12 00:00:00.000Z',
      'EXP-012',
      'caso 8c — fonte erp',
    )
    novoEvento(
      i8c,
      k8c,
      'expedicao',
      500,
      'm3',
      '2026-09-12 00:00:00.000Z',
      'EXP-012-P',
      'caso 8c — fonte planilha',
    )

    console.log('fixtures F1-T03 aplicadas: 11 contratos, 11 itens, 12 eventos, 1 carregamento')
  },
  (app) => {
    // down: remove fixtures (contratos cascade → itens → eventos; carregamento separado)
    for (const codigo of [
      'FX-001',
      'FX-002',
      'FX-003',
      'FX-004',
      'FX-006',
      'FX-007',
      'FX-008',
      'FX-009',
      'FX-010',
      'FX-011',
      'FX-012',
    ]) {
      try {
        const recs = app.findRecordsByFilter('contratos', 'codigo = {:c}', '', 0, 0, codigo)
        for (const r of recs) app.delete(r)
      } catch (_) {}
    }
    try {
      const carregs = app.findRecordsByFilter(
        'proveniencia_carregamentos',
        'fonte = {:f}',
        '',
        0,
        0,
        'fixture-piloto',
      )
      for (const r of carregs) app.delete(r)
    } catch (_) {}
  },
)
