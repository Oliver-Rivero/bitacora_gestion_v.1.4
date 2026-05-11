import React, { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Activity, Wallet } from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { formatCurrency, formatNumber } from '../utils/formatters'
import { clsx } from 'clsx'

const COLORS = ['#7E91B1', '#9CAF9C', '#D18B8B', '#A29BBD', '#A09D9A', '#BFA89A', '#D9CD96', '#9BADC4', '#84a59d', '#f28482']

const CustomTooltip = ({ active, payload, label, viewMode }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '12px', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--glass-shadow)', fontSize: 13 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
          {viewMode === 'month' ? `Día ${label}` : label}
        </div>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
            <span style={{ color: 'var(--text-muted)' }}>{entry.name}:</span>
            <span style={{ color: entry.color, fontWeight: 700 }}>{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function AnalyticsView() {
  const { transactions, categories, loading } = useData()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [viewMode, setViewMode] = useState('month') // 'month', 'ytd', 'year'

  const [hoveredExpenseCat, setHoveredExpenseCat] = useState(null)
  const [hoveredIncomeCat, setHoveredIncomeCat] = useState(null)

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear
    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    } else if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }
    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  const changeYear = (delta) => {
    setSelectedYear(selectedYear + delta)
  }

  const analysisData = useMemo(() => {
    let totalIncome = 0
    let totalExpenses = 0
    let totalSavings = 0

    const isAnnual = viewMode === 'ytd' || viewMode === 'year'
    const dataPointsCount = isAnnual ? 12 : new Date(selectedYear, selectedMonth + 1, 0).getDate()
    
    const timeData = Array.from({ length: dataPointsCount }, (_, i) => ({
      label: isAnnual ? MONTHS[i] : i + 1,
      ingresos: 0,
      gastos: 0
    }))

    const expenseCategories = {}
    const incomeCategories = {}

    transactions.forEach(t => {
      if (t.categoryName === 'Ajuste' || t.subcategoryName?.includes('Ajuste')) return

      const [y, m, d] = t.date.split('-').map(Number)
      const tDate = new Date(y, m - 1, d)
      
      // Filter by period
      if (viewMode === 'month') {
        if (tDate.getMonth() !== selectedMonth || tDate.getFullYear() !== selectedYear) return
      } else if (viewMode === 'ytd') {
        const now = new Date()
        const isCurrentYear = tDate.getFullYear() === now.getFullYear()
        const isPastOrPresentMonth = tDate.getMonth() <= now.getMonth()
        if (!isCurrentYear || !isPastOrPresentMonth) return
        // Also ensure we don't include future days in the current month
        if (tDate.getMonth() === now.getMonth() && tDate.getDate() > now.getDate()) return
      } else if (viewMode === 'year') {
        if (tDate.getFullYear() !== selectedYear) return
      }

      const index = isAnnual ? tDate.getMonth() : tDate.getDate() - 1
      const catName = t.type === 'ahorro' ? 'Ahorro' : t.type === 'inversion' ? 'Inversión' : (t.categoryName || 'Otros')
      const subName = t.type === 'ahorro' ? 'General' : t.type === 'inversion' ? 'General' : (t.subcategoryName || 'Otros')

      if (t.type === 'ingreso') {
        totalIncome += t.amount
        timeData[index].ingresos += t.amount

        if (!incomeCategories[catName]) {
          incomeCategories[catName] = { name: catName, value: 0, subcategories: {} }
        }
        incomeCategories[catName].value += t.amount
        if (!incomeCategories[catName].subcategories[subName]) {
          incomeCategories[catName].subcategories[subName] = { name: subName, value: 0 }
        }
        incomeCategories[catName].subcategories[subName].value += t.amount
      } else if (t.type === 'gasto' || t.type === 'ahorro' || t.type === 'inversion') {
        totalExpenses += t.amount
        timeData[index].gastos += t.amount

        if (t.type === 'ahorro' || subName === 'Ahorro') totalSavings += t.amount

        if (!expenseCategories[catName]) {
          expenseCategories[catName] = { name: catName, value: 0, subcategories: {} }
        }
        expenseCategories[catName].value += t.amount
        if (!expenseCategories[catName].subcategories[subName]) {
          expenseCategories[catName].subcategories[subName] = { name: subName, value: 0 }
        }
        expenseCategories[catName].subcategories[subName].value += t.amount
      }
    })

    // Calculate accumulative data
    let accIngresos = 0
    let accGastos = 0
    const accumulativeData = timeData.map(d => {
      accIngresos += d.ingresos
      accGastos += d.gastos
      return {
        ...d,
        accIngresos,
        accGastos
      }
    })

    const formatCategoryData = (catObj, total) => {
      return Object.values(catObj)
        .map((cat, i) => ({
          ...cat,
          color: COLORS[i % COLORS.length],
          percentage: total > 0 ? (cat.value / total) * 100 : 0,
          subcategories: Object.values(cat.subcategories).sort((a, b) => b.value - a.value)
        }))
        .sort((a, b) => b.value - a.value)
    }

    const expensesDistribution = formatCategoryData(expenseCategories, totalExpenses)
    const incomeDistribution = formatCategoryData(incomeCategories, totalIncome)

    const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0

    return {
      totalIncome,
      totalExpenses,
      totalSavings,
      savingsRate,
      accumulativeData,
      expensesDistribution,
      incomeDistribution
    }
  }, [transactions, selectedMonth, selectedYear, viewMode])

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando analíticas...</div>

  const renderDistributionBar = (data, total, hoveredCat, setHoveredCat, title, type) => (
    <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3 style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
          <div style={{ fontSize: 22, fontWeight: 800, color: type === 'ingreso' ? 'var(--success)' : 'var(--danger)', letterSpacing: '-0.5px' }}>
            {formatCurrency(total)}
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', height: 28, width: '100%', background: 'var(--border)', 
        borderRadius: 14, overflow: 'hidden', marginBottom: 24, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {data.map((cat, i) => (
          <div
            key={cat.name}
            onMouseEnter={() => setHoveredCat(cat.name)}
            onMouseLeave={() => setHoveredCat(null)}
            style={{
              width: `${cat.percentage}%`,
              background: cat.color,
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              cursor: 'pointer',
              opacity: hoveredCat && hoveredCat !== cat.name ? 0.3 : 1,
              transform: hoveredCat === cat.name ? 'scaleY(1.15)' : 'scaleY(1)',
              borderRight: i < data.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
            }}
          />
        ))}
        {data.length === 0 && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Sin datos</div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
        {data.map(cat => (
          <div 
            key={cat.name}
            onMouseEnter={() => setHoveredCat(cat.name)}
            onMouseLeave={() => setHoveredCat(null)}
            style={{
              padding: '12px', borderRadius: 12,
              background: hoveredCat === cat.name ? 'var(--border)' : 'transparent',
              border: `1px solid ${hoveredCat === cat.name ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.2s ease', cursor: 'default'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: type === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                {formatCurrency(cat.value)}
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 16 }}>
              {formatNumber(cat.percentage)}% del total
            </div>

            {/* Subcategories */}
            {hoveredCat === cat.name && cat.subcategories.length > 0 && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8, animation: 'fadeUp 0.3s ease' }}>
                {cat.subcategories.map(sub => (
                  <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, paddingLeft: 16 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{sub.name}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(sub.value)} ({formatNumber((sub.value / cat.value) * 100)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Header & Mode Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1>Analíticas</h1>
          <div className="segmented-control" style={{ margin: '12px 0 0 0', padding: 2 }}>
            <button className={clsx('segment-item', viewMode === 'month' && 'active')} onClick={() => setViewMode('month')}>Mes</button>
            <button className={clsx('segment-item', viewMode === 'ytd' && 'active')} onClick={() => setViewMode('ytd')}>Año Actual (YTD)</button>
            <button className={clsx('segment-item', viewMode === 'year' && 'active')} onClick={() => setViewMode('year')}>Año Completo</button>
          </div>
        </div>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 16px', borderRadius: 20 }}>
          <button className="btn-icon" onClick={() => viewMode === 'month' ? changeMonth(-1) : changeYear(-1)}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', minWidth: 120, textAlign: 'center' }}>
            {viewMode === 'month' ? `${MONTHS[selectedMonth]} ${selectedYear}` : selectedYear}
          </div>
          <button className="btn-icon" onClick={() => viewMode === 'month' ? changeMonth(1) : changeYear(1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-grid" style={{ marginBottom: 24 }}>
        <div className="metric-card glass-panel v5-hover-effect" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--success)' }}>
            <TrendingUp size={18} /> <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Ingresos</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(analysisData.totalIncome)}</div>
        </div>
        
        <div className="metric-card glass-panel v5-hover-effect" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--danger)' }}>
            <TrendingDown size={18} /> <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Gastos</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(analysisData.totalExpenses)}</div>
        </div>

        <div className="metric-card glass-panel v5-hover-effect" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--accent)' }}>
            <Wallet size={18} /> <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Balance Neto</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: (analysisData.totalIncome - analysisData.totalExpenses) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {formatCurrency(analysisData.totalIncome - analysisData.totalExpenses)}
          </div>
        </div>

        <div className="metric-card glass-panel v5-hover-effect" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-main)' }}>
            <Activity size={18} /> <span style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Tasa de Ahorro</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>
            {formatNumber(analysisData.savingsRate)}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{formatCurrency(analysisData.totalSavings)} ahorrado</div>
        </div>
      </div>

      {/* Evolution Line Chart */}
      <div className="glass-panel" style={{ padding: '24px', height: 400, marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {viewMode === 'month' ? 'Evolución Diaria (Acumulada)' : 'Evolución Mensual (Acumulada)'}
        </h3>
        <ResponsiveContainer width="100%" height="90%" key={`chart-${viewMode}-${selectedMonth}-${selectedYear}-${transactions.length}`}>
          <LineChart data={analysisData.accumulativeData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
            <Legend verticalAlign="top" align="right" iconType="circle" />
            <Line type="monotone" dataKey="accIngresos" name="Ingresos Totales" stroke="var(--success)" strokeWidth={3} dot={viewMode !== 'month'} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="accGastos" name="Gastos Totales" stroke="var(--danger)" strokeWidth={3} dot={viewMode !== 'month'} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Distribution Section */}
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {renderDistributionBar(
          analysisData.expensesDistribution, 
          analysisData.totalExpenses, 
          hoveredExpenseCat, 
          setHoveredExpenseCat, 
          'Distribución de Gastos',
          'gasto'
        )}
        {renderDistributionBar(
          analysisData.incomeDistribution, 
          analysisData.totalIncome, 
          hoveredIncomeCat, 
          setHoveredIncomeCat, 
          'Distribución de Ingresos',
          'ingreso'
        )}
      </div>

    </div>
  )
}
