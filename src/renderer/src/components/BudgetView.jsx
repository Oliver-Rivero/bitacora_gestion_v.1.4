import React, { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, DollarSign, PieChart, Wallet, CreditCard, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react'
import { useData } from '../context/DataContext'
import { formatCurrency } from '../utils/formatters'
import { PieChart as ReChartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { clsx } from 'clsx'

export default function BudgetView() {
  const { 
    categories, 
    transactions, 
    budgetItems, 
    incomeForecasts,
    addBudget,
    editBudget,
    deleteBudget,
    addIncomeForecast,
    deleteIncomeForecast
  } = useData()

  const [showIncomeModal, setShowIncomeModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [collapsedCategories, setCollapsedCategories] = useState([])

  const toggleCategory = (catName) => {
    setCollapsedCategories(prev => 
      prev.includes(catName) 
        ? prev.filter(c => c !== catName) 
        : [...prev, catName]
    )
  }

  // --- Calculations ---
  const totalIncomeForecast = useMemo(() => 
    incomeForecasts.reduce((acc, curr) => acc + curr.amount, 0),
    [incomeForecasts]
  )

  const totalBudgeted = useMemo(() => 
    budgetItems.reduce((acc, curr) => acc + curr.amount, 0),
    [budgetItems]
  )

  const fixedExpenses = useMemo(() => 
    budgetItems.filter(item => item.isFixed === 1).reduce((acc, curr) => acc + curr.amount, 0),
    [budgetItems]
  )

  const disposableIncome = totalIncomeForecast - fixedExpenses
  const freeCapital = totalIncomeForecast - totalBudgeted

  // Spending vs Budget for current month
  const currentMonthSpending = useMemo(() => {
    const now = new Date()
    const monthTxns = transactions.filter(t => {
      // Excluir ajustes
      if (t.categoryName === 'Ajuste' || t.subcategoryName?.includes('Ajuste')) return false

      // Parseo robusto de fecha
      const [y, m, d] = t.date.split('-').map(Number)
      const tDate = new Date(y, m - 1, d)
      
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear() && t.type === 'gasto'
    })

    const result = {}
    monthTxns.forEach(t => {
      const key = t.subcategoryId || `cat-${t.categoryId}`
      result[key] = (result[key] || 0) + t.amount
    })
    return result
  }, [transactions])

  // --- Chart Data Preparation (Apple Style) ---
  const pillarColors = {
    'Hogar': '#7B8FA1',    // Azul acero mate
    'Vehículo': '#8E9775', // Verde salvia
    'Personal': '#9B9BBD', // Lavanda grisáceo
    'Ahorro': '#B9A48E',   // Tierra mate
    'Inversión': '#D4C491', // Amarillo mostaza suave
    'Otros': '#A0AEC0'      // Gris desaturado
  }

  const [hoveredCategory, setHoveredCategory] = useState(null)

  const distributionData = useMemo(() => {
    if (totalIncomeForecast === 0) return []

    const virtualMap = {}
    budgetItems.forEach(item => {
      let groupName = 'Otros'
      const subName = item.subcategoryName || ''
      const catName = item.categoryName || ''

      if (subName === 'Ahorro') groupName = 'Ahorro'
      else if (subName === 'Inversión') groupName = 'Inversión'
      else if (catName === 'Hogar') groupName = 'Hogar'
      else if (catName === 'Vehículo') groupName = 'Vehículo'
      else if (catName === 'Personal' || catName === 'Ocio y entretenimiento') groupName = 'Personal'

      if (!virtualMap[groupName]) {
        virtualMap[groupName] = { name: groupName, value: 0, subcategories: [] }
      }
      virtualMap[groupName].value += item.amount
      virtualMap[groupName].subcategories.push({
        name: subName || 'General',
        value: item.amount
      })
    })

    const result = Object.values(virtualMap).map((cat) => ({
      ...cat,
      color: pillarColors[cat.name] || '#E2E8F0',
      percentage: (cat.value / totalIncomeForecast) * 100,
      subcategories: cat.subcategories.sort((a, b) => b.value - a.value)
    }))

    // Add Marginal Libre at the end
    if (freeCapital > 0) {
      result.push({
        name: 'Margen Libre',
        value: freeCapital,
        color: '#CBD5E0', 
        percentage: (freeCapital / totalIncomeForecast) * 100,
        subcategories: [{ name: 'Disponible', value: freeCapital }]
      })
    }

    return result
  }, [budgetItems, totalIncomeForecast, freeCapital])

  // --- Financial Health Logic (50/30/20 Rule) ---
  const healthStats = useMemo(() => {
    if (totalIncomeForecast === 0) return null;

    const needs = (distributionData.find(d => d.name === 'Hogar')?.value || 0) + 
                  (distributionData.find(d => d.name === 'Vehículo')?.value || 0);
    const wants = (distributionData.find(d => d.name === 'Personal')?.value || 0) + 
                  (distributionData.find(d => d.name === 'Otros')?.value || 0);
    const savings = (distributionData.find(d => d.name === 'Ahorro')?.value || 0) + 
                    (distributionData.find(d => d.name === 'Inversión')?.value || 0) + 
                    (distributionData.find(d => d.name === 'Margen Libre')?.value || 0);

    return [
      { label: 'Necesidades', value: needs, target: 50, color: '#7B8FA1', current: (needs / totalIncomeForecast) * 100 },
      { label: 'Deseos', value: wants, target: 30, color: '#9B9BBD', current: (wants / totalIncomeForecast) * 100 },
      { label: 'Ahorro/Inv.', value: savings, target: 20, color: '#B9A48E', current: (savings / totalIncomeForecast) * 100 }
    ];
  }, [distributionData, totalIncomeForecast]);

  const groupedBudgetItems = useMemo(() => {
    const groups = {
      'HOGAR': [],
      'VEHÍCULO': [],
      'PERSONAL': [],
      'AHORRO': [],
      'INVERSIÓN': [],
      'OTROS': []
    }
    
    budgetItems.forEach(item => {
      const subName = item.subcategoryName || ''
      const catName = item.categoryName || ''
      
      if (subName === 'Ahorro') groups['AHORRO'].push(item)
      else if (subName === 'Inversión') groups['INVERSIÓN'].push(item)
      else if (catName === 'Hogar') groups['HOGAR'].push(item)
      else if (catName === 'Vehículo') groups['VEHÍCULO'].push(item)
      else if (catName === 'Personal' || catName === 'Ocio y entretenimiento') groups['PERSONAL'].push(item)
      else groups['OTROS'].push(item)
    })

    return Object.entries(groups).filter(([_, items]) => items.length > 0)
  }, [budgetItems])

  return (
    <div className="view-container animate-fadeIn">
      <header className="view-header" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ marginBottom: 4 }}>Presupuesto Mensual</h1>
            <p className="text-muted">Planifica tus gastos y optimiza tu capacidad de ahorro.</p>
          </div>
          <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(126, 145, 177, 0.05)' }}>
            <AlertCircle size={20} className="text-accent" />
            <div style={{ fontSize: 13 }}>
              <div style={{ fontWeight: 700 }}>¿Cómo funciona?</div>
              <div style={{ opacity: 0.7 }}>Ingresos - Gastos Fijos = Capital disponible para gestionar.</div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="metrics-grid" style={{ marginBottom: 32 }}>
        <StatCard 
          title="Ingresos Previstos" 
          value={totalIncomeForecast} 
          icon={<TrendingUp size={24} />} 
          color="#6BCB77" 
        />
        <StatCard 
          title="Gastos Fijos" 
          value={fixedExpenses} 
          icon={<TrendingDown size={24} />} 
          color="#FF6B6B" 
        />
        <StatCard 
          title="Margen Libre" 
          value={freeCapital} 
          icon={<PieChart size={24} />} 
          color="#A0AEC0" 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Budget Items Section */}
          <section className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: 8, background: 'rgba(0, 113, 227, 0.1)', borderRadius: 10, color: 'var(--accent)' }}>
                  <CreditCard size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Gastos Presupuestados</h2>
              </div>
              <button className="btn" onClick={() => { setEditingItem(null); setShowBudgetModal(true); }}>
                <Plus size={16} /> Añadir Gasto
              </button>
            </div>

            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: 'right' }}>Presupuesto</th>
                    <th style={{ textAlign: 'right' }}>Real (Mes)</th>
                    <th style={{ textAlign: 'center' }}>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedBudgetItems.map(([catName, items]) => {
                    const isCollapsed = collapsedCategories.includes(catName)
                    const catColor = pillarColors[catName] || '#8E8E93'
                    
                    return (
                      <React.Fragment key={catName}>
                        {/* Category Header Row */}
                        <tr 
                          onClick={() => toggleCategory(catName)}
                          style={{ 
                            background: `${catColor}25`, // Aumentamos opacidad al 15% aproximadamente
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <td colSpan="6" style={{ padding: '10px 20px', fontSize: 11, fontWeight: 800, color: catColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                              {catName}
                              <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 10, marginLeft: 8 }}>
                                ({items.length} {items.length === 1 ? 'item' : 'items'})
                              </span>
                            </div>
                          </td>
                        </tr>
                        {!isCollapsed && items.map(item => {
                          const realSpent = currentMonthSpending[item.subcategoryId || `cat-${item.categoryId}`] || 0
                          const percent = (realSpent / item.amount) * 100
                          const isOver = percent > 100

                          return (
                            <tr key={item.id} className="animate-fadeIn" style={{ animationDuration: '0.3s' }}>
                              <td style={{ paddingLeft: 32 }}>
                                <div style={{ fontWeight: 600 }}>{item.subcategoryName || 'General'}</div>
                                {item.note && <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>"{item.note}"</div>}
                              </td>
                              <td>
                                <span className={clsx('badge', item.isFixed ? 'badge-danger' : 'badge-primary')} style={{ fontSize: 9 }}>
                                  {item.isFixed ? 'FIJO' : 'VARIABLE'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.amount)}</td>
                              <td style={{ textAlign: 'right' }}>{formatCurrency(realSpent)}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                  <div style={{ width: 60, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ 
                                      width: `${Math.min(100, percent)}%`, 
                                      height: '100%', 
                                      background: isOver ? 'var(--danger)' : 'var(--success)' 
                                    }} />
                                  </div>
                                  {isOver ? <AlertCircle size={14} className="text-danger" /> : <CheckCircle2 size={14} className="text-success" />}
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button className="btn-icon" onClick={(e) => { e.stopPropagation(); setEditingItem(item); setShowBudgetModal(true); }}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="btn-icon text-danger" onClick={(e) => { e.stopPropagation(); deleteBudget(item.id); }}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                  {budgetItems.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                        No has definido ningún presupuesto aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Income Forecast Section */}
          <section className="glass-panel" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Previsión de Ingresos</h3>
              <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setShowIncomeModal(true)}>
                <Plus size={14} /> Añadir
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {incomeForecasts.map(income => (
                <div key={income.id} className="glass-panel" style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{income.name}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(income.amount)}</div>
                    <button className="btn-icon text-danger" onClick={() => deleteIncomeForecast(income.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {incomeForecasts.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                  No hay previsiones registradas.
                </div>
              )}
            </div>
          </section>

          {/* Apple-Style Distribution Chart */}
          <section className="glass-panel" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Distribución del Capital</h3>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                Total: <span style={{ color: 'var(--text-main)' }}>{formatCurrency(totalIncomeForecast)}</span>
              </div>
            </div>

            {/* Storage Bar */}
            <div style={{ 
              display: 'flex', 
              height: 32, 
              width: '100%', 
              background: 'rgba(0,0,0,0.05)', 
              borderRadius: 16, 
              overflow: 'hidden', 
              marginBottom: 24,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              border: '1px solid var(--border)'
            }}>
              {distributionData.map((cat, i) => (
                <div
                  key={cat.name}
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    width: `${cat.percentage}%`,
                    background: cat.color,
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    cursor: 'pointer',
                    opacity: hoveredCategory && hoveredCategory !== cat.name ? 0.3 : 1,
                    transform: hoveredCategory === cat.name ? 'scaleY(1.1)' : 'scaleY(1)',
                    borderRight: i < distributionData.length - 1 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                  }}
                />
              ))}
              {distributionData.length === 0 && (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                  Sin presupuestos definidos
                </div>
              )}
            </div>

            {/* Interactive Legend Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
              gap: 12,
              overflowY: 'auto',
              flex: 1,
              paddingRight: 4
            }}>
              {distributionData.map(cat => (
                <div 
                  key={cat.name}
                  onMouseEnter={() => setHoveredCategory(cat.name)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  style={{
                    padding: '12px',
                    borderRadius: 14,
                    background: hoveredCategory === cat.name ? 'rgba(0, 113, 227, 0.05)' : 'transparent',
                    border: `1px solid ${hoveredCategory === cat.name ? 'rgba(0, 113, 227, 0.2)' : 'transparent'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginLeft: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>
                      {formatCurrency(cat.value)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {cat.percentage.toFixed(1)}%
                    </div>
                  </div>

                  {/* Subcategories detail on hover */}
                  {hoveredCategory === cat.name && cat.subcategories.length > 0 && (
                    <div style={{ 
                      marginTop: 12, 
                      borderTop: '1px solid var(--border)', 
                      paddingTop: 8, 
                      animation: 'fadeIn 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}>
                      {cat.subcategories.map((sub, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                          <span style={{ color: 'var(--text-muted)' }}>{sub.name}</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(sub.value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Financial Health Section (50/30/20) */}
          {healthStats && (
            <section className="glass-panel" style={{ padding: 24, animation: 'fadeUp 0.6s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 8, background: 'rgba(107, 203, 119, 0.1)', borderRadius: 10, color: '#6BCB77' }}>
                  <Sparkles size={20} />
                </div>
                <h2 style={{ margin: 0, fontSize: 18 }}>Salud Financiera (Regla 50/30/20)</h2>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {healthStats.map(stat => {
                  const diff = stat.current - stat.target;
                  const isOk = stat.label === 'Ahorro/Inv.' ? stat.current >= stat.target : stat.current <= stat.target;
                  
                  return (
                    <div key={stat.label} style={{ padding: 16, background: 'rgba(0,0,0,0.02)', borderRadius: 16, border: '1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>{stat.label}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                        <div style={{ fontSize: 20, fontWeight: 800 }}>{stat.current.toFixed(1)}%</div>
                        <div style={{ fontSize: 11, opacity: 0.6 }}>de {stat.target}%</div>
                      </div>
                      
                      {/* Progress Bar (Apple Style) */}
                      <div style={{ height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 12 }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${Math.min(100, (stat.current / stat.target) * 100)}%`, 
                          background: stat.color,
                          borderRadius: 3
                        }} />
                      </div>
                      
                      <div style={{ 
                        fontSize: 10, 
                        fontWeight: 700, 
                        color: isOk ? '#6BCB77' : '#FF6B6B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {isOk ? '✓ Objetivo Cumplido' : `⚠ Desviación: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                Un balance equilibrado es la clave para la libertad financiera a largo plazo.
              </p>
            </section>
          )}
        </div>
      </div>

      {/* Modals */}
      {showIncomeModal && (
        <IncomeModal 
          onClose={() => setShowIncomeModal(false)} 
          onSave={async (data) => {
            await addIncomeForecast(data)
            setShowIncomeModal(false)
          }}
        />
      )}

      {showBudgetModal && (
        <BudgetModal 
          item={editingItem}
          categories={categories}
          onClose={() => setShowBudgetModal(false)}
          onSave={async (data) => {
            if (editingItem) {
              await editBudget({ ...data, id: editingItem.id })
            } else {
              await addBudget(data)
            }
            setShowBudgetModal(false)
          }}
        />
      )}
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="glass-panel metric-card v5-hover-effect" style={{ borderLeft: `4px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="metric-title">{title}</div>
          <div className="metric-value" style={{ marginTop: 8 }}>{formatCurrency(value)}</div>
        </div>
        <div style={{ 
          width: 44, 
          height: 44, 
          borderRadius: 12, 
          background: `${color}15`, 
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function IncomeModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400 }}>
        <h2 style={{ marginBottom: 24 }}>Nueva Previsión de Ingreso</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label className="label">CONCEPTO</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Nómina" />
          </div>
          <div>
            <label className="label">IMPORTE MENSUAL (€)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave({ name, amount: Number(amount) })} disabled={!name || !amount}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function BudgetModal({ item, categories, onClose, onSave }) {
  const [categoryId, setCategoryId] = useState(item?.categoryId || '')
  const [subcategoryId, setSubcategoryId] = useState(item?.subcategoryId || '')
  const [amount, setAmount] = useState(item?.amount || '')
  const [isFixed, setIsFixed] = useState(item?.isFixed === 1)
  const [note, setNote] = useState(item?.note || '')

  const selectedCategory = categories.find(c => c.id === Number(categoryId))

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 450 }}>
        <h2 style={{ marginBottom: 24 }}>{item ? 'Editar Presupuesto' : 'Nuevo Presupuesto'}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label className="label">CATEGORÍA</label>
            <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategoryId(''); }}>
              <option value="">Seleccionar categoría...</option>
              {categories.filter(c => c.type === 'gasto').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">SUBCATEGORÍA (OPCIONAL)</label>
            <select value={subcategoryId} onChange={e => setSubcategoryId(e.target.value)}>
              <option value="">Toda la categoría</option>
              {selectedCategory?.subcategories.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">IMPORTE MENSUAL (€)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <input 
              type="checkbox" 
              id="isFixed" 
              checked={isFixed} 
              onChange={e => setIsFixed(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isFixed" style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Es un gasto fijo</label>
          </div>
          <div>
            <label className="label">NOTA / OBSERVACIÓN (OPCIONAL)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Ej: Pago trimestral, suscripción familiar..." />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onSave({ 
            categoryId: Number(categoryId), 
            subcategoryId: subcategoryId ? Number(subcategoryId) : null, 
            amount: Number(amount), 
            isFixed: isFixed ? 1 : 0,
            note: note
          })} disabled={!categoryId || !amount}>Guardar</button>
        </div>
      </div>
    </div>
  )
}
