// F1-T07 — UAT: registro de execuções por cenário (SPEC-F1-04 §7/§8)
// uat_execucoes: uma linha por (cenário, representante) — esperado/observado/evidência/resultado.
// uat_decisoes: decisão explícita de piloto (aprovado/bloqueado) com responsável e data.
// RLS: leitura autenticada; escrita via hook (ator registrado) — sem create anônimo.
migrate(
  (app) => {
    const exec = new Collection({
      name: 'uat_execucoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'cenario_id', type: 'text', required: true },
        {
          name: 'papel',
          type: 'select',
          values: ['champion', 'comercial', 'producao', 'aprovador'],
          maxSelect: 1,
          required: true,
        },
        { name: 'representante', type: 'text', required: true },
        {
          name: 'resultado',
          type: 'select',
          values: ['aprovado', 'reprovado', 'pendente'],
          maxSelect: 1,
          required: true,
        },
        { name: 'observado', type: 'text' },
        { name: 'evidencia', type: 'text' },
        { name: 'observacao', type: 'text' },
        { name: 'respondido_em', type: 'autodate', onCreate: true, onUpdate: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_uat_cenario_papel ON uat_execucoes (cenario_id, papel)'],
    })
    app.save(exec)

    const dec = new Collection({
      name: 'uat_decisoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'decisao',
          type: 'select',
          values: ['piloto_aprovado', 'bloqueios_registrados', 'piloto_rejeitado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'responsavel', type: 'text', required: true },
        { name: 'justificativa', type: 'text', required: true },
        { name: 'bloqueios', type: 'text' },
        { name: 'decidido_em', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(dec)
  },
  (app) => {
    for (const nome of ['uat_execucoes', 'uat_decisoes']) {
      try {
        app.delete(app.findCollectionByNameOrId(nome))
      } catch (_) {}
    }
  },
)
