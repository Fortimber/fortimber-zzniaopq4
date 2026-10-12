import React from 'react'

export type PeriodValue = '7d' | '30d' | '90d'

interface PeriodFilterProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
}

const OPTIONS: Array<{ value: PeriodValue; label: string }> = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
]

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ value, onChange }) => {
  return (
    <div
      role="group"
      aria-label="Filtro de período"
      className="inline-flex items-center p-1 bg-white border border-[#E5E9E4] rounded-xl shadow-2xs select-none"
    >
      {OPTIONS.map((option) => {
        const isSelected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#34785A]/30 ${
              isSelected
                ? 'bg-[#111C18] text-white shadow-xs'
                : 'text-[#617169] hover:text-[#1A2E28] hover:bg-[#F6F7F4]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
export default PeriodFilter
