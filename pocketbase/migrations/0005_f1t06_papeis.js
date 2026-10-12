// F1-T06 — papéis e matriz de acesso (SPEC-F1-04 §3)
// users.role: leitor | operador | admin
// Matriz Fase 1:
//   leitor  — consulta lista/detalhe; NÃO vê proveniência operacional detalhada; NÃO publica
//   operador — consulta + proveniência + cargas (pré-validar/publicar/reverter)
//   admin   — tudo do operador + gerenciar papéis (via painel/superuser)
// Autopromoção bloqueada: update de role por usuário comum é recusado (só superuser/admin).
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['leitor', 'operador', 'admin'],
          maxSelect: 1,
          required: true,
        }),
      )
    }
    // updateRule: usuário só edita a si mesmo e NUNCA o próprio role
    // (SPEC-F1-04 §4: autorização no servidor, menor privilégio)
    users.updateRule =
      'id = @request.auth.id && @request.body.role:changed = false && @request.body.verified:changed = false && @request.body.emailVisibility:changed = false'
    users.createRule = "@request.auth.id != '' && @request.body.role != 'admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.updateRule = 'id = @request.auth.id'
    users.createRule = ''
    if (users.fields.getByName('role')) users.fields.removeByName('role')
    app.save(users)
  },
)
