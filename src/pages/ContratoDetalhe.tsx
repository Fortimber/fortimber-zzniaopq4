import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obterContrato, type ContratoDetalhe } from '@/services/contratos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Loader2 } from 'lucide-react'

// F1-T05 — detalhe do contrato (SPEC-F1-03 §4): quantidades lado a lado,
// timeline de eventos, proveniência e qualidade do dado visível.

const ROTULO_SALDO: Record<string, string> = {
  calculado: 'Calculado',
  nao_calculavel: 'Não calculável',
  em_divergencia: 'Em divergência',
  sem_eventos: 'Sem entregas',
  cancelado: 'Cancelado',
}

const ROTULO_EVENTO: Record<string, string> = {
  expedicao: 'Expedição',
  entrega_confirmada: 'Entrega confirmada',
  producao: 'Produção',
  devolucao: 'Devolução',
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

function fmtDataHora(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR')
}

const QtdBox: React.FC<{
  rotulo: string
  valor: number | null
  unidade: string | null
  nota?: string
  alerta?: boolean
}> = ({ rotulo, valor, unidade, nota, alerta }) => (
  <Card className={alerta ? 'border-amber-300' : ''}>
    <CardContent className="pt-4">
      <p className="text-xs text-[#617169]">{rotulo}</p>
      <p className="text-xl font-bold text-[#1A2E28]">
        {valor !== null ? (
          `${fmtNum(valor)} ${unidade ?? ''}`
        ) : (
          <span className="text-base font-normal text-[#617169]">não disponível</span>
        )}
      </p>
      {nota && <p className="text-xs text-[#617169] mt-1">{nota}</p>}
    </CardContent>
  </Card>
)

export const ContratoDetalhePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [c, setC] = useState<ContratoDetalhe | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = async () => {
    if (!id) return
    setCarregando(true)
    setErro('')
    try {
      const d = await obterContrato(id)
      if (!d) {
        setErro('Contrato não encontrado ou sem permissão de acesso.')
        setC(null)
      } else setC(d)
    } catch {
      setErro('Falha na consulta. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    void carregar() /* eslint-disable-line react-hooks/exhaustive-deps */
  }, [id])

  if (carregando) {
    return (
      <div className="flex items-center gap-2 text-[#617169] py-10">
        <Loader2 className="h-4 w-4 animate-spin" /> Consultando…
      </div>
    )
  }
  if (erro || !c) {
    return (
      <div className="space-y-4">
        <Card className="border-red-300">
          <CardContent className="pt-4 text-sm text-red-700">
            {erro ?? 'Registro não disponível.'}
          </CardContent>
        </Card>
        <Button variant="outline" onClick={() => void carregar()}>
          Tentar novamente
        </Button>
        <div>
          <Link to="/contratos" className="text-sm text-[#34785A] hover:underline">
            ← Voltar à lista
          </Link>
        </div>
      </div>
    )
  }

  const desatualizado =
    c.atualizado_em && Date.now() - new Date(c.atualizado_em).getTime() > 7 * 24 * 3600 * 1000

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Link to="/contratos" className="text-sm text-[#34785A] hover:underline">
            ← Contratos
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight mt-1">
            {c.codigo}
          </h1>
          <p className="text-sm text-[#617169]">
            {c.cliente} · <Badge variant="outline">{c.mercado}</Badge>
          </p>
        </div>
        <div className="text-right text-xs text-[#617169]">
          <p>Consulta: {fmtDataHora(new Date().toISOString())}</p>
          <p>Dado de origem: {fmtDataHora(c.atualizado_em)}</p>
          {desatualizado && (
            <Badge className="bg-amber-100 text-amber-800 mt-1">
              fonte desatualizada (&gt; 7 dias)
            </Badge>
          )}
        </div>
      </div>

      {/* Status + origem */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <p className="text-xs text-[#617169]">Situação</p>
            <Badge variant={c.estado_registro === 'vigente' ? 'default' : 'secondary'}>
              {c.estado_registro}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-[#617169]">Origem</p>
            {c.sistema_origem || '—'}
          </div>
          <div>
            <p className="text-xs text-[#617169]">Nº contrato</p>
            {c.numero_contrato || '—'}
          </div>
          <div>
            <p className="text-xs text-[#617169]">Prazo</p>
            {fmtData(c.prazo_fim)}
          </div>
        </CardContent>
      </Card>

      {/* Quantidades lado a lado — produzido ≠ entregue (SPEC §6.4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <QtdBox
          rotulo="Contratado (vigente)"
          valor={c.quantidade_vigente}
          unidade={c.unidade}
          nota={
            c.quantidade_vigente === null ? 'não informado — não convertido em zero' : undefined
          }
          alerta={c.quantidade_vigente === null}
        />
        <QtdBox
          rotulo="Entregue (reconhecido)"
          valor={c.entregue}
          unidade={c.entregue !== null ? c.unidade : null}
        />
        <QtdBox
          rotulo="Produzido (separado)"
          valor={c.produzido}
          unidade={c.produzido !== null ? c.unidade : null}
        />
        <QtdBox
          rotulo="Saldo"
          valor={c.saldo_estado === 'calculado' ? c.saldo_valor : null}
          unidade={c.saldo_estado === 'calculado' ? c.unidade : null}
          nota={
            c.saldo_estado !== 'calculado'
              ? ROTULO_SALDO[c.saldo_estado] + (c.saldo_motivo ? ' — ' + c.saldo_motivo : '')
              : c.saldo_valor !== null && c.saldo_valor < 0
                ? 'entrega excedente (exceção visível)'
                : undefined
          }
          alerta={c.saldo_estado !== 'calculado' || (c.saldo_valor !== null && c.saldo_valor < 0)}
        />
      </div>

      {/* Produto */}
      <Card>
        <CardHeader>
          <CardTitle>Produto</CardTitle>
        </CardHeader>
        <CardContent className="text-sm grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-[#617169]">Produto</p>
            {c.produto || 'não informado'}
          </div>
          <div>
            <p className="text-xs text-[#617169]">Espécie</p>
            {c.especie || 'não informado'}
          </div>
        </CardContent>
      </Card>

      {/* Timeline de eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos ({c.eventos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {c.eventos.length === 0 && (
            <p className="text-sm text-[#617169]">Nenhum evento registrado para este contrato.</p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data do negócio</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Registro de origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {c.eventos.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    {ev.data_evento ? (
                      fmtData(ev.data_evento)
                    ) : (
                      <Badge variant="outline">
                        sem data de negócio — carregado {fmtData(ev.carregado_em)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        ev.evento_tipo === 'producao'
                          ? 'secondary'
                          : ev.evento_tipo === 'devolucao'
                            ? 'destructive'
                            : 'default'
                      }
                    >
                      {ROTULO_EVENTO[ev.evento_tipo] ?? ev.evento_tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {ev.quantidade !== null ? (
                      `${fmtNum(ev.quantidade)} ${ev.unidade ?? ''}`
                    ) : (
                      <Badge variant="outline">não informado</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{ev.fonte}</TableCell>
                  <TableCell className="text-xs">{ev.registro_origem}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Proveniência (champion) */}
      {c.carregamento && (
        <Card>
          <CardHeader>
            <CardTitle>Proveniência da carga</CardTitle>
          </CardHeader>
          <CardContent className="text-sm grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-[#617169]">Fonte</p>
              {c.carregamento.fonte}
            </div>
            <div>
              <p className="text-xs text-[#617169]">Arquivo/lote</p>
              {c.carregamento.arquivo_lote || '—'}
            </div>
            <div>
              <p className="text-xs text-[#617169]">Carregado em</p>
              {fmtDataHora(c.carregamento.carregado_em)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ContratoDetalhePage
