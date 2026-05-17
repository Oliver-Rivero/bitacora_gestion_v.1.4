import React, { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { 
  Building2, PiggyBank, Target, Landmark, ChevronLeft, ChevronRight, Calendar,
  Car, Home, Plane, Camera, Gamepad, Coins, Award, Sparkles, CheckCircle2 
} from 'lucide-react'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts'
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters'
import { clsx } from 'clsx'

const COLORS = ['#7E91B1', '#9CAF9C', '#D18B8B', '#A29BBD', '#A09D9A', '#BFA89A', '#D9CD96', '#9BADC4']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload || payload[0];
    if (!data) return null;
    return (
      <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--glass-shadow)', fontSize: 13 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 2 }}>{data.name}</div>
        {data.category && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Categoría: {data.category}</div>}
        <div style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(data.value || data.balance || data.currentAmount || 0)}</div>
      </div>
    )
  }
  return null
}

const CustomYAxisTick = ({ x, y, payload, entities }) => {
  const entity = entities.find(e => e.name === payload.value)
  const logoUrl = entity?.url ? `https://www.google.com/s2/favicons?domain=${entity.url}&sz=128` : null

  return (
    <g transform={`translate(${x},${y})`}>
      {logoUrl ? (
        <image x={-140} y={-12} width={24} height={24} href={logoUrl} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <rect x={-140} y={-12} width={24} height={24} fill="rgba(0,0,0,0.05)" rx={4} />
      )}
      <text x={-110} y={4} fill="var(--text-main)" fontSize={12} fontWeight={600} textAnchor="start">
        {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
      </text>
    </g>
  )
}

const ICONS_MAP = {
  PiggyBank,
  Car,
  Home,
  Plane,
  Camera,
  Gamepad,
  Coins,
  Target
}

function getIconByName(name) {
  return ICONS_MAP[name] || PiggyBank
}

const GOAL_COLORS = [
  { main: '#7E91B1', light: 'rgba(126, 145, 177, 0.15)', gradient: 'linear-gradient(135deg, #7E91B1, #5D6D8A)' },
  { main: '#9CAF9C', light: 'rgba(156, 175, 156, 0.15)', gradient: 'linear-gradient(135deg, #9CAF9C, #7A8E7A)' },
  { main: '#D18B8B', light: 'rgba(209, 139, 139, 0.15)', gradient: 'linear-gradient(135deg, #D18B8B, #A86F6F)' },
  { main: '#A29BBD', light: 'rgba(162, 155, 189, 0.15)', gradient: 'linear-gradient(135deg, #A29BBD, #827A9E)' },
  { main: '#BFA89A', light: 'rgba(191, 168, 154, 0.15)', gradient: 'linear-gradient(135deg, #BFA89A, #9E8A7D)' }
]

function getGoalColor(id) {
  return GOAL_COLORS[id % GOAL_COLORS.length]
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function DashboardView() {
  const { transactions, entities, savingsGoals, contributions, loading } = useData()
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [expenseView, setExpenseView] = useState('mensual')
  const [hiddenBars, setHiddenBars] = useState({
    ingresos: false,
    gastos: false,
    ahorros: false,
    inversiones: false
  })
  
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const metrics = useMemo(() => {
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let monthlyIncome = 0
    let monthlyExpenses = 0
    let yearlyIncome = 0
    let yearlyExpenses = 0
    
    const totalBalance = entities.reduce((acc, e) => acc + e.balance, 0)
    const totalSavings = (savingsGoals || []).reduce((acc, g) => acc + (g.currentAmount || 0), 0)

    transactions.forEach(t => {
      // Excluir ajustes
      if (t.categoryName === 'Ajuste' || t.subcategoryName?.includes('Ajuste')) return

      // Parseo robusto de fecha
      const [y, m, d] = t.date.split('-').map(Number)
      const tDate = new Date(y, m - 1, d)
      
      const isCurrentMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear
      const isCurrentYear = tDate.getFullYear() === currentYear

      if (t.type === 'ingreso') {
        if (isCurrentMonth) monthlyIncome += t.amount
        if (isCurrentYear) yearlyIncome += t.amount
      } else if (t.type === 'gasto' || t.type === 'ahorro' || t.type === 'inversion') {
        if (isCurrentMonth) monthlyExpenses += t.amount
        if (isCurrentYear) yearlyExpenses += t.amount
      }
    })

    return { monthlyIncome, monthlyExpenses, yearlyIncome, yearlyExpenses, totalBalance, totalSavings }
  }, [transactions, entities, savingsGoals])

  const chartData = useMemo(() => {
    const monthlyData = {}
    const categoryAllocation = {}
    let totalIncomeFiltered = 0

    transactions.forEach(t => {
      // Excluir ajustes
      if (t.categoryName === 'Ajuste' || t.subcategoryName?.includes('Ajuste')) return

      // Parseo robusto de fecha
      const [y, m, d] = t.date.split('-').map(Number)
      const tDate = new Date(y, m - 1, d)
      
      const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthKey, ingresos: 0, gastos: 0, ahorros: 0, inversiones: 0 }
      }

      const isAhorro = t.type === 'ahorro' || (t.categoryName === 'Finanzas' && t.subcategoryName === 'Ahorro')
      const isInversion = t.type === 'inversion' || (t.categoryName === 'Finanzas' && t.subcategoryName === 'Inversión')

      if (t.type === 'ingreso') {
        monthlyData[monthKey].ingresos += t.amount
        
        let include = true
        if (expenseView === 'mensual') {
            include = tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear
        } else if (expenseView === 'anual') {
            include = tDate.getFullYear() === selectedYear
        }
        if (include) {
            totalIncomeFiltered += t.amount
        }
      } else if (isAhorro) {
        monthlyData[monthKey].ahorros += t.amount
      } else if (isInversion) {
        monthlyData[monthKey].inversiones += t.amount
      } else {
        monthlyData[monthKey].gastos += t.amount
      }

      if (t.type === 'gasto' || t.type === 'ahorro' || t.type === 'inversion') {
        
        // Filter based on expenseView and selected period
        let include = true
        if (expenseView === 'mensual') {
            include = tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear
        } else if (expenseView === 'anual') {
            include = tDate.getFullYear() === selectedYear
        }

        if (include) {
            const catName = isAhorro ? 'Ahorro' : isInversion ? 'Inversión' : (t.categoryName || 'Otros')
            const subName = isAhorro ? 'General' : isInversion ? 'General' : (t.subcategoryName || 'Otros')

            if (!categoryAllocation[catName]) {
              categoryAllocation[catName] = { name: catName, value: 0, subcategories: {} }
            }
            categoryAllocation[catName].value += t.amount
            
            if (!categoryAllocation[catName].subcategories[subName]) {
              categoryAllocation[catName].subcategories[subName] = { name: subName, value: 0 }
            }
            categoryAllocation[catName].subcategories[subName].value += t.amount
        }
      }
    })

    const barData = Object.values(monthlyData).sort((a, b) => a.name.localeCompare(b.name)).slice(-12)
    
    const totalExpensesFiltered = Object.values(categoryAllocation).reduce((acc, c) => acc + c.value, 0)
    const hasFreeMargin = totalIncomeFiltered > totalExpensesFiltered
    const freeMarginValue = hasFreeMargin ? (totalIncomeFiltered - totalExpensesFiltered) : 0
    const totalDistributionSum = hasFreeMargin ? totalIncomeFiltered : totalExpensesFiltered

    let distributionData = Object.values(categoryAllocation)
      .map((cat, i) => {
        let catColor = COLORS[i % COLORS.length]
        if (cat.name === 'Ahorro') {
          catColor = localStorage.getItem('color_ahorro') || '#5D7EA7'
        } else if (cat.name === 'Inversión') {
          catColor = localStorage.getItem('color_inversion') || '#827A9E'
        } else {
          catColor = localStorage.getItem(`category_color_${cat.name}`) || COLORS[i % COLORS.length]
        }

        return {
          ...cat,
          color: catColor,
          percentage: totalDistributionSum > 0 ? (cat.value / totalDistributionSum) * 100 : 0,
          subcategories: Object.values(cat.subcategories).sort((a, b) => b.value - a.value)
        }
      })

    distributionData.sort((a, b) => b.value - a.value)

    if (freeMarginValue > 0) {
      distributionData.push({
        name: 'Margen Libre',
        value: freeMarginValue,
        color: 'rgba(126, 145, 177, 0.25)', // Color sutil translúcido que sugiere espacio "vacío" o disponible
        percentage: (freeMarginValue / totalDistributionSum) * 100,
        subcategories: [{ name: 'Ahorro no asignado (Excedente)', value: freeMarginValue }]
      })
    }

    const totalEntBalance = entities.reduce((acc, e) => acc + e.balance, 0)
    const entityBarData = [...entities]
      .sort((a, b) => b.balance - a.balance)
      .map(e => ({
        name: e.name,
        balance: e.balance,
        percentage: totalEntBalance > 0 ? (e.balance / totalEntBalance) * 100 : 0
      }))

    return { barData, distributionData, entityBarData, totalEntBalance, totalExpensesFiltered, totalIncomeFiltered, totalDistributionSum, hasFreeMargin }
  }, [transactions, entities, savingsGoals, expenseView, selectedMonth, selectedYear])

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

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando...</div>

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1>Panel de Control</h1>

      <div className="metrics-grid">
        <div className="metric-card glass-panel v5-hover-effect">
          <div className="metric-title">Balance Total</div>
          <div className="metric-value metric-hero">{formatCurrency(metrics.totalBalance)}</div>
        </div>
        <div className="metric-card glass-panel v5-hover-effect">
          <div className="metric-title">Ingresos Mensuales</div>
          <div className="metric-value metric-positive">{formatCurrency(metrics.monthlyIncome)}</div>
        </div>
        <div className="metric-card glass-panel v5-hover-effect">
          <div className="metric-title">Gastos Mensuales</div>
          <div className="metric-value metric-negative">{formatCurrency(metrics.monthlyExpenses)}</div>
        </div>
        <div className="metric-card glass-panel v5-hover-effect">
          <div className="metric-title">Balance Neto Mes</div>
          <div className={clsx('metric-value', (metrics.monthlyIncome - metrics.monthlyExpenses) >= 0 ? 'metric-positive' : 'metric-negative')}>
            {formatCurrency(metrics.monthlyIncome - metrics.monthlyExpenses)}
          </div>
        </div>
        <div className="metric-card glass-panel v5-hover-effect">
          <div className="metric-title">Gastos Anuales</div>
          <div className="metric-value metric-negative">{formatCurrency(metrics.yearlyExpenses)}</div>
        </div>
      </div>

      {/* Master Temporal Analysis Panel */}
      <div className="glass-panel" style={{ padding: '24px', marginBottom: 24, display: 'flex', flexDirection: 'column', height: 450 }}>
        {/* Master Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={18} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: 13, color: 'var(--text-main)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Análisis de Período Temporal <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'none', marginLeft: 8, letterSpacing: 'normal', fontWeight: 'normal' }}>(Afecta a la distribución y evolución mensual)</span>
            </h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="segmented-control" style={{ margin: 0, padding: 2 }}>
              <button className={clsx('segment-item', expenseView === 'mensual' && 'active')} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setExpenseView('mensual')}>Mes</button>
              <button className={clsx('segment-item', expenseView === 'anual' && 'active')} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setExpenseView('anual')}>Año</button>
              <button className={clsx('segment-item', expenseView === 'total' && 'active')} style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setExpenseView('total')}>Total</button>
            </div>
            
            {/* Date Navigator Unified */}
            {(expenseView === 'mensual' || expenseView === 'anual') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.02)', padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>
                <button className="btn-icon" style={{ padding: 4 }} onClick={() => expenseView === 'mensual' ? changeMonth(-1) : changeYear(-1)}>
                  <ChevronLeft size={14} />
                </button>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', minWidth: 90, textAlign: 'center' }}>
                  {expenseView === 'mensual' ? `${MONTHS[selectedMonth]} ${selectedYear}` : selectedYear}
                </div>
                <button className="btn-icon" style={{ padding: 4 }} onClick={() => expenseView === 'mensual' ? changeMonth(1) : changeYear(1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Master Content (Two child cards side-by-side) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, flex: 1, minHeight: 0 }}>
          {/* Card 1: Distribución */}
          <div style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribución de Flujos</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                  {formatCurrency(chartData.totalDistributionSum)}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                  {chartData.hasFreeMargin ? 'Flujo Total (Ingresos)' : 'Gastado Total (Déficit)'}
                </span>
              </div>
            </div>
            
            {/* Storage Bar */}
            <div style={{ 
              display: 'flex', 
              height: 24, 
              width: '100%', 
              background: 'var(--border)', 
              borderRadius: 12, 
              overflow: 'hidden', 
              marginBottom: 16,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              flexShrink: 0
            }}>
              {chartData.distributionData.map((cat, i) => (
                <div
                  key={cat.name}
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    width: `${cat.percentage}%`,
                    background: cat.color,
                    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    opacity: hoveredCategory && hoveredCategory !== cat.name ? 0.3 : 1,
                    transform: hoveredCategory === cat.name ? 'scaleY(1.15)' : 'scaleY(1)',
                    borderRight: i < chartData.distributionData.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                  }}
                />
              ))}
              {chartData.distributionData.length === 0 && (
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>Sin datos para este periodo</div>
              )}
            </div>

            {/* Legend Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
              gap: 10,
              overflowY: 'auto',
              flex: 1,
              paddingRight: 4
            }}>
              {chartData.distributionData.map(cat => (
                <div 
                  key={cat.name}
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: hoveredCategory === cat.name ? 'var(--border)' : 'transparent',
                    border: `1px solid ${hoveredCategory === cat.name ? 'var(--accent)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'default'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ 
                      width: 18, 
                      height: 18, 
                      borderRadius: '50%', 
                      background: `${cat.color}15`, 
                      border: `1px solid ${cat.color}30`, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0 
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', marginLeft: 26 }}>
                    {formatCurrency(cat.value)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 26 }}>
                    {formatNumber(cat.percentage)}% del total
                  </div>

                  {/* Subcategories detail on hover */}
                  {hoveredCategory === cat.name && (
                    <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 6, animation: 'fadeUp 0.3s ease' }}>
                      {cat.subcategories.slice(0, 5).map(sub => (
                        <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, marginBottom: 2 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{sub.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatNumber((sub.value / cat.value) * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Evolución Mensual */}
          <div style={{ background: 'rgba(0,0,0,0.01)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolución Mensual</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>(Clic en leyenda para filtrar)</span>
            </div>
            
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.barData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--panel-bg)', borderRadius: 12, border: '1px solid var(--border)', backdropFilter: 'blur(10px)', fontSize: 11 }}
                    formatter={(v) => formatCurrency(v)}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle" 
                    onClick={(e) => {
                      const key = e.dataKey
                      setHiddenBars(prev => ({ ...prev, [key]: !prev[key] }))
                    }}
                    wrapperStyle={{ cursor: 'pointer', userSelect: 'none', fontSize: 10, paddingBottom: 10 }}
                  />
                  <Bar dataKey="ingresos" name="Ingresos" fill="var(--success)" radius={[2, 2, 0, 0]} barSize={8} hide={hiddenBars.ingresos} />
                  <Bar dataKey="gastos" name="Gastos" fill="var(--danger)" radius={[2, 2, 0, 0]} barSize={8} hide={hiddenBars.gastos} />
                  <Bar dataKey="ahorros" name="Ahorro" fill={localStorage.getItem('color_ahorro') || '#5D7EA7'} radius={[2, 2, 0, 0]} barSize={8} hide={hiddenBars.ahorros} />
                  <Bar dataKey="inversiones" name="Inversión" fill={localStorage.getItem('color_inversion') || '#827A9E'} radius={[2, 2, 0, 0]} barSize={8} hide={hiddenBars.inversiones} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        {/* Entidades Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px', height: 405 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribución por Entidad</h3>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Patrimonio: <span style={{ color: 'var(--text-main)', marginLeft: '4px', fontSize: 13 }}>{formatCurrency(metrics.totalBalance)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart 
              data={chartData.entityBarData} 
              layout="vertical" 
              margin={{ left: 150, right: 120, top: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false} 
                tickLine={false}
                tick={<CustomYAxisTick entities={entities} />}
                width={1}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="balance" radius={[0, 6, 6, 0]} barSize={24}>
                {chartData.entityBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList 
                  dataKey="balance" 
                  position="right" 
                  content={(props) => {
                    const { x, y, width, height, value, index } = props;
                    const pct = chartData.entityBarData[index].percentage;
                    return (
                      <text x={x + width + 10} y={y + height / 2 + 5} fill="var(--text-main)" fontSize={11} fontWeight={700}>
                        {formatCurrency(value)} <tspan fill="var(--text-muted)" fontWeight={500}>({formatNumber(pct)}%)</tspan>
                      </text>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Savings Goals Premium View */}
        <div className="glass-panel" style={{ padding: '24px', height: 405, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado de Huchas (Objetivos)</h3>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Acumulado: <span style={{ color: 'var(--text-main)', marginLeft: '4px', fontSize: 13 }}>{formatCurrency(metrics.totalSavings)}</span>
            </div>
          </div>

          <div style={{ 
            overflowY: 'auto', 
            flex: 1, 
            paddingRight: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16 
          }}>
            {savingsGoals && savingsGoals.length > 0 ? (
              [...(savingsGoals || [])]
                .sort((a, b) => {
                  const pctA = a.targetAmount > 0 ? (a.currentAmount / a.targetAmount) : 0;
                  const pctB = b.targetAmount > 0 ? (b.currentAmount / b.targetAmount) : 0;
                  return pctB - pctA; // Sort by closest to completion first
                })
                .map((goal) => {
                  const progress = Math.min(100, (goal.currentAmount / (goal.targetAmount || 1)) * 100)
                  const GoalIcon = getIconByName(goal.icon)
                  const goalColor = getGoalColor(goal.id)
                  const isCompleted = goal.currentAmount >= goal.targetAmount

                  // Calculate my contributions vs yield
                  const myContributions = (contributions || [])
                    .filter(c => c.goalId === goal.id)
                    .reduce((acc, c) => acc + c.amount, 0)
                  
                  const yieldAmount = Math.max(0, goal.currentAmount - myContributions)
                  const totalVal = goal.currentAmount || 1
                  const personalPctOfCurrent = (myContributions / totalVal) * 100
                  const yieldPctOfCurrent = (yieldAmount / totalVal) * 100

                  // Calculate remaining to goal
                  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

                  return (
                    <div 
                      key={goal.id} 
                      className="v5-hover-effect"
                      style={{ 
                        padding: '12px 14px', 
                        borderRadius: 14, 
                        background: 'rgba(0,0,0,0.015)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        position: 'relative',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                        e.currentTarget.style.borderColor = 'var(--accent)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.015)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                      }}
                    >
                      {/* Top Row: Icon + Name + Pct / Remaining */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* Animated Icon Container */}
                          <div style={{ 
                            position: 'relative',
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: goalColor.gradient,
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 3px 8px rgba(0,0,0,0.08)'
                          }}>
                            <GoalIcon size={18} />
                            
                            {/* Little badge if completed */}
                            {isCompleted && (
                              <div style={{
                                position: 'absolute',
                                bottom: -3,
                                right: -3,
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: 'var(--success)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }}>
                                <CheckCircle2 size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>{goal.name}</span>
                              {isCompleted && (
                                <span style={{
                                  fontSize: 9,
                                  fontWeight: 800,
                                  background: 'rgba(108, 165, 123, 0.12)',
                                  color: 'var(--success)',
                                  padding: '2px 6px',
                                  borderRadius: 8,
                                  letterSpacing: '0.2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 2
                                }}>
                                  <Sparkles size={8} /> COMPLETADA
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {isCompleted 
                                ? '¡Excelente esfuerzo!' 
                                : `Faltan ${formatCurrency(remaining)}`
                              }
                            </span>
                          </div>
                        </div>

                        {/* Percent and amounts */}
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: isCompleted ? 'var(--success)' : 'var(--text-main)' }}>
                            {progress.toFixed(0)}%
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{formatCurrency(goal.currentAmount)}</span>
                            <span> / {formatCurrency(goal.targetAmount)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Dual Progress Bar (Apple / iOS style) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ 
                          width: '100%', 
                          height: 6, 
                          background: 'rgba(0,0,0,0.05)', 
                          borderRadius: 3, 
                          overflow: 'hidden', 
                          position: 'relative'
                        }}>
                          <div style={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            display: 'flex',
                            borderRadius: 3,
                            overflow: 'hidden'
                          }}>
                            {/* Personal contributions */}
                            <div style={{ 
                              width: `${personalPctOfCurrent}%`, 
                              height: '100%', 
                              background: goalColor.main, 
                              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                              borderRight: yieldAmount > 0 ? '1px solid rgba(255,255,255,0.3)' : 'none'
                            }} />
                            
                            {/* Interest Yield contributions */}
                            <div style={{ 
                              width: `${yieldPctOfCurrent}%`, 
                              height: '100%', 
                              background: '#6BCB77', 
                              transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                            }} />
                          </div>
                        </div>

                        {/* Tiny subtext details if yield exists */}
                        {yieldAmount > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', paddingLeft: 2 }}>
                            <span>Aportado: <strong>{formatCurrency(myContributions)}</strong></span>
                            <span style={{ color: '#6BCB77', fontWeight: 600 }}>Intereses: +{formatCurrency(yieldAmount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                opacity: 0.8,
                textAlign: 'center',
                padding: '20px'
              }}>
                <PiggyBank size={40} style={{ color: 'var(--text-muted)', marginBottom: 12, opacity: 0.5 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>No hay huchas de ahorro activas</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, maxWidth: 220 }}>
                  Ve a la pestaña de "Ahorro" para crear tus primeros objetivos financieros.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
