// F1-T07 — hook de resposta da UAT (SPEC-F1-04 §7)
// POST /backend/v1/uat/responder  body: { cenario_id, papel, representante, resultado, observado, evidencia, observacao }
// upsert por (cenario_id, papel) — cada representante registra esperado/observado/evidência.
// Acesso: qualquer usuário autenticado com papel da UAT (champion/comercial/producao/aprovador).
// Trilha de ator: respondido_por = auth.id (SPEC §8: operações deixam trilha de ator e instante).
routerAdd(
  'POST',
  '/backend/v1/uat/responder',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Autenticação obrigatória.')

    const body = e.requestInfo().body
    const cenarioId = String((body && body.cenario_id) || '')
    const papel = String((body && body.papel) || '')
    const representante = String((body && body.representante) || '')
    const resultado = String((body && body.resultado) || 'pendente')
    const observado = String((body && body.observado) || '')
    const evidencia = String((body && body.evidencia) || '')
    const observacao = String((body && body.observacao) || '')

    const PAPEIS = ['champion', 'comercial', 'producao', 'aprovador']
    const RESULTADOS = ['aprovado', 'reprovado', 'pendente']
    if (!cenarioId) return e.badRequestError('cenario_id obrigatório')
    if (PAPEIS.indexOf(papel) < 0)
      return e.badRequestError('papel inválido (champion/comercial/producao/aprovador)')
    if (!representante) return e.badRequestError('representante obrigatório')
    if (RESULTADOS.indexOf(resultado) < 0) return e.badRequestError('resultado inválido')
    if (resultado === 'reprovado' && !observacao)
      return e.badRequestError(
        'reprovado exige observação (classifique: cálculo→SPEC-F1-01; carga/proveniência→SPEC-F1-02; exibição/filtro→SPEC-F1-03)',
      )

    // upsert idempotente por (cenario_id, papel)
    let rec = null
    try {
      const existentes = $app.findRecordsByFilter(
        'uat_execucoes',
        'cenario_id = {:c} && papel = {:p}',
        '',
        1,
        0,
        { c: cenarioId, p: papel },
      )
      if (existentes.length > 0) rec = existentes[0]
    } catch (_) {
      rec = null
    }
    if (!rec) {
      rec = new Record($app.findCollectionByNameOrId('uat_execucoes'))
      rec.set('cenario_id', cenarioId)
      rec.set('papel', papel)
    }
    rec.set('representante', representante)
    rec.set('resultado', resultado)
    rec.set('observado', observado)
    rec.set('evidencia', evidencia)
    rec.set('observacao', observacao)
    rec.set('respondido_por', auth.id)
    $app.save(rec)

    $app
      .logger()
      .info(
        'uat: resposta registrada',
        'ator',
        auth.id,
        'cenario',
        cenarioId,
        'papel',
        papel,
        'resultado',
        resultado,
      )
    return e.json(200, {
      ok: true,
      id: rec.id,
      cenario_id: cenarioId,
      papel: papel,
      resultado: resultado,
    })
  },
  $apis.requireAuth(),
)
