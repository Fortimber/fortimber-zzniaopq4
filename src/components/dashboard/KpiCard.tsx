import React from 'react'
import { FileText, ClipboardList, Factory, Truck, TrendingUp, TrendingDown } from 'lucide-react'
import type { KpiData } from '@/data/dashboard'

interface KpiCardProps {
  kpi: KpiData
}

const iconComponentMap = {
  FileText,
  ClipboardList,
  Factory,
  Truck,
}

export const KpiCard: React.FC<KpiCardProps> = ({ kpi }) => {
  const Icon = iconComponentMap[kpi.icon]
  const isPositive = kpi.deltaType === 'positive'

  return (
    <div className="bg-white rounded-xl border border-[#E5E9E4] p-5 sm:p-6 transition-all duration-150 hover:shadow-xs hover:border-[#d4ded2] flex flex-col justify-between">
      {/* Top row: Icon and Trend Badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-lg bg-[#34785A]/10 border border-[#34785A]/15 flex items-center justify-center text-[#34785A]">
          <Icon className="w-5 h-5 text-[#34785A]" strokeWidth={2.2} />
        </div>

        <div
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
            isPositive ? 'bg-[#34785A]/10 text-[#34785A]' : 'bg-[#D97706]/10 text-[#D97706]'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
          )}
          <span>{kpi.delta}</span>
        </div>
      </div>

      {/* Bottom area: Label and Value */}
      <div className="space-y-1">
        <span className="text-sm font-medium text-[#617169] block">{kpi.label}</span>
        <div className="text-3xl font-bold text-[#1A2E28] tracking-tight tabular-nums">
          {kpi.value}
        </div>
      </div>
    </div>
  )
}
export default KpiCard
