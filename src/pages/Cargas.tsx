import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// F1-T04 — Carga-piloto auditável (SPEC-F1-02): pré-validar → publicar → relatório.
// Serve também de prova e2e dos hooks de saldo/dedup da F1-T03.

interface ErroValidacao {
  linha: number
  coluna?: string
  codigo: string
  mensagem: string
}
interface Previa {
  ok: boolean
  carga_id?: string
  erro_estrutural?: string
  checksum?: string
  total_linhas?: number
  validas?: number
  incompletas?: number
  rejeitadas?: number
  duplicadas_no_lote?: number
  erros?: ErroValidacao[]
  previa?: { linha: number; tipo: string; dados: Record<string, string> }[]
}
interface RelatorioPublicacao {
  ok: boolean
  repetida?: boolean
  carga_id: string
  estado?: string
  mensagem?: string
  erro?: string
  relatorio?: {
    contratos_criados: number
    eventos_criados: number
    eventos_duplicados: number
    incompletas: number
    erros: ErroValidacao[]
    estado: string
  }
}

interface CargaHist {
  id: string
  arquivo_nome: string
  estado: string
  total_linhas: number
  validas: number
  contratos_criados: number
  eventos_criados: number
  eventos_duplicados: number
  created: string
}

export const Cargas: React.FC = () => {
  const [logado, setLogado] = useState(pb.authStore.isValid)
  const [email, setEmail] = useState('uat@fortimber.local')
  const [senha, setSenha] = useState('')
  const [csv, setCsv] = useState('')
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [resultado, setResultado] = useState<RelatorioPublicacao | null>(null)
  const [historico, setHistorico] = useState<CargaHist[]>([])
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const carregarHistorico = async () => {
    try {
      const res = await pb.collection('cargas').getFullList({ sort: '-created' })
      setHistorico(res as unknown as CargaHist[])
    } catch {
      /* sem permissão: ignora */
    }
  }

  const login = async () => {
    setErro('')
    setOcupado(true)
    try {
      await pb.collection('users').authWithPassword(email, senha)
      setLogado(true)
      await carregarHistorico()
    } catch (e) {
      setErro('Login inválido: ' + (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const prevalidar = async () => {
    setErro('')
    setPrevia(null)
    setResultado(null)
    setOcupado(true)
    try {
      const res = await pb.send('/backend/v1/cargas/prevalidar', {
        method: 'POST',
        body: { texto_csv: csv, arquivo_nome: 'colado-ui.csv' },
      })
      setPrevia(res as unknown as Previa)
    } catch (e) {
      setErro('Falha na pré-validação: ' + (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const publicar = async () => {
    if (!previa?.carga_id) return
    setErro('')
    setResultado(null)
    setOcupado(true)
    try {
      const res = await pb.send('/backend/v1/cargas/publicar', {
        method: 'POST',
        body: { carga_id: previa.carga_id, texto_csv: csv },
      })
      setResultado(res as unknown as RelatorioPublicacao)
      await carregarHistorico()
    } catch (e) {
      setErro('Falha na publicação: ' + (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  const reverter = async (id: string) => {
    setErro('')
    setOcupado(true)
    try {
      await pb.send(`/backend/v1/cargas/${id}/reverter`, { method: 'POST' })
      await carregarHistorico()
    } catch (e) {
      setErro('Falha no rollback: ' + (e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (!logado) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">Cargas</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso do operador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="senha"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void login()
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

  const EXEMPLO = `tipo,codigo,sistema_origem,id_externo,mercado,cliente,estado_registro,revisao,produto,especie,quantidade_vigente,unidade,evento_tipo,quantidade,data_evento,fonte,registro_origem
contrato,FX-201,erp,ext-201,nacional,Cliente Exemplo,vigente,1,Pinus serrado,Pinus elliottii,1000,m3,,,,,
evento,FX-201,erp,ext-201,nacional,Cliente Exemplo,vigente,1,Pinus serrado,Pinus elliottii,,m3,expedicao,400,2026-09-10,erp,EXP-201`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">Cargas</h1>
        <p className="text-sm text-[#617169] mt-1">
          Carga-piloto auditável e idempotente — pré-validar, publicar e acompanhar (SPEC-F1-02).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1 · Colar CSV (template v1)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={6}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            placeholder={EXEMPLO}
            className="font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button onClick={() => void prevalidar()} disabled={ocupado || !csv.trim()}>
              Pré-validar
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setCsv(EXEMPLO)
                setPrevia(null)
                setResultado(null)
              }}
            >
              Usar exemplo
            </Button>
          </div>
        </CardContent>
      </Card>

      {previa && !previa.ok && (
        <Card className="border-red-300">
          <CardHeader>
            <CardTitle className="text-red-700">Falha estrutural — lote rejeitado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{previa.erro_estrutural}</p>
          </CardContent>
        </Card>
      )}

      {previa?.ok && (
        <Card>
          <CardHeader>
            <CardTitle>2 · Prévia (nada publicado ainda)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">{previa.total_linhas} linhas</Badge>
              <Badge className="bg-green-100 text-green-800">{previa.validas} válidas</Badge>
              {previa.incompletas! > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  {previa.incompletas} incompletas
                </Badge>
              )}
              {previa.rejeitadas! > 0 && (
                <Badge className="bg-red-100 text-red-800">{previa.rejeitadas} rejeitadas</Badge>
              )}
              {previa.duplicadas_no_lote! > 0 && (
                <Badge className="bg-amber-100 text-amber-800">
                  {previa.duplicadas_no_lote} duplicadas no lote
                </Badge>
              )}
            </div>
            {previa.erros && previa.erros.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Erros acionáveis:</p>
                <ul className="list-disc pl-5 space-y-0.5 text-red-700">
                  {previa.erros.slice(0, 10).map((e2, i) => (
                    <li key={i}>
                      linha {e2.linha} · {e2.coluna ?? '—'} · {e2.codigo}: {e2.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {previa.previa && previa.previa.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Conteúdo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previa.previa.map((l) => (
                    <TableRow key={l.linha}>
                      <TableCell>{l.linha}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#617169]">
                        {l.tipo === 'contrato'
                          ? `${l.dados.codigo} · ${l.dados.cliente} · ${l.dados.quantidade_vigente || '—'} ${l.dados.unidade || ''}`
                          : `${l.dados.codigo} · ${l.dados.evento_tipo} · ${l.dados.quantidade} ${l.dados.unidade || ''} · ${l.dados.data_evento}`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Button onClick={() => void publicar()} disabled={ocupado}>
              2b · Publicar carga
            </Button>
          </CardContent>
        </Card>
      )}

      {resultado && (
        <Card className={resultado.ok ? 'border-green-300' : 'border-red-300'}>
          <CardHeader>
            <CardTitle>3 · Relatório da publicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {resultado.erro && <p className="text-red-700">{resultado.erro}</p>}
            {resultado.ok && resultado.repetida && (
              <p className="text-amber-700">
                Carga idêntica já publicada — nada reaplicado (idempotência).
              </p>
            )}
            {resultado.ok && resultado.relatorio && (
              <>
                <p>
                  Estado: <Badge>{resultado.relatorio.estado}</Badge>
                </p>
                <p>
                  {resultado.relatorio.contratos_criados} contratos criados ·{' '}
                  {resultado.relatorio.eventos_criados} eventos criados ·{' '}
                  {resultado.relatorio.eventos_duplicados} duplicados ignorados ·{' '}
                  {resultado.relatorio.incompletas} incompletas
                </p>
                {resultado.relatorio.erros.length > 0 && (
                  <ul className="list-disc pl-5 text-red-700">
                    {resultado.relatorio.erros.slice(0, 10).map((e2, i) => (
                      <li key={i}>
                        linha {e2.linha} · {e2.codigo}: {e2.mensagem}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {historico.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de cargas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Linhas</TableHead>
                  <TableHead>Contratos</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Dup.</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.arquivo_nome}</TableCell>
                    <TableCell>
                      <Badge variant={c.estado.startsWith('publicada') ? 'default' : 'secondary'}>
                        {c.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{c.total_linhas}</TableCell>
                    <TableCell>{c.contratos_criados}</TableCell>
                    <TableCell>{c.eventos_criados}</TableCell>
                    <TableCell>{c.eventos_duplicados}</TableCell>
                    <TableCell>
                      {(c.estado === 'publicada' || c.estado === 'publicada_com_excecoes') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void reverter(c.id)}
                          disabled={ocupado}
                        >
                          Reverter
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </div>
  )
}

export default Cargas
