import React from 'react'
import type { ContractStatus } from '@/data/dashboard'

interface StatusBadgeProps {
  status: ContractStatus
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'Em andamento':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#34785A]/10 text-[#34785A] border border-[#34785A]/15">
          <span className="w-1.5 h-1.5 rounded-full bg-[#34785A]" />
          Em andamento
        </span>
      )
    case 'Atenção':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#D97706]/10 text-[#D97706] border border-[#D97706]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
          Atenção
        </span>
      )
    case 'Concluído':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#617169]/10 text-[#617169] border border-[#617169]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#617169]" />
          Concluído
        </span>
      )
    case 'Em risco':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#B3261E]/10 text-[#B3261E] border border-[#B3261E]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#B3261E]" />
          Em risco
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      )
  }
}
export default StatusBadge
