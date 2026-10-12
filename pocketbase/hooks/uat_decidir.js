// F1-T07 — decisão de piloto (SPEC-F1-04 §8: "Aprovador da Fortimber registra go-live
// do piloto ou lista explícita de bloqueios; nenhuma aprovação é inferida por silêncio")
// POST /backend/v1/uat/decidir  body: { decisao, responsavel, justificativa, bloqueios? }
// Acesso: papel admin (usuário) ou superuser — aprovador técnico da plataforma.
// A decisão fica imutável (updateRule null) — nova decisão = novo registro.
routerAdd(
  'POST',
  '/backend/v1/uat/decidir',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Autenticação obrigatória.')
    const isSuper = e.hasSuperuserAuth()
    const isAdmin = auth.getString('role') === 'admin'
    if (!isSuper && !isAdmin) {
      $app
        .logger()
        .warn('acesso negado: decisão de piloto', 'ator', auth.id, 'papel', auth.getString('role'))
      return e.forbiddenError('Só o aprovador (admin) registra a decisão de piloto.')
    }

    const body = e.requestInfo().body
    const decisao = String((body && body.decisao) || '')
    const responsavel = String((body && body.responsavel) || '')
    const justificativa = String((body && body.justificativa) || '')
    const bloqueios = String((body && body.bloqueios) || '')
    const VALIDAS = ['piloto_aprovado', 'bloqueios_registrados', 'piloto_rejeitado']
    if (VALIDAS.indexOf(decisao) < 0)
      return e.badRequestError(
        'decisão inválida (piloto_aprovado/bloqueios_registrados/piloto_rejeitado)',
      )
    if (!responsavel) return e.badRequestError('responsavel obrigatório')
    if (!justificativa) return e.badRequestError('justificativa obrigatória')

    const rec = new Record($app.findCollectionByNameOrId('uat_decisoes'))
    rec.set('decisao', decisao)
    rec.set('responsavel', responsavel)
    rec.set('justificativa', justificativa)
    rec.set('bloqueios', bloqueios)
    $app.save(rec)

    $app
      .logger()
      .info(
        'uat: decisão de piloto registrada',
        'ator',
        auth.id,
        'decisao',
        decisao,
        'responsavel',
        responsavel,
      )
    return e.json(200, { ok: true, id: rec.id, decisao: decisao })
  },
  $apis.requireAuth(),
)
