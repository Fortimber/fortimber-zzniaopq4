import React, { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// F1-T07 — UAT (SPEC-F1-04 §7): roteiro de aceite com esperado/observado/evidência
// por cenário, consolidação e decisão explícita de piloto (nunca inferida por silêncio).

interface Resposta {
  papel: string
  representante: string
  resultado: string
  observado: string
  evidencia: string
  observacao: string
  respondido_em: string
}

interface ResumoCenario {
  cenario_id: string
  nome: string
  acao: string
  esperado: string
  respostas: Resposta[]
  aprovados: number
  reprovados: number
  estado: string
}

interface Decisao {
  decisao: string
  responsavel: string
  justificativa: string
  bloqueios?: string
  decidido_em: string
}

const CENARIOS: { id: string; nome: string; acao: string; esperado: string }[] = [
  {
    id: 'nacional-simples',
    nome: 'Contrato nacional simples',
    acao: 'Buscar e abrir contrato da amostra nacional',
    esperado: 'Valores e unidade iguais à regra aprovada; origem e atualização presentes',
  },
  {
    id: 'exportacao-parcial',
    nome: 'Contrato de exportação com entrega parcial',
    acao: 'Abrir o contrato e verificar eventos',
    esperado: 'Produzido separado de entregue; saldo conforme marco decidido',
  },
  {
    id: 'aditivo',
    nome: 'Aditivo',
    acao: 'Abrir contrato alterado',
    esperado: 'Versão vigente correta, histórico/proveniência preservados',
  },
  {
    id: 'campo-ausente',
    nome: 'Campo obrigatório ausente',
    acao: 'Abrir registro incompleto',
    esperado: 'Estado não calculável/ausente, sem valor zero inventado',
  },
  {
    id: 'duplicidade',
    nome: 'Duplicidade/conflito',
    acao: 'Consultar registro sinalizado',
    esperado: 'Não há mescla silenciosa; referências conflitantes visíveis ao perfil permitido',
  },
  {
    id: 'carga-invalida',
    nome: 'Carga inválida',
    acao: 'Importar arquivo de teste rejeitável',
    esperado: 'Versão publicada anterior permanece ativa; erro acionável é apresentado',
  },
  {
    id: 'acesso-negado',
    nome: 'Acesso negado',
    acao: 'Usuário sem papel tenta acessar rota/dado',
    esperado: 'Dados não são retornados nem existência confirmada quando restrita',
  },
  {
    id: 'fonte-desatualizada',
    nome: 'Fonte desatualizada',
    acao: 'Consultar dataset além da janela aprovada',
    esperado: 'Banner/estado de desatualização, com timestamp e impacto',
  },
]

const PAPEIS = ['champion', 'comercial', 'producao', 'aprovador']

export const Uat: React.FC = () => {
  const [logado, setLogado] = useState(pb.authStore.isValid)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [resumo, setResumo] = useState<ResumoCenario[]>([])
  const [decisao, setDecisao] = useState<Decisao | null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  // formulário
  const [cenarioId, setCenarioId] = useState(CENARIOS[0].id)
  const [papel, setPapel] = useState(PAPEIS[0])
  const [representante, setRepresentante] = useState('')
  const [resultado, setResultado] = useState('aprovado')
  const [observado, setObservado] = useState('')
  const [evidencia, setEvidencia] = useState('')
  const [observacao, setObservacao] = useState('')

  // decisão
  const [decFinal, setDecFinal] = useState('piloto_aprovado')
  const [responsavelDec, setResponsavelDec] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [bloqueios, setBloqueios] = useState('')

  const carregar = async () => {
    try {
      const res = await pb.send('/backend/v1/uat/consolidar', { method: 'GET' })
      const r = res as unknown as { resumo: ResumoCenario[]; decisao: Decisao | null }
      setResumo(
        (r.resumo || []).map((x) => {
          const meta = CENARIOS.find((c) => c.id === x.cenario_id)
          return {
            ...x,
            nome: meta?.nome ?? x.cenario_id,
            acao: meta?.acao ?? '',
            esperado: meta?.esperado ?? '',
          }
        }),
      )
      setDecisao(r.decisao)
    } catch (e2) {
      setErro('Falha ao consolidar: ' + (e2 as Error).message)
    }
  }

  useEffect(() => {
    if (logado) void carregar()
  }, [logado])

  const login = async () => {
    setErro('')
    setOcupado(true)
    try {
      await pb.collection('users').authWithPassword(email, senha)
      setLogado(true)
    } catch (e2) {
      setErro('Login inválido: ' + (e2 as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const responder = async () => {
    setErro('')
    setOcupado(true)
    try {
      await pb.send('/backend/v1/uat/responder', {
        method: 'POST',
        body: {
          cenario_id: cenarioId,
          papel,
          representante,
          resultado,
          observado,
          evidencia,
          observacao,
        },
      })
      setObservado('')
      setEvidencia('')
      setObservacao('')
      await carregar()
    } catch (e2) {
      setErro('Falha ao registrar: ' + (e2 as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const decidir = async () => {
    setErro('')
    setOcupado(true)
    try {
      await pb.send('/backend/v1/uat/decidir', {
        method: 'POST',
        body: { decisao: decFinal, responsavel: responsavelDec, justificativa, bloqueios },
      })
      await carregar()
    } catch (e2) {
      setErro('Falha ao registrar decisão: ' + (e2 as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (!logado) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">UAT</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso do representante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={email} onChange={(e2) => setEmail(e2.target.value)} placeholder="email" />
            <Input
              type="password"
              value={senha}
              onChange={(e2) => setSenha(e2.target.value)}
              placeholder="senha"
              onKeyDown={(e2) => {
                if (e2.key === 'Enter') void login()
              }}
            />
            <Button onClick={() => void login()} disabled={ocupado || !senha}>
              Entrar
            </Button>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  const badgeEstado = (estado: string) => {
    if (estado === 'aprovado')
      return <Badge className="bg-green-100 text-green-800">aprovado</Badge>
    if (estado === 'reprovado') return <Badge className="bg-red-100 text-red-800">reprovado</Badge>
    if (estado === 'parcial') return <Badge className="bg-amber-100 text-amber-800">parcial</Badge>
    return <Badge variant="secondary">sem resposta</Badge>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">
          UAT — Aceite da Fase 1
        </h1>
        <p className="text-sm text-[#617169] mt-1">
          Roteiro de aceite humano (SPEC-F1-04 §7): esperado/observado/evidência por cenário.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar execução de cenário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-[#617169]">Cenário</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={cenarioId}
                onChange={(e2) => setCenarioId(e2.target.value)}
              >
                {CENARIOS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#617169]">Papel</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={papel}
                onChange={(e2) => setPapel(e2.target.value)}
              >
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#617169]">Representante</label>
              <Input
                value={representante}
                onChange={(e2) => setRepresentante(e2.target.value)}
                placeholder="nome"
              />
            </div>
            <div>
              <label className="text-xs text-[#617169]">Resultado</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={resultado}
                onChange={(e2) => setResultado(e2.target.value)}
              >
                <option value="aprovado">aprovado</option>
                <option value="reprovado">reprovado</option>
                <option value="pendente">pendente</option>
              </select>
            </div>
          </div>
          <Textarea
            rows={2}
            value={observado}
            onChange={(e2) => setObservado(e2.target.value)}
            placeholder="Observado (o que você viu na tela/API)"
          />
          <Input
            value={evidencia}
            onChange={(e2) => setEvidencia(e2.target.value)}
            placeholder="Evidência (ID do caso, captura, export)"
          />
          <Textarea
            rows={2}
            value={observacao}
            onChange={(e2) => setObservacao(e2.target.value)}
            placeholder="Observação (obrigatória se reprovado — classifique: cálculo→SPEC-F1-01; carga→F1-02; exibição→F1-03)"
          />
          <Button onClick={() => void responder()} disabled={ocupado || !representante}>
            Registrar resposta
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consolidação por cenário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {resumo.map((c) => (
            <div key={c.cenario_id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{c.nome}</p>
                  <p className="text-xs text-[#617169]">
                    {c.acao} — esperado: {c.esperado}
                  </p>
                </div>
                {badgeEstado(c.estado)}
              </div>
              {c.respostas.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Papel</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Observado</TableHead>
                      <TableHead>Evidência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {c.respostas.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.papel}</TableCell>
                        <TableCell>{r.representante}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.resultado === 'aprovado'
                                ? 'default'
                                : r.resultado === 'reprovado'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {r.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{r.observado || '—'}</TableCell>
                        <TableCell className="text-xs">{r.evidencia || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Decisão de piloto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {decisao ? (
            <div className="text-sm space-y-1">
              <p>
                <Badge>{decisao.decisao}</Badge>
              </p>
              <p>Responsável: {decisao.responsavel}</p>
              <p className="text-[#617169]">{decisao.justificativa}</p>
              {decisao.bloqueios && (
                <p className="text-amber-700">Bloqueios: {decisao.bloqueios}</p>
              )}
              <p className="text-xs text-[#617169]">Registrada em {decisao.decidido_em}</p>
            </div>
          ) : (
            <p className="text-sm text-[#617169]">
              Nenhuma decisão registrada — a aprovação nunca é inferida por silêncio (SPEC-F1-04
              §8).
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#617169]">Decisão</label>
              <select
                className="w-full border rounded-md px-2 py-2 text-sm"
                value={decFinal}
                onChange={(e2) => setDecFinal(e2.target.value)}
              >
                <option value="piloto_aprovado">piloto_aprovado</option>
                <option value="bloqueios_registrados">bloqueios_registrados</option>
                <option value="piloto_rejeitado">piloto_rejeitado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[#617169]">Responsável (aprovador)</label>
              <Input
                value={responsavelDec}
                onChange={(e2) => setResponsavelDec(e2.target.value)}
                placeholder="nome do aprovador"
              />
            </div>
          </div>
          <Textarea
            rows={2}
            value={justificativa}
            onChange={(e2) => setJustificativa(e2.target.value)}
            placeholder="Justificativa"
          />
          <Input
            value={bloqueios}
            onChange={(e2) => setBloqueios(e2.target.value)}
            placeholder="Bloqueios (opcional)"
          />
          <Button
            onClick={() => void decidir()}
            disabled={ocupado || !responsavelDec || !justificativa}
          >
            Registrar decisão (só admin)
          </Button>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  pb.buildUrl('/backend/v1/uat/ata?formato=md') +
                    '&token=' +
                    (pb.authStore.token || ''),
                  '_blank',
                )
              }
            >
              Exportar ata (Markdown)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                window.open(
                  pb.buildUrl('/backend/v1/uat/ata?formato=csv') +
                    '&token=' +
                    (pb.authStore.token || ''),
                  '_blank',
                )
              }
            >
              Exportar ata (CSV)
            </Button>
          </div>
        </CardContent>
      </Card>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}

export default Uat
