import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { listarContratos, resumoContratos, type ContratoLista } from '@/services/contratos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Search } from 'lucide-react'

// F1-T05 — lista de contratos (SPEC-F1-03 §3): resumo, busca, filtros, qualidade visível.

const ROTULO_SALDO: Record<string, string> = {
  calculado: 'Calculado',
  nao_calculavel: 'Não calculável',
  em_divergencia: 'Em divergência',
  sem_eventos: 'Sem entregas',
  cancelado: 'Cancelado',
}

function fmtNum(v: number | null): string {
  if (v === null || v === undefined) return '—'
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function fmtData(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR')
}

const SaldoBadge: React.FC<{ estado: string; valor: number | null; unidade: string | null }> = ({
  estado,
  valor,
  unidade,
}) => {
  if (estado === 'calculado' && valor !== null) {
    return (
      <span className={valor < 0 ? 'text-red-700 font-medium' : 'font-medium'}>
        {fmtNum(valor)} {unidade ?? ''}{' '}
        {valor < 0 && <Badge variant="destructive">excedente</Badge>}
      </span>
    )
  }
  return <Badge variant="outline">{ROTULO_SALDO[estado] ?? estado}</Badge>
}

export const Contratos: React.FC = () => {
  const [logado, setLogado] = useState(pb.authStore.isValid)
  const [email, setEmail] = useState('uat@fortimber.local')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [items, setItems] = useState<ContratoLista[]>([])
  const [resumo, setResumo] = useState<Awaited<ReturnType<typeof resumoContratos>> | null>(null)
  const [busca, setBusca] = useState('')
  const [mercado, setMercado] = useState('')
  const [incluirInativos, setIncluirInativos] = useState(false)
  const [semResultadosComFiltros, setSemResultadosComFiltros] = useState(false)

  const carregar = async () => {
    setCarregando(true)
    setErro('')
    try {
      const [lista, res] = await Promise.all([
        listarContratos({
          busca: busca || undefined,
          mercado: mercado || undefined,
          incluirInativos,
        }),
        resumoContratos(),
      ])
      setItems(lista.items)
      setResumo(res)
      setSemResultadosComFiltros(!!(busca || mercado) && lista.items.length === 0)
    } catch (e) {
      setErro('Falha na consulta. Tente novamente. (' + (e as Error).message.slice(0, 80) + ')')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    if (logado) void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logado, mercado, incluirInativos])

  if (!logado) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">Contratos</h1>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso do leitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
            <Input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="senha"
              onKeyDown={(e) => {
                if (e.key === 'Enter') setLogado(true)
              }}
            />
            <Button
              onClick={() =>
                void pb
                  .collection('users')
                  .authWithPassword(email, senha)
                  .then(() => setLogado(true))
                  .catch((e) => setErro('Login inválido'))
              }
              disabled={!senha}
            >
              Entrar
            </Button>
            {erro && <p className="text-sm text-red-600">{erro}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  const temFiltros = !!busca || !!mercado || incluirInativos

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">Contratos</h1>
        <p className="text-sm text-[#617169] mt-1">
          Consulta de contratos ativos, saldos e qualidade do dado (SPEC-F1-03).
        </p>
      </div>

      {/* Resumo — só soma unidades compatíveis */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-[#617169]">Contratos ativos</p>
              <p className="text-2xl font-bold text-[#1A2E28]">{resumo.ativos}</p>
            </CardContent>
          </Card>
          {resumo.porUnidade.map((u) => (
            <Card key={u.unidade}>
              <CardContent className="pt-4">
                <p className="text-xs text-[#617169]">
                  Contratado / Entregue / Saldo ({u.unidade})
                </p>
                <p className="text-sm font-semibold text-[#1A2E28]">
                  {fmtNum(u.contratado)} / {fmtNum(u.entregue)} / {fmtNum(u.saldo)}
                </p>
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-[#617169]">Qualidade do dado</p>
              <p className="text-sm">
                {resumo.incompletos > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 mr-1">
                    {resumo.incompletos} incompletos
                  </Badge>
                )}
                {resumo.divergentes > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    {resumo.divergentes} em divergência
                  </Badge>
                )}
                {resumo.incompletos === 0 && resumo.divergentes === 0 && (
                  <span className="text-[#617169]">sem exceções</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Busca + filtros */}
      <Card>
        <CardContent className="pt-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#617169]" />
            <Input
              className="pl-8"
              placeholder="Buscar por contrato ou cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void carregar()
              }}
            />
          </div>
          <Select
            value={mercado || 'todos'}
            onValueChange={(v) => setMercado(v === 'todos' ? '' : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mercado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os mercados</SelectItem>
              <SelectItem value="nacional">Nacional</SelectItem>
              <SelectItem value="internacional">Internacional</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-[#617169]">
            <input
              type="checkbox"
              checked={incluirInativos}
              onChange={(e) => setIncluirInativos(e.target.checked)}
            />
            incluir encerrados/cancelados
          </label>
          <Button onClick={() => void carregar()} disabled={carregando}>
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
          </Button>
          {temFiltros && (
            <Button
              variant="ghost"
              onClick={() => {
                setBusca('')
                setMercado('')
                setIncluirInativos(false)
              }}
            >
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Estados de interface */}
      {erro && (
        <Card className="border-red-300">
          <CardContent className="pt-4 text-sm text-red-700">{erro}</CardContent>
        </Card>
      )}
      {!carregando && !erro && items.length === 0 && (
        <Card>
          <CardContent className="pt-4 text-sm text-[#617169]">
            {semResultadosComFiltros
              ? 'Sem resultados com estes filtros. Ajuste ou limpe os filtros.'
              : 'Nenhum contrato no conjunto carregado. Faça uma carga em Cargas ou contate o champion.'}
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Mercado</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Contratado</TableHead>
                <TableHead>Entregue</TableHead>
                <TableHead>Produzido</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      to={`/contratos/${c.id}`}
                      className="font-medium text-[#34785A] hover:underline"
                    >
                      {c.codigo}
                    </Link>
                    <p className="text-xs text-[#617169]">{c.sistema_origem}</p>
                  </TableCell>
                  <TableCell>{c.cliente}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.mercado}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.produto || <span className="text-[#617169]">não informado</span>}
                    {c.especie && <p className="text-xs text-[#617169]">{c.especie}</p>}
                  </TableCell>
                  <TableCell>
                    {c.quantidade_vigente !== null ? (
                      `${fmtNum(c.quantidade_vigente)} ${c.unidade ?? ''}`
                    ) : (
                      <Badge variant="outline">não informado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.entregue !== null ? (
                      fmtNum(c.entregue)
                    ) : (
                      <Badge variant="outline">não disponível</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.produzido !== null ? (
                      fmtNum(c.produzido)
                    ) : (
                      <Badge variant="outline">não disponível</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <SaldoBadge estado={c.saldo_estado} valor={c.saldo_valor} unidade={c.unidade} />
                  </TableCell>
                  <TableCell>{fmtData(c.prazo_fim)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.estado_registro === 'vigente'
                          ? 'default'
                          : c.estado_registro === 'cancelado'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {c.estado_registro}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default Contratos
