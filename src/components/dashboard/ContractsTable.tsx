import React from 'react'
import { ArrowRight, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ContractRow } from '@/data/dashboard'
import { StatusBadge } from './StatusBadge'

interface ContractsTableProps {
  contracts: ContractRow[]
}

export const ContractsTable: React.FC<ContractsTableProps> = ({ contracts }) => {
  const formatM3 = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val) + ' m³'
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E9E4] overflow-hidden transition-all duration-150">
      {/* Header of Table Card */}
      <div className="p-5 sm:p-6 border-b border-[#E5E9E4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#1A2E28] tracking-tight">
            Contratos em Acompanhamento
          </h2>
          <p className="text-xs sm:text-sm text-[#617169] mt-0.5">
            Monitoramento de vigência, volumes alocados e status de conformidade operacional
          </p>
        </div>

        {/* Card actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            className="p-2 rounded-lg text-[#617169] hover:text-[#1A2E28] hover:bg-[#F6F7F4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#34785A]/30"
            aria-label="Filtrar contratos"
            title="Buscar contrato"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#617169] hover:text-[#1A2E28] hover:bg-[#F6F7F4] transition-colors focus:outline-none focus:ring-2 focus:ring-[#34785A]/30"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Table Container (horizontally scrollable on mobile) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[620px]">
          <thead>
            <tr className="border-b border-[#E5E9E4] bg-[#F6F7F4]/60 text-[11px] font-semibold text-[#617169] uppercase tracking-wider select-none">
              <th scope="col" className="py-3 px-6">
                Cliente
              </th>
              <th scope="col" className="py-3 px-6 text-right">
                Volume (m³)
              </th>
              <th scope="col" className="py-3 px-6 text-center">
                Prazo
              </th>
              <th scope="col" className="py-3 px-6 text-left">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E9E4]">
            {contracts.map((contract) => (
              <tr
                key={contract.id}
                className="hover:bg-[#F6F7F4] transition-colors duration-150 cursor-default group"
              >
                <td className="py-4 px-6 font-medium text-[#1A2E28]">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#34785A]/40 group-hover:bg-[#34785A] transition-colors" />
                    <span>{contract.cliente}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-medium text-[#1A2E28] tabular-nums">
                  {formatM3(contract.volume)}
                </td>
                <td className="py-4 px-6 text-center text-[#617169] tabular-nums text-xs font-mono">
                  {contract.prazo}
                </td>
                <td className="py-4 px-6 text-left">
                  <StatusBadge status={contract.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination Bar */}
      <div className="p-4 sm:px-6 border-t border-[#E5E9E4] bg-[#F6F7F4]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#617169]">
        <span>Mostrando 1–5 de 24 contratos</span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled
            className="p-1.5 rounded-md text-[#617169]/40 cursor-not-allowed border border-[#E5E9E4] bg-white"
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-3 py-1 font-medium text-[#1A2E28] bg-white rounded-md border border-[#E5E9E4]">
            1
          </span>
          <button
            type="button"
            className="p-1.5 rounded-md text-[#617169] hover:text-[#1A2E28] hover:bg-white border border-[#E5E9E4] transition-colors"
            aria-label="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
export default ContractsTable
