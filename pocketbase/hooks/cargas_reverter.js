// F1-T04 — rollback controlado (SPEC-F1-02 §6.7/§8)
// POST /backend/v1/cargas/{id}/reverter — restaura o estado anterior à carga
// removendo os contratos que ela criou (cascade remove itens/eventos).
// F1-T06: papel obrigatório (operador/admin) — check inline no handler.
// Trilha: carga fica com estado 'revertida'; histórico não é apagado.
routerAdd(
  'POST',
  '/backend/v1/cargas/{id}/reverter',
  (e) => {
    // F1-T06: papel obrigatório (SPEC-F1-04 §3) — operador/admin; leitor/anônimo 403 neutro
    {
      const auth = e.auth
      const role = auth ? auth.getString('role') : ''
      if (role !== 'operador' && role !== 'admin') {
        if (auth)
          $app
            .logger()
            .warn(
              'acesso negado: papel insuficiente',
              'rota',
              e.request.url.path,
              'ator',
              auth.id,
              'papel',
              role,
            )
        return e.forbiddenError('Acesso restrito a operadores autorizados.')
      }
    }

    const id = e.request.pathValue('id')
    let carga = null
    try {
      carga = $app.findRecordById('cargas', id)
    } catch (_) {
      return e.json(404, { ok: false, erro: 'carga não encontrada' })
    }
    const estado = carga.getString('estado')
    if (estado !== 'publicada' && estado !== 'publicada_com_excecoes') {
      return e.json(400, {
        ok: false,
        erro: 'só carga publicada pode ser revertida (estado atual: ' + estado + ')',
      })
    }

    let ids = []
    try {
      ids = JSON.parse(carga.getString('contrato_ids') || '[]')
    } catch (_) {
      ids = []
    }
    if (!Array.isArray(ids)) ids = []

    let removidos = 0
    for (const cid of ids) {
      try {
        const rec = $app.findRecordById('contratos', cid)
        $app.delete(rec) // cascade: itens e eventos vinculados
        removidos++
      } catch (_) {}
    }

    carga.set('estado', 'revertida')
    carga.set(
      'observacoes',
      'rollback controlado: ' + removidos + ' contrato(s) removido(s) com cascade (itens/eventos)',
    )
    carga.set('finalizado_em', new DateTime().string())
    $app.save(carga)

    return e.json(200, {
      ok: true,
      carga_id: carga.id,
      estado: 'revertida',
      contratos_removidos: removidos,
    })
  },
  $apis.requireAuth(),
)
