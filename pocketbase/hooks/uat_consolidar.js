// F1-T07 — consolidação da UAT (SPEC-F1-04 §8)
// GET /backend/v1/uata/consolidar → não; correção: GET /backend/v1/uat/consolidar
// Retorna: resumo por cenário (aprovado/reprovado/pendente por papel), bloqueios
// (reprovados com observação), decisão de piloto registrada (se houver).
// Acesso: qualquer autenticado (transparência do aceite) — a DECISÃO fica em uat_decisoes.
routerAdd(
  'GET',
  '/backend/v1/uat/consolidar',
  (e) => {
    const auth = e.auth
    if (!auth) return e.forbiddenError('Autenticação obrigatória.')

    const execs = $app.findRecordsByFilter('uat_execucoes', '', '-created', 200, 0)
    const porCenario = {}
    for (const x of execs) {
      const cid = x.getString('cenario_id')
      if (!porCenario[cid]) porCenario[cid] = []
      porCenario[cid].push({
        papel: x.getString('papel'),
        representante: x.getString('representante'),
        resultado: x.getString('resultado'),
        observado: x.getString('observado'),
        evidencia: x.getString('evidencia'),
        observacao: x.getString('observacao'),
        respondido_em: x.getString('updated'),
      })
    }

    const CENARIOS = [
      'nacional-simples',
      'exportacao-parcial',
      'aditivo',
      'campo-ausente',
      'duplicidade',
      'carga-invalida',
      'acesso-negado',
      'fonte-desatualizada',
    ]
    const resumo = CENARIOS.map((cid) => {
      const respostas = porCenario[cid] || []
      const aprovados = respostas.filter((r) => r.resultado === 'aprovado').length
      const reprovados = respostas.filter((r) => r.resultado === 'reprovado').length
      const estado =
        reprovados > 0
          ? 'reprovado'
          : respostas.length === 0
            ? 'sem_resposta'
            : aprovados >= 2
              ? 'aprovado'
              : 'parcial'
      return {
        cenario_id: cid,
        respostas: respostas,
        aprovados: aprovados,
        reprovados: reprovados,
        estado: estado,
      }
    })

    let decisao = null
    try {
      const ds = $app.findRecordsByFilter('uat_decisoes', '', '-created', 1, 0)
      if (ds.length > 0) {
        decisao = {
          decisao: ds[0].getString('decisao'),
          responsavel: ds[0].getString('responsavel'),
          justificativa: ds[0].getString('justificativa'),
          bloqueios: ds[0].getString('bloqueios'),
          decidido_em: ds[0].getString('decidido_em'),
        }
      }
    } catch (_) {
      decisao = null
    }

    const totalCenarios = resumo.length
    const aprovados = resumo.filter((r) => r.estado === 'aprovado').length
    const reprovados = resumo.filter((r) => r.estado === 'reprovado').length
    return e.json(200, {
      ok: true,
      resumo: resumo,
      total_cenarios: totalCenarios,
      cenarios_aprovados: aprovados,
      cenarios_reprovados: reprovados,
      decisao: decisao,
    })
  },
  $apis.requireAuth(),
)
