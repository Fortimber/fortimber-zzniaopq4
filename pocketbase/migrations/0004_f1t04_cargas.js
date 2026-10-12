// F1-T04 — collection cargas: relatório de execução de carga (SPEC-F1-02 §3/§7)
migrate(
  (app) => {
    const cargas = new Collection({
      name: 'cargas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'checksum', type: 'text', required: true, max: 64 },
        { name: 'arquivo_nome', type: 'text', max: 200 },
        { name: 'template_v', type: 'text', required: true, max: 16 },
        { name: 'usuario_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        // SPEC §3: estado final da execução
        {
          name: 'estado',
          type: 'select',
          required: true,
          values: [
            'pre_validando',
            'pronta_aprovacao',
            'publicada',
            'publicada_com_excecoes',
            'rejeitada',
            'revertida',
          ],
          maxSelect: 1,
        },
        { name: 'total_linhas', type: 'number', onlyInt: true },
        { name: 'validas', type: 'number', onlyInt: true },
        { name: 'incompletas', type: 'number', onlyInt: true },
        { name: 'rejeitadas', type: 'number', onlyInt: true },
        { name: 'duplicadas', type: 'number', onlyInt: true },
        { name: 'contratos_criados', type: 'number', onlyInt: true },
        { name: 'eventos_criados', type: 'number', onlyInt: true },
        { name: 'eventos_duplicados', type: 'number', onlyInt: true },
        { name: 'erros', type: 'json', maxSize: 200000 },
        { name: 'contrato_ids', type: 'json', maxSize: 200000 }, // p/ rollback controlado
        {
          name: 'carregamento_id',
          type: 'relation',
          collectionId: app.findCollectionByNameOrId('proveniencia_carregamentos').id,
          maxSelect: 1,
        },
        { name: 'finalizado_em', type: 'date' },
        { name: 'observacoes', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        // reenvio idêntico detectável por checksum
        'CREATE UNIQUE INDEX idx_cargas_checksum ON cargas (checksum)',
        'CREATE INDEX idx_cargas_estado ON cargas (estado)',
      ],
    })
    app.save(cargas)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('cargas'))
    } catch (_) {}
  },
)
