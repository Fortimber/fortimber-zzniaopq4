// F1-T07 — ata de UAT exportável (SPEC-F1-04 §7: "Registro UAT com esperado/observado/
// evidência por cenário e decisão explícita")
// GET /backend/v1/uat/ata?formato=md|csv (padrão md)
// Retorna JSON { ok, formato, ata } — o corpo é string; download/conversão no cliente.
// Acesso: qualquer autenticado.
routerAdd(
  'GET',
  '/backend/v1/uat/ata',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Autenticação obrigatória.')

    const formato = (e.request.url.query().get('formato') || 'md').toLowerCase()
    const execs = $app.findRecordsByFilter('uat_execucoes', '', 'cenario_id,papel', 500, 0)
    let decisao = null
    try {
      const ds = $app.findRecordsByFilter('uat_decisoes', '', '-created', 1, 0)
      if (ds.length > 0) decisao = ds[0]
    } catch (_) {}

    const NOMES = {
      'nacional-simples': 'Contrato nacional simples',
      'exportacao-parcial': 'Contrato de exportação com entrega parcial',
      aditivo: 'Aditivo',
      'campo-ausente': 'Campo obrigatório ausente',
      duplicidade: 'Duplicidade/conflito',
      'carga-invalida': 'Carga inválida',
      'acesso-negado': 'Acesso negado',
      'fonte-desatualizada': 'Fonte desatualizada',
    }

    let ata = ''
    if (formato === 'csv') {
      ata =
        'cenario;cenario_nome;papel;representante;resultado;observado;evidencia;observacao;respondido_em\n'
      for (const x of execs) {
        const cid = x.getString('cenario_id')
        const campos = [
          cid,
          NOMES[cid] || cid,
          x.getString('papel'),
          x.getString('representante'),
          x.getString('resultado'),
          x.getString('observado'),
          x.getString('evidencia'),
          x.getString('observacao'),
          x.getString('updated'),
        ]
        ata += campos.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(';') + '\n'
      }
      if (decisao) {
        ata +=
          '\ndecisao;"' +
          decisao.getString('decisao') +
          '";responsavel;"' +
          decisao.getString('responsavel') +
          '";justificativa;"' +
          decisao.getString('justificativa').replace(/"/g, '""') +
          '";decidido_em;"' +
          decisao.getString('decidido_em') +
          '"\n'
      }
    } else {
      ata = '# Ata de UAT — Fase 1 (Fortimber — Adapta Native)\n\n'
      ata +=
        'Gerada em ' +
        new Date().toISOString().slice(0, 16).replace('T', ' ') +
        ' UTC por ' +
        auth.getString('name') +
        '\n\n'
      ata +=
        '| Cenário | Papel | Representante | Resultado | Observado | Evidência | Observação |\n'
      ata += '|---|---|---|---|---|---|---|\n'
      for (const x of execs) {
        const cid = x.getString('cenario_id')
        ata +=
          '| ' +
          (NOMES[cid] || cid) +
          ' (' +
          cid +
          ') | ' +
          x.getString('papel') +
          ' | ' +
          x.getString('representante') +
          ' | ' +
          x.getString('resultado') +
          ' | ' +
          (x.getString('observado') || '—') +
          ' | ' +
          (x.getString('evidencia') || '—') +
          ' | ' +
          (x.getString('observacao') || '—') +
          ' |\n'
      }
      if (decisao) {
        ata += '\n## Decisão de piloto\n\n'
        ata += '- **Decisão:** ' + decisao.getString('decisao') + '\n'
        ata += '- **Responsável:** ' + decisao.getString('responsavel') + '\n'
        ata += '- **Justificativa:** ' + decisao.getString('justificativa') + '\n'
        if (decisao.getString('bloqueios'))
          ata += '- **Bloqueios:** ' + decisao.getString('bloqueios') + '\n'
        ata += '- **Data:** ' + decisao.getString('decidido_em') + '\n'
      } else {
        ata +=
          '\n## Decisão de piloto\n\n_Pendente — nenhuma decisão registrada (a aprovação nunca é inferida por silêncio)._\n'
      }
    }
    return e.json(200, { ok: true, formato: formato, total_respostas: execs.length, ata: ata })
  },
  $apis.requireAuth(),
)
