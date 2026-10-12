// F1-T06 — promoção de papel controlada (SPEC-F1-04 §3)
// POST /backend/v1/usuarios/papel  body: { usuario_id, role }
// Só admin (usuário com role=admin) ou superuser promove; trilha de ator registrada.
routerAdd(
  'POST',
  '/backend/v1/usuarios/papel',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Acesso restrito.')
    const body = e.requestInfo().body
    const alvoId = String((body && body.usuario_id) || '')
    const novoRole = String((body && body.role) || '')
    const ROLES = ['leitor', 'operador', 'admin']
    if (ROLES.indexOf(novoRole) < 0) return e.badRequestError('papel inválido')
    if (!alvoId) return e.badRequestError('usuario_id obrigatório')

    const isSuper = e.hasSuperuserAuth()
    const isAdmin = auth.getString('role') === 'admin'
    if (!isSuper && !isAdmin) {
      $app
        .logger()
        .warn(
          'acesso negado: promoção de papel',
          'rota',
          '/backend/v1/usuarios/papel',
          'ator',
          auth.id,
          'papel',
          auth.getString('role'),
        )
      return e.forbiddenError('Acesso restrito a administradores.')
    }

    let alvo = null
    try {
      alvo = $app.findRecordById('users', alvoId)
    } catch (_) {
      return e.notFoundError('usuário não encontrado')
    }

    const anterior = alvo.getString('role')
    alvo.set('role', novoRole)
    $app.save(alvo)
    $app
      .logger()
      .info('papel alterado', 'ator', auth.id, 'alvo', alvoId, 'de', anterior, 'para', novoRole)
    return e.json(200, { ok: true, usuario_id: alvoId, role: novoRole })
  },
  $apis.requireAuth(),
)
