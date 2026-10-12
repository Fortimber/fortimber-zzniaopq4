// F1-T06 — gate de papel para as rotas de carga (SPEC-F1-04 §3)
// operador/admin podem; leitor recebe 403 neutro (sem confirmar existência de dados).
// Negação registrada em log (ator, rota) sem payload comercial.
routerAdd((e) => {
  const path = e.request.url.path
  const isCarga = path.startsWith('/backend/v1/cargas')
  if (!isCarga) return e.next()

  const auth = e.auth
  if (!auth) {
    $app.logger().warn('acesso negado: anônimo', 'rota', path)
    return e.forbiddenError('Acesso restrito a operadores autorizados.')
  }
  const role = auth.getString('role')
  if (role !== 'operador' && role !== 'admin') {
    $app
      .logger()
      .warn('acesso negado: papel insuficiente', 'rota', path, 'ator', auth.id, 'papel', role)
    return e.forbiddenError('Acesso restrito a operadores autorizados.')
  }
  return e.next()
})
