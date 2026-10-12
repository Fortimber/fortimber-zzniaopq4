// F1-T06 — proveniência operacional detalhada só para operador/admin (SPEC-F1-04 §3)
// GET /backend/v1/cargas (lista de execuções) e detalhe de proveniência.
// Leitor comum consulta contratos/itens/eventos (dados de negócio), mas não a
// lista de cargas nem seus contadores operacionais.
routerAdd(
  'GET',
  '/backend/v1/cargas',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Acesso restrito.')
    const role = auth.getString('role')
    if (role !== 'operador' && role !== 'admin') {
      $app
        .logger()
        .warn(
          'acesso negado: proveniência operacional',
          'rota',
          '/backend/v1/cargas',
          'ator',
          auth.id,
          'papel',
          role,
        )
      return e.forbiddenError('Acesso restrito.')
    }
    const cargas = $app.findRecordsByFilter('cargas', '', '-created', 50, 0)
    const out = cargas.map((c) => ({
      id: c.id,
      arquivo_nome: c.getString('arquivo_nome'),
      estado: c.getString('estado'),
      total_linhas: c.getInt('total_linhas'),
      validas: c.getInt('validas'),
      incompletas: c.getInt('incompletas'),
      rejeitadas: c.getInt('rejeitadas'),
      duplicadas: c.getInt('duplicadas'),
      contratos_criados: c.getInt('contratos_criados'),
      eventos_criados: c.getInt('eventos_criados'),
      eventos_duplicados: c.getInt('eventos_duplicados'),
      created: c.getString('created'),
      finalizado_em: c.getString('finalizado_em'),
    }))
    return e.json(200, { ok: true, items: out })
  },
  $apis.requireAuth(),
)
