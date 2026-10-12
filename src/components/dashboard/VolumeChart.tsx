import React, { useState, useId } from 'react'
import type { VolumeMonthlyPoint } from '@/data/dashboard'

interface VolumeChartProps {
  data: VolumeMonthlyPoint[]
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const gradContratadoId = useId()
  const gradProduzidoId = useId()
  const gradEntregueId = useId()

  // Dimensions of SVG viewBox
  const width = 840
  const height = 300
  const padding = { top: 24, right: 30, bottom: 42, left: 65 }

  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom

  // Y scale bounds
  // Volumes range roughly from 23,000 to 40,000 m³
  const minY = 20000
  const maxY = 40000
  const yTicks = [20000, 25000, 30000, 35000, 40000]

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left
    return padding.left + (index / (data.length - 1)) * innerWidth
  }

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val))
    const ratio = (clamped - minY) / (maxY - minY)
    return padding.top + innerHeight - ratio * innerHeight
  }

  // Smooth Bezier path generator (catmull-rom to cubic bezier)
  const createSmoothPath = (points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return ''
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

    let d = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i > 0 ? points[i - 1] : points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = i != points.length - 2 ? points[i + 2] : p2

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const pointsContratado = data.map((d, i) => ({ x: getX(i), y: getY(d.contratado) }))
  const pointsProduzido = data.map((d, i) => ({ x: getX(i), y: getY(d.produzido) }))
  const pointsEntregue = data.map((d, i) => ({ x: getX(i), y: getY(d.entregue) }))

  const pathContratado = createSmoothPath(pointsContratado)
  const pathProduzido = createSmoothPath(pointsProduzido)
  const pathEntregue = createSmoothPath(pointsEntregue)

  // Area under path (close along bottom)
  const createAreaPath = (linePath: string, points: Array<{ x: number; y: number }>) => {
    if (points.length === 0) return ''
    const firstX = points[0].x
    const lastX = points[points.length - 1].x
    const bottomY = padding.top + innerHeight
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
  }

  const areaContratado = createAreaPath(pathContratado, pointsContratado)
  const areaProduzido = createAreaPath(pathProduzido, pointsProduzido)
  const areaEntregue = createAreaPath(pathEntregue, pointsEntregue)

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null
  const activeX = hoveredIndex !== null ? getX(hoveredIndex) : null

  // Format numbers in pt-BR
  const formatM3 = (val: number) => {
    return new Intl.NumberFormat('pt-BR').format(val) + ' m³'
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E9E4] p-5 sm:p-6 transition-all duration-150">
      {/* Chart Header + Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E9E4]">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-[#1A2E28] tracking-tight">
            Volumes: Contratado × Produzido × Entregue
          </h2>
          <p className="text-xs sm:text-sm text-[#617169] mt-0.5">
            Acompanhamento comparativo mensal de volumes florestais nos últimos 12 meses
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#1A2E28]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#34785A] ring-2 ring-[#34785A]/20" />
            <span>Contratado</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#D97706] ring-2 ring-[#D97706]/20" />
            <span>Produzido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#3B5BA5] ring-2 ring-[#3B5BA5]/20" />
            <span>Entregue</span>
          </div>
        </div>
      </div>

      {/* Interactive Chart Container (scrollable on mobile) */}
      <div className="relative mt-4 overflow-x-auto pb-2">
        <div className="min-w-[620px] relative select-none">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={gradContratadoId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34785A" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#34785A" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id={gradProduzidoId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D97706" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#D97706" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id={gradEntregueId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B5BA5" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#3B5BA5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y Axis labels */}
            {yTicks.map((tick) => {
              const y = getY(tick)
              return (
                <g key={tick} className="text-[#617169]">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#E5E9E4"
                    strokeDasharray="3 3"
                    strokeWidth={1}
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[11px] fill-[#617169] font-mono tabular-nums"
                  >
                    {(tick / 1000).toFixed(0)}k m³
                  </text>
                </g>
              )
            })}

            {/* Area fills */}
            <path d={areaContratado} fill={`url(#${gradContratadoId})`} />
            <path d={areaProduzido} fill={`url(#${gradProduzidoId})`} />
            <path d={areaEntregue} fill={`url(#${gradEntregueId})`} />

            {/* Line series */}
            {/* 1. Contratado: institutional green #34785A */}
            <path
              d={pathContratado}
              fill="none"
              stroke="#34785A"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 2. Produzido: amber #D97706 */}
            <path
              d={pathProduzido}
              fill="none"
              stroke="#D97706"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* 3. Entregue: steel blue #3B5BA5 */}
            <path
              d={pathEntregue}
              fill="none"
              stroke="#3B5BA5"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vertical Guide Line on Hover */}
            {activeX !== null && (
              <line
                x1={activeX}
                y1={padding.top}
                x2={activeX}
                y2={padding.top + innerHeight}
                stroke="#1A2E28"
                strokeWidth={1}
                strokeDasharray="2 2"
                opacity={0.35}
              />
            )}

            {/* Dots for active points */}
            {hoveredIndex !== null && (
              <g>
                {/* Contratado dot */}
                <circle
                  cx={pointsContratado[hoveredIndex].x}
                  cy={pointsContratado[hoveredIndex].y}
                  r={5}
                  fill="#34785A"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
                {/* Produzido dot */}
                <circle
                  cx={pointsProduzido[hoveredIndex].x}
                  cy={pointsProduzido[hoveredIndex].y}
                  r={5}
                  fill="#D97706"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
                {/* Entregue dot */}
                <circle
                  cx={pointsEntregue[hoveredIndex].x}
                  cy={pointsEntregue[hoveredIndex].y}
                  r={5}
                  fill="#3B5BA5"
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                />
              </g>
            )}

            {/* X-axis tick labels (months) */}
            {data.map((d, i) => {
              const x = getX(i)
              const isHovered = hoveredIndex === i
              return (
                <text
                  key={d.monthShort}
                  x={x}
                  y={height - 14}
                  textAnchor="middle"
                  className={`text-xs transition-colors duration-150 ${
                    isHovered ? 'fill-[#1A2E28] font-semibold' : 'fill-[#617169] font-normal'
                  }`}
                >
                  {d.monthShort}
                </text>
              )
            })}

            {/* Invisible hover trigger columns for silky interaction */}
            {data.map((_, i) => {
              const prevX = i === 0 ? padding.left : (getX(i - 1) + getX(i)) / 2
              const nextX =
                i === data.length - 1 ? width - padding.right : (getX(i) + getX(i + 1)) / 2
              const colWidth = nextX - prevX

              return (
                <rect
                  key={i}
                  x={prevX}
                  y={padding.top}
                  width={colWidth}
                  height={innerHeight}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onTouchStart={() => setHoveredIndex(i)}
                />
              )
            })}
          </svg>

          {/* Floating Tooltip with fade-in 150ms */}
          {activePoint && hoveredIndex !== null && (
            <div
              className="absolute pointer-events-none transition-all duration-150 ease-out z-20"
              style={{
                left: `${(getX(hoveredIndex) / width) * 100}%`,
                top: '12%',
                transform:
                  hoveredIndex > 8
                    ? 'translate(-105%, 0)'
                    : hoveredIndex < 3
                      ? 'translate(5%, 0)'
                      : 'translate(-50%, 0)',
              }}
            >
              <div className="bg-[#111C18] text-white p-3 rounded-lg shadow-xl border border-white/10 text-xs min-w-[170px] backdrop-blur-md">
                <div className="font-semibold text-white/90 border-b border-white/10 pb-1.5 mb-2 flex items-center justify-between">
                  <span>{activePoint.month}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
                    Mensal
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono tabular-nums">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-white/80 font-sans">
                      <span className="w-2 h-2 rounded-full bg-[#34785A]" />
                      Contratado
                    </span>
                    <span className="font-semibold text-white">
                      {formatM3(activePoint.contratado)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-white/80 font-sans">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      Produzido
                    </span>
                    <span className="font-semibold text-[#D97706]">
                      {formatM3(activePoint.produzido)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-white/80 font-sans">
                      <span className="w-2 h-2 rounded-full bg-[#3B5BA5]" />
                      Entregue
                    </span>
                    <span className="font-semibold text-[#6E95E8]">
                      {formatM3(activePoint.entregue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default VolumeChart
