// F1-T07 — promove o champion (uat@fortimber.local) a admin
// Motivo: o aprovador da UAT precisa registrar a decisão de piloto
// (uat_decidir exige admin/superuser). Idempotente.
migrate(
  (app) => {
    let u = null
    try {
      u = app.findAuthRecordByEmail('_pb_users_auth_', 'uat@fortimber.local')
    } catch (_) {
      return
    }
    u.set('role', 'admin')
    app.save(u)
  },
  (app) => {
    try {
      const u = app.findAuthRecordByEmail('_pb_users_auth_', 'uat@fortimber.local')
      u.set('role', 'leitor')
      app.save(u)
    } catch (_) {}
  },
)
