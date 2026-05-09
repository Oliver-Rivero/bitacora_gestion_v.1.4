import React, { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { Building2, PiggyBank, Target, Landmark, ChevronLeft, ChevronRight } from 'lucide-react'
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

const CustomGoalTick = ({ x, y, payload, goals }) => {
  const goal = goals.find(g => g.name === payload.value)
  
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx={-128} cy={0} r={10} fill="var(--accent)" opacity={0.2} />
      <text x={-128} y={4} fontSize={10} textAnchor="middle" fill="var(--accent)" fontWeight={900}>
        {payload.value.charAt(0).toUpperCase()}
      </text>
      <text x={-110} y={4} fill="var(--text-main)" fontSize={12} fontWeight={600} textAnchor="start">
        {payload.value.length > 15 ? payload.value.substring(0, 15) + '...' : payload.value}
      </text>
    </g>
  )
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function DashboardView() {
  const { transactions, entities, savingsGoals, loading } = useData()
  const [hoveredCategory, setHoveredCategory] = useState(null)
  const [expenseView, setExpenseView] = useState('mensual')
  
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
      } else if (t.type === 'gasto') {
        if (isCurrentMonth) monthlyExpenses += t.amount
        if (isCurrentYear) yearlyExpenses += t.amount
      }
    })

    return { monthlyIncome, monthlyExpenses, yearlyIncome, yearlyExpenses, totalBalance, totalSavings }
  }, [transactions, entities, savingsGoals])

  const chartData = useMemo(() => {
    const monthlyData = {}
    const categoryAllocation = {}

    transactions.forEach(t => {
      // Excluir ajustes
      if (t.categoryName === 'Ajuste' || t.subcategoryName?.includes('Ajuste')) return

      // Parseo robusto de fecha
      const [y, m, d] = t.date.split('-').map(Number)
      const tDate = new Date(y, m - 1, d)
      
      const monthKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthKey, ingresos: 0, gastos: 0 }
      }

      if (t.type === 'ingreso') monthlyData[monthKey].ingresos += t.amount
      if (t.type === 'gasto') {
        monthlyData[monthKey].gastos += t.amount
        
        // Filter based on expenseView and selected period
        let include = true
        if (expenseView === 'mensual') {
            include = tDate.getMonth() === selectedMonth && tDate.getFullYear() === selectedYear
        } else if (expenseView === 'anual') {
            include = tDate.getFullYear() === selectedYear
        }

        if (include) {
            const catName = t.categoryName || 'Otros'
            const subName = t.subcategoryName || 'Otros'

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
    const distributionData = Object.values(categoryAllocation)
      .map((cat, i) => ({
        ...cat,
        color: COLORS[i % COLORS.length],
        percentage: totalExpensesFiltered > 0 ? (cat.value / totalExpensesFiltered) * 100 : 0,
        subcategories: Object.values(cat.subcategories).sort((a, b) => b.value - a.value)
      }))
      .sort((a, b) => b.value - a.value)

    const totalEntBalance = entities.reduce((acc, e) => acc + e.balance, 0)
    const entityBarData = [...entities]
      .sort((a, b) => b.balance - a.balance)
      .map(e => ({
        name: e.name,
        balance: e.balance,
        percentage: totalEntBalance > 0 ? (e.balance / totalEntBalance) * 100 : 0
      }))

    const goalsBarData = [...(savingsGoals || [])]
      .sort((a, b) => b.currentAmount - a.currentAmount)
      .map(g => ({
        name: g.name,
        currentAmount: g.currentAmount,
        targetAmount: g.targetAmount,
        percentage: g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
      }))

    return { barData, distributionData, entityBarData, totalEntBalance, goalsBarData, totalExpensesFiltered }
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

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Entidades Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px', height: 450 }}>
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

        {/* Categories & Subcategories - iOS Style */}
        <div className="glass-panel" style={{ padding: '24px', height: 450, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distribución de Gastos</h3>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                {formatCurrency(chartData.totalExpensesFiltered)}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div className="segmented-control" style={{ margin: 0, padding: 2 }}>
                    <button className={clsx('segment-item', expenseView === 'mensual' && 'active')} style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setExpenseView('mensual')}>Mes</button>
                    <button className={clsx('segment-item', expenseView === 'anual' && 'active')} style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setExpenseView('anual')}>Año</button>
                    <button className={clsx('segment-item', expenseView === 'total' && 'active')} style={{ padding: '4px 8px', fontSize: 10 }} onClick={() => setExpenseView('total')}>Total</button>
                </div>
                {/* Date Navigator Mini */}
                {(expenseView === 'mensual' || expenseView === 'anual') && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
                      <button className="btn-icon" onClick={() => expenseView === 'mensual' ? changeMonth(-1) : changeYear(-1)}>
                        <ChevronLeft size={14} />
                      </button>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 80, textAlign: 'center' }}>
                        {expenseView === 'mensual' ? `${MONTHS[selectedMonth]} ${selectedYear}` : selectedYear}
                      </div>
                      <button className="btn-icon" onClick={() => expenseView === 'mensual' ? changeMonth(1) : changeYear(1)}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                )}
            </div>
          </div>
          
          {/* Storage Bar */}
          <div style={{ 
            display: 'flex', 
            height: 28, 
            width: '100%', 
            background: 'var(--border)', 
            borderRadius: 14, 
            overflow: 'hidden', 
            marginBottom: 24,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: 12,
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
                  padding: '12px',
                  borderRadius: 12,
                  background: hoveredCategory === cat.name ? 'var(--border)' : 'transparent',
                  border: `1px solid ${hoveredCategory === cat.name ? 'var(--accent)' : 'transparent'}`,
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', marginLeft: 16 }}>
                  {formatCurrency(cat.value)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 16, marginTop: 2 }}>
                  {formatNumber(cat.percentage)}% del total
                </div>

                {/* Subcategories detail on hover */}
                {hoveredCategory === cat.name && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8, animation: 'fadeUp 0.3s ease' }}>
                    {cat.subcategories.slice(0, 5).map(sub => (
                      <div key={sub.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
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
      </div>

      <div className="charts-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        <div className="glass-panel" style={{ padding: '24px', height: 400 }}>
          <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Evolución Mensual (Ingresos vs Gastos)</h3>
          <ResponsiveContainer width="100%" height="90%" key={`evolution-chart-${transactions.length}-${expenseView}`}>
            <BarChart data={chartData.barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--panel-bg)', borderRadius: 12, border: '1px solid var(--border)', backdropFilter: 'blur(10px)' }}
                formatter={(v) => formatCurrency(v)}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" />
              <Bar dataKey="ingresos" name="Ingresos" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={30} />
              <Bar dataKey="gastos" name="Gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Savings Goals Horizontal Bar Chart */}
        <div className="glass-panel" style={{ padding: '24px', height: 400 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado de Huchas (Objetivos)</h3>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Acumulado: <span style={{ color: 'var(--text-main)', marginLeft: '4px', fontSize: 13 }}>{formatCurrency(metrics.totalSavings)}</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="90%" key={`goals-chart-${transactions.length}`}>
            <BarChart 
              data={chartData.goalsBarData} 
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
                tick={<CustomGoalTick goals={savingsGoals} />}
                width={1}
              />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="currentAmount" radius={[0, 6, 6, 0]} barSize={24}>
                {chartData.goalsBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                ))}
                <LabelList 
                  dataKey="currentAmount" 
                  position="right" 
                  content={(props) => {
                    const { x, y, width, height, value, index } = props;
                    const pct = chartData.goalsBarData[index].percentage;
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
      </div>
    </div>
  )
}
