import React, { useState } from 'react'
import { DASHBOARD_KPIS, MONTHLY_VOLUME_DATA, CONTRACTS_DATA } from '@/data/dashboard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { VolumeChart } from '@/components/dashboard/VolumeChart'
import { ContractsTable } from '@/components/dashboard/ContractsTable'
import { PeriodFilter, type PeriodValue } from '@/components/dashboard/PeriodFilter'

export const Index: React.FC = () => {
  const [period, setPeriod] = useState<PeriodValue>('30d')

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Page Header with Title and Period Filter */}
      <section
        aria-label="Cabeçalho da Visão Geral"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A2E28] tracking-tight">
            Visão Geral
          </h1>
          <p className="text-sm text-[#617169] mt-1">
            Acompanhe contratos, produção, estoque e entregas em um só lugar.
          </p>
        </div>

        {/* Period Filter (visual only segmented control) */}
        <div className="self-start sm:self-auto">
          <PeriodFilter value={period} onChange={setPeriod} />
        </div>
      </section>

      {/* KPIs Grid (1 col mobile, 2 sm-lg, 4 xl) */}
      <section aria-label="Indicadores Chave de Desempenho (KPIs)">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {DASHBOARD_KPIS.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* Main Comparative Volumes Chart */}
      <section aria-label="Evolução Mensal de Volumes">
        <VolumeChart data={MONTHLY_VOLUME_DATA} />
      </section>

      {/* Contracts Table */}
      <section aria-label="Contratos em Acompanhamento">
        <ContractsTable contracts={CONTRACTS_DATA} />
      </section>
    </div>
  )
}

export default Index
