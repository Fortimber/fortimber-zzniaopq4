// F1-T03 — Modelo canônico (SPEC-F1-01)
// Collections: contratos, contratos_itens, contratos_eventos, proveniencia_carregamentos
// Premissas marcadas: D-F1-01..07 (ver work/fortimber-domain/docs/premissas-f1-t03.md)
migrate(
  (app) => {
    // ---------- contratos (cabeçalho) ----------
    const contratos = new Collection({
      name: 'contratos',
      type: 'base',
      // Fase 1: leitura para usuários autenticados; escrita só via carga (superuser/hooks)
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'codigo', type: 'text', required: true, max: 64 },
        // sistema de origem + identificador externo (chave externa preservada)
        { name: 'sistema_origem', type: 'text', required: true, max: 64 },
        { name: 'id_externo', type: 'text', required: true, max: 128 },
        { name: 'empresa_filial', type: 'text', max: 64 },
        { name: 'numero_contrato', type: 'text', max: 128 },
        {
          name: 'mercado',
          type: 'select',
          required: true,
          values: ['nacional', 'internacional'],
          maxSelect: 1,
        },
        { name: 'cliente', type: 'text', required: true, max: 200 },
        { name: 'trade', type: 'text', max: 200 },
        { name: 'estado_origem', type: 'text', max: 64 },
        // estado canônico — D-F1-01 (premissa: vigente/suspenso = ativo)
        {
          name: 'estado_registro',
          type: 'select',
          required: true,
          values: ['vigente', 'encerrado', 'cancelado', 'suspenso'],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date' },
        { name: 'prazo_fim', type: 'date' },
        { name: 'moeda', type: 'text', max: 8 },
        { name: 'preco_unitario', type: 'number' },
        { name: 'revisao', type: 'number', onlyInt: true, min: 1 },
        { name: 'observacao', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        // D-F1-01/§5.1: identidade composta — colisão vira exceção, não mescla
        'CREATE UNIQUE INDEX idx_contratos_identidade ON contratos (sistema_origem, id_externo, revisao)',
        'CREATE INDEX idx_contratos_estado ON contratos (estado_registro)',
        'CREATE INDEX idx_contratos_cliente ON contratos (cliente)',
      ],
    })
    app.save(contratos)

    // ---------- contratos_itens (item contratual) ----------
    const contratosId = app.findCollectionByNameOrId('contratos').id
    const itens = new Collection({
      name: 'contratos_itens',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'contrato_id',
          type: 'relation',
          required: true,
          collectionId: contratosId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'produto', type: 'text', required: true, max: 200 },
        { name: 'especie', type: 'text', max: 200 },
        { name: 'id_externo_item', type: 'text', max: 128 },
        // D-F1-04 (premissa): unidade da origem preservada; sem conversão
        { name: 'quantidade_vigente', type: 'number' }, // null = ausente, nunca zero
        { name: 'unidade', type: 'text', max: 32 }, // null = unidade desconhecida
        // saldo calculado pelo hook; 'nao_calculavel' quando não der para calcular
        {
          name: 'saldo_estado',
          type: 'select',
          required: true,
          values: ['calculado', 'nao_calculavel', 'em_divergencia', 'sem_eventos', 'cancelado'],
          maxSelect: 1,
        },
        { name: 'saldo_valor', type: 'number' }, // null quando não calculado
        { name: 'saldo_motivo', type: 'text', max: 300 },
        { name: 'saldo_calculado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_itens_identidade ON contratos_itens (contrato_id, produto, id_externo_item)',
        'CREATE INDEX idx_itens_contrato ON contratos_itens (contrato_id)',
      ],
    })
    app.save(itens)

    // ---------- contratos_eventos (entregas, produções, devoluções) ----------
    const eventos = new Collection({
      name: 'contratos_eventos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'item_id',
          type: 'relation',
          required: true,
          collectionId: itens.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'contrato_id',
          type: 'relation',
          required: true,
          collectionId: contratosId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        // D-F1-02 (premissa): expedicao/entrega_confirmada contam como entrega;
        // producao é exibida separada; devolucao = entrega com valor negativo
        {
          name: 'evento_tipo',
          type: 'select',
          required: true,
          values: ['expedicao', 'entrega_confirmada', 'producao', 'devolucao'],
          maxSelect: 1,
        },
        { name: 'quantidade', type: 'number' }, // null = ausente (nunca vira zero)
        { name: 'unidade', type: 'text', max: 32 },
        { name: 'data_evento', type: 'date' },
        // proveniência do evento (base do dedup e da rastreabilidade D-F1-07)
        { name: 'fonte', type: 'text', max: 64 },
        { name: 'registro_origem', type: 'text', max: 128 },
        { name: 'observacao', type: 'text', max: 500 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        // §5.1 + SPEC-F1-02: dedup por proveniência — reenvio não duplica
        'CREATE UNIQUE INDEX idx_eventos_dedup ON contratos_eventos (item_id, evento_tipo, fonte, registro_origem)',
        'CREATE INDEX idx_eventos_item ON contratos_eventos (item_id)',
        'CREATE INDEX idx_eventos_contrato ON contratos_eventos (contrato_id)',
      ],
    })
    app.save(eventos)

    // ---------- proveniencia_carregamentos (SPEC-F1-01 §4 proveniência) ----------
    const carregamentos = new Collection({
      name: 'proveniencia_carregamentos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'fonte', type: 'text', required: true, max: 64 },
        { name: 'arquivo_lote', type: 'text', max: 200 },
        { name: 'execucao_id', type: 'text', max: 128 },
        { name: 'extraido_em', type: 'date' },
        { name: 'carregado_em', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'carregado_por', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'registros_lidos', type: 'number', onlyInt: true },
        { name: 'registros_publicados', type: 'number', onlyInt: true },
        { name: 'registros_erro', type: 'number', onlyInt: true },
        {
          name: 'estado_validacao',
          type: 'select',
          required: true,
          values: ['ok', 'erro', 'pendente'],
          maxSelect: 1,
        },
        { name: 'observacoes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_carregamentos_fonte ON proveniencia_carregamentos (fonte, carregado_em)',
      ],
    })
    app.save(carregamentos)

    // proveniência por evento (carregamento vinculado)
    const eventosCol = app.findCollectionByNameOrId('contratos_eventos')
    eventosCol.fields.add(
      new RelationField({
        name: 'carregamento_id',
        collectionId: app.findCollectionByNameOrId('proveniencia_carregamentos').id,
        maxSelect: 1,
      }),
    )
    app.save(eventosCol)
  },
  (app) => {
    for (const name of [
      'contratos_eventos',
      'contratos_itens',
      'contratos',
      'proveniencia_carregamentos',
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
