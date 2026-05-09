import React, { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { 
  PiggyBank, Plus, Trash2, TrendingUp, TrendingDown, Clock, 
  Target, Car, Home, Plane, Camera, Gamepad, Coins, X, Globe, Save, 
  RefreshCcw, Calendar, ArrowRight, ArrowLeft, Wallet
} from 'lucide-react'
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters'
import { clsx } from 'clsx'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ComposedChart, Line, ReferenceLine 
} from 'recharts'

const ICONS = [
  { id: 'PiggyBank', icon: PiggyBank, label: 'Hucha' },
  { id: 'Car', icon: Car, label: 'Coche' },
  { id: 'Home', icon: Home, label: 'Casa' },
  { id: 'Plane', icon: Plane, label: 'Viaje' },
  { id: 'Camera', icon: Camera, label: 'Foto' },
  { id: 'Gamepad', icon: Gamepad, label: 'Ocio' },
  { id: 'Coins', icon: Coins, label: 'Inversión' },
  { id: 'Target', icon: Target, label: 'Meta' }
]

function getIconByName(name) {
  const found = ICONS.find(i => i.id === name)
  return found ? found.icon : PiggyBank
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

export default function SavingsView() {
  const { 
    savingsGoals, contributions, addSavingsGoal, deleteSavingsGoal, 
    recordSavingsContribution, editSavingsGoal, addTransaction,
    recurringTransactions, addRecurringTransaction, editRecurringTransaction, deleteRecurringTransaction,
    entities, categories, transactions
  } = useData()
  
  const [activeTab, setActiveTab] = useState('goals') // 'goals' | 'automation'
  const [selectedGoalId, setSelectedGoalId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [automationModalConfig, setAutomationModalConfig] = useState(null) // null | { edit: boolean, data?: any }
  const [contributionConfig, setContributionConfig] = useState(null)
  const [completedGoal, setCompletedGoal] = useState(null)

  const totalSaved = useMemo(() => 
    savingsGoals.reduce((acc, g) => acc + (g.currentAmount || 0), 0),
    [savingsGoals]
  )

  const selectedGoal = useMemo(() => 
    savingsGoals.find(g => g.id === selectedGoalId), 
    [savingsGoals, selectedGoalId]
  )

  const handleDeleteGoal = async (id, e) => {
    e.stopPropagation()
    if (confirm('¿Estás seguro de que quieres eliminar esta hucha?')) {
      await deleteSavingsGoal(id)
      if (selectedGoalId === id) setSelectedGoalId(null)
    }
  }

  const handleManualContribution = async ({ amount, entityId }) => {
    const goal = contributionConfig.goal
    const wasCompleted = goal.currentAmount >= goal.targetAmount
    const date = new Date().toISOString().split('T')[0]

    // 1. ALWAYS record the contribution in the savings goal history
    await recordSavingsContribution(goal.id, amount)

    // 2. If an entity is selected, record the transaction in the ledger
    if (entityId) {
      const finanzasCat = categories.find(c => c.name === 'Finanzas')
      const ahorroSub = finanzasCat?.subcategories.find(s => s.name === 'Ahorro')
      
      await addTransaction({
        date,
        type: amount > 0 ? 'gasto' : 'ingreso',
        amount: Math.abs(amount),
        entityId: parseInt(entityId),
        categoryId: finanzasCat?.id,
        subcategoryId: ahorroSub?.id,
        note: `${amount > 0 ? 'Aportación' : 'Retirada'} hucha: ${goal.name}`
      })
    }

    const isNowCompleted = (goal.currentAmount + amount) >= goal.targetAmount
    if (!wasCompleted && isNowCompleted && amount > 0) {
      setCompletedGoal({ ...goal, currentAmount: goal.currentAmount + amount })
    }

    setContributionConfig(null)
  }

   return (
    <>
      {selectedGoal ? (
        <SavingsGoalCalculator 
          selectedGoal={selectedGoal}
          onBack={() => setSelectedGoalId(null)}
          onUpdate={async (data) => {
            const wasCompleted = selectedGoal.currentAmount >= selectedGoal.targetAmount
            await editSavingsGoal({ ...selectedGoal, ...data })
            const isNowCompleted = selectedGoal.currentAmount >= data.targetAmount
            if (!wasCompleted && isNowCompleted) {
              setCompletedGoal({ ...selectedGoal, ...data })
            }
          }}
          setContributionConfig={setContributionConfig}
        />
      ) : (
        <div className="wizard-slide-enter">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1>Gestión de Ahorro</h1>
            <div style={{ display: 'flex', gap: 12 }}>
              {activeTab === 'goals' ? (
                <button className="btn" onClick={() => setShowCreateModal(true)}>
                  <Plus size={16} /> Nueva Hucha
                </button>
              ) : (
                <button className="btn" onClick={() => setAutomationModalConfig({ edit: false })}>
                  <RefreshCcw size={16} /> Programar Traspaso
                </button>
              )}
            </div>
          </div>

          <div className="segmented-control glass-panel" style={{ marginBottom: 32 }}>
            <button className={clsx('segment-item', activeTab === 'goals' && 'active')} onClick={() => setActiveTab('goals')}>
              <PiggyBank size={16} /> Mis Huchas
            </button>
            <button className={clsx('segment-item', activeTab === 'automation' && 'active')} onClick={() => setActiveTab('automation')}>
              <RefreshCcw size={16} /> Automatizaciones
            </button>
          </div>

          {activeTab === 'goals' && (
            <div className="wizard-slide-enter">
              <div className="glass-panel" style={{ 
                padding: '24px 32px', 
                marginBottom: 32, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'linear-gradient(135deg, rgba(126, 145, 177, 0.05), rgba(126, 145, 177, 0.1))'
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Total Ahorrado</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-main)' }}>{formatCurrency(totalSaved)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Metas Activas</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{savingsGoals.length}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                {savingsGoals.map(goal => {
                  const progress = Math.min(100, (goal.currentAmount / (goal.targetAmount || 1)) * 100)
                  const GoalIcon = getIconByName(goal.icon)
                  const goalColor = getGoalColor(goal.id)

                  return (
                    <div key={goal.id} className="glass-panel v5-hover-effect" onClick={() => setSelectedGoalId(goal.id)} style={{ padding: 24, position: 'relative', cursor: 'pointer' }}>
                      <button 
                        className="btn-icon text-danger"
                        onClick={(e) => handleDeleteGoal(goal.id, e)}
                        style={{ position: 'absolute', top: 12, right: 12, zIndex: 10 }}
                      >
                        <Trash2 size={14} />
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                        <div style={{ 
                          padding: 12, 
                          borderRadius: 14, 
                          background: goalColor.gradient, 
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                           <GoalIcon size={24} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{goal.name}</h4>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Meta: {formatCurrency(goal.targetAmount)}</span>
                        </div>
                      </div>

                      {/* Breakdown: Personal vs Yield */}
                      {(() => {
                        const myContributions = (contributions || [])
                          .filter(c => c.goalId === goal.id)
                          .reduce((acc, c) => acc + c.amount, 0)
                        
                        const yieldAmount = Math.max(0, goal.currentAmount - myContributions)
                        const totalVal = goal.currentAmount || 1
                        const personalPctOfCurrent = (myContributions / totalVal) * 100
                        const yieldPctOfCurrent = (yieldAmount / totalVal) * 100

                        return (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                              <span style={{ fontWeight: 700 }}>{formatCurrency(goal.currentAmount)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{progress.toFixed(0)}%</span>
                            </div>
                            
                            {/* Dual Progress Bar (Apple Style) - Fixed scaling */}
                            <div style={{ 
                              width: '100%', 
                              height: 10, 
                              background: 'rgba(0,0,0,0.05)', 
                              borderRadius: 5, 
                              overflow: 'hidden', 
                              marginBottom: 12,
                              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              <div style={{ 
                                width: `${progress}%`, 
                                height: '100%', 
                                display: 'flex',
                                borderRadius: 5,
                                overflow: 'hidden'
                              }}>
                                <div style={{ 
                                  width: `${personalPctOfCurrent}%`, 
                                  height: '100%', 
                                  background: goalColor.main, 
                                  transition: 'width 1s ease',
                                  borderRight: yieldAmount > 0 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                }} />
                                <div style={{ 
                                  width: `${yieldPctOfCurrent}%`, 
                                  height: '100%', 
                                  background: '#6BCB77', 
                                  transition: 'width 1s ease'
                                }} />
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: goalColor.main }} />
                                <span style={{ color: 'var(--text-muted)' }}>Aportado: </span>
                                <span style={{ fontWeight: 700 }}>{formatCurrency(myContributions)}</span>
                              </div>
                              {yieldAmount > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6BCB77' }} />
                                  <span style={{ color: 'var(--text-muted)' }}>Intereses: </span>
                                  <span style={{ fontWeight: 700, color: '#6BCB77' }}>+{formatCurrency(yieldAmount)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      <button 
                        className="btn" 
                        style={{ width: '100%', justifyContent: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setContributionConfig({ goal, mode: 'deposit' })
                        }}
                      >
                        Añadir Ahorro
                      </button>
                    </div>
                  )
                })}

                {savingsGoals.length === 0 && (
                  <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <PiggyBank size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
                    <p>Aún no tienes huchas de ahorro. ¡Crea la primera para empezar!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="wizard-slide-enter">
              <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Origen</th>
                      <th>Destino (Hucha)</th>
                      <th>Importe Mensual</th>
                      <th>Día del Mes</th>
                      <th>Próximo Pago</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recurringTransactions.map(rt => (
                      <tr key={rt.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Wallet size={14} className="text-muted" />
                            <span style={{ fontWeight: 600 }}>{rt.entityName}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <PiggyBank size={14} className="text-accent" />
                            <span style={{ fontWeight: 600 }}>{rt.goalName || 'Sin hucha'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>-{formatCurrency(rt.amount)}</td>
                        <td>Día {rt.dayOfMonth}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <Calendar size={14} />
                            {(() => {
                              const now = new Date()
                              let date = new Date(now.getFullYear(), now.getMonth(), rt.dayOfMonth)
                              if (now.getDate() >= rt.dayOfMonth) {
                                date = new Date(now.getFullYear(), now.getMonth() + 1, rt.dayOfMonth)
                              }
                              return formatDate(date)
                            })()}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn-icon" onClick={() => setAutomationModalConfig({ edit: true, data: rt })}>
                              <Save size={14} />
                            </button>
                            <button className="btn-icon text-danger" onClick={() => deleteRecurringTransaction(rt.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recurringTransactions.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCcw size={40} style={{ opacity: 0.1, marginBottom: 16 }} />
                    <p>No tienes traspasos automáticos configurados.</p>
                    <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => setAutomationModalConfig({ edit: false })}>Programar el primero</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateGoalModal 
          onClose={() => setShowCreateModal(false)}
          onSave={async (data) => {
            await addSavingsGoal(data)
            setShowCreateModal(false)
          }}
        />
      )}

      {automationModalConfig && (
        <CreateAutomationModal 
          editData={automationModalConfig.data}
          entities={entities}
          savingsGoals={savingsGoals}
          categories={categories}
          onClose={() => setAutomationModalConfig(null)}
          onSave={async (data) => {
            if (automationModalConfig.edit) {
              await editRecurringTransaction({ ...automationModalConfig.data, ...data })
            } else {
              const now = new Date()
              let startMonth = now.getMonth()
              let startYear = now.getFullYear()
              
              // Si el día del mes que elegimos ya ha pasado hoy (o es hoy), lo programamos para el mes que viene
              if (now.getDate() >= data.dayOfMonth) {
                startMonth += 1
                if (startMonth > 11) {
                  startMonth = 0
                  startYear += 1
                }
              }
              const startDateStr = new Date(startYear, startMonth, data.dayOfMonth).toISOString().split('T')[0]

              await addRecurringTransaction({
                ...data,
                startDate: startDateStr,
                type: 'gasto'
              })
            }
            setAutomationModalConfig(null)
          }}
        />
      )}

      {contributionConfig && (
        <ContributionModal 
          goal={contributionConfig.goal}
          entities={entities}
          mode={contributionConfig.mode}
          onClose={() => setContributionConfig(null)}
          onSave={async ({ amount, entityId }) => {
            const finalAmount = contributionConfig.mode === 'withdraw' ? -Math.abs(amount) : Math.abs(amount)
            await handleManualContribution({ amount: finalAmount, entityId })
            setContributionConfig(null)
          }}
        />
      )}

      {completedGoal && (
        <CompletionModal 
          goal={completedGoal} 
          onClose={() => setCompletedGoal(null)} 
        />
      )}
    </>
  )
}

function SavingsGoalCalculator({ selectedGoal, onBack, onUpdate, setContributionConfig }) {
  const { recordSavingsContribution } = useData()
  const [targetAmount, setTargetAmount] = useState(selectedGoal.targetAmount || 10000)
  const [initialSavings, setInitialSavings] = useState(selectedGoal.currentAmount || 0)
  const [monthlyContribution, setMonthlyContribution] = useState(selectedGoal.monthlySaving || 200)
  const [deadlineMonths, setDeadlineMonths] = useState(selectedGoal.deadlineMonths || 12)
  const [annualRate, setAnnualRate] = useState(selectedGoal.annualRate || 0)
  const [calcMode, setCalcMode] = useState(selectedGoal.calcMode || 'time')
  const [notes, setNotes] = useState(selectedGoal.notes || '')
  const [contributions, setContributions] = useState([])

  useEffect(() => {
    window.api.getSavingsContributions(selectedGoal.id).then(res => setContributions(res || []))
  }, [selectedGoal.id, selectedGoal.currentAmount])

  const calculatedValues = useMemo(() => {
    const P = initialSavings
    const FV = targetAmount
    const r = annualRate / 100
    const i = r / 12 || 0.00001
    
    if (calcMode === 'time') {
      const C = Math.max(1, monthlyContribution)
      if (P >= FV) return { months: 0, monthly: C }
      const months = Math.log((FV + C/i) / (P + C/i)) / Math.log(1 + i)
      return { months: Math.ceil(months), monthly: C }
    } else {
      const n = Math.max(1, deadlineMonths)
      const pow = Math.pow(1 + i, n)
      const denom = (pow - 1) / i
      const C = Math.max(0, (FV - P * pow) / denom)
      return { months: n, monthly: Math.round(C) }
    }
  }, [calcMode, targetAmount, initialSavings, monthlyContribution, deadlineMonths, annualRate])

  const timelineData = useMemo(() => {
    const months = Math.min(120, calculatedValues.months)
    const i = (annualRate / 100) / 12 || 0.00001
    const C = calculatedValues.monthly
    let current = initialSavings
    const data = []

    for (let m = -6; m <= months; m++) {
      if (m % 3 === 0 || m === months || m === 0) {
        let entry = { label: m === 0 ? 'Hoy' : (m < 0 ? `${Math.abs(m)}m antes` : `${m}m`), projection: null, real: null }
        if (m >= 0) {
          entry.projection = Math.round(current)
          current = (current * (1 + i)) + C
        }
        if (m <= 0) {
          let historicalBalance = selectedGoal.currentAmount
          contributions.forEach(c => {
            const cDate = new Date(c.date)
            const now = new Date()
            const diffMonths = (now.getFullYear() - cDate.getFullYear()) * 12 + (now.getMonth() - cDate.getMonth())
            if (-diffMonths > m) historicalBalance -= c.amount
          })
          entry.real = Math.round(historicalBalance)
        }
        data.push(entry)
      } else if (m > 0) {
        current = (current * (1 + i)) + C
      }
    }
    return data
  }, [initialSavings, calculatedValues, annualRate, targetAmount, contributions, selectedGoal])

  const progressPercent = Math.min(100, (initialSavings / (targetAmount || 1)) * 100)
  const goalColor = getGoalColor(selectedGoal.id)
  const monthsToAdd = isNaN(calculatedValues.months) || !isFinite(calculatedValues.months) ? 0 : calculatedValues.months

  const projectedBreakdown = useMemo(() => {
    if (progressPercent >= 100) return null
    const months = monthsToAdd
    const monthly = calculatedValues.monthly
    const totalPersonal = initialSavings + (monthly * months)
    const totalYield = Math.max(0, targetAmount - totalPersonal)
    return { totalPersonal, totalYield }
  }, [initialSavings, monthsToAdd, calculatedValues, targetAmount, progressPercent])

  const projectedDate = new Date()
  projectedDate.setMonth(projectedDate.getMonth() + (isNaN(monthsToAdd) ? 0 : monthsToAdd))

  return (
    <div className="wizard-slide-enter" style={{ paddingBottom: 60 }}>
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn-secondary" onClick={onBack}><ArrowLeft size={16} /> Volver</button>
          <h2 style={{ margin: 0 }}>{selectedGoal.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" style={{ background: 'var(--success)', color: 'white' }} onClick={() => setContributionConfig({ goal: selectedGoal, mode: 'deposit' })}>
            <Plus size={16} /> Aportar
          </button>
          <button className="btn" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => setContributionConfig({ goal: selectedGoal, mode: 'withdraw' })}>
            <TrendingDown size={16} /> Retirar
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 24 }}>
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}><Target size={18} className="text-accent" /> Configuración</h3>
            <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onUpdate({ targetAmount, monthlySaving: monthlyContribution, deadlineMonths, annualRate, calcMode, notes })}>
              <Save size={14} /> Guardar
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>MODO DE CÁLCULO</label>
              <select value={calcMode} onChange={e => setCalcMode(e.target.value)} style={{ width: '100%' }}>
                <option value="time">¿Cuándo alcanzaré mi meta?</option>
                <option value="contribution">¿Cuánto debo ahorrar al mes?</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>OBJETIVO (€)</label>
              <input type="number" value={targetAmount} onChange={e => setTargetAmount(Number(e.target.value))} />
            </div>

            {calcMode === 'time' ? (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>AHORRO MENSUAL (€)</label>
                <input type="number" value={monthlyContribution} onChange={e => setMonthlyContribution(Number(e.target.value))} />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>PLAZO DESEADO (MESES)</label>
                <input type="number" value={deadlineMonths} onChange={e => setDeadlineMonths(Number(e.target.value))} />
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>RENTABILIDAD ANUAL (%)</label>
              <input type="number" value={annualRate} onChange={e => setAnnualRate(Number(e.target.value))} step="0.1" />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>AHORRO ACTUAL (€)</label>
              <input type="number" value={initialSavings} disabled style={{ opacity: 0.6 }} />
            </div>

            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>NOTAS</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ width: '100%', resize: 'none' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-panel" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0, 113, 227, 0.05), rgba(0, 0, 0, 0.1))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{calcMode === 'time' ? 'Tiempo estimado' : 'Cuota necesaria'}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-main)' }}>
                  {progressPercent >= 100 ? '¡Meta Alcanzada!' : (calcMode === 'time' ? `${calculatedValues.months} meses` : formatCurrency(calculatedValues.monthly))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                  {progressPercent < 100 && (calcMode === 'time' ? `Estimado: ${projectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}` : `Para alcanzar la meta en ${deadlineMonths} meses`)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>PROGRESO</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{progressPercent.toFixed(1)}%</div>
              </div>
            </div>
            <div style={{ width: '100%', height: 12, background: 'var(--border)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: goalColor.gradient, transition: 'width 1s ease' }} />
            </div>

            {projectedBreakdown && annualRate > 0 && (
              <div style={{ 
                marginTop: 20, 
                paddingTop: 16, 
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Resultado al finalizar</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Tus aportaciones:</span>
                  <span style={{ fontWeight: 700 }}>{formatCurrency(projectedBreakdown.totalPersonal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Interés generado:</span>
                  <span style={{ fontWeight: 800, color: '#6BCB77' }}>+{formatCurrency(projectedBreakdown.totalYield)}</span>
                </div>
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 10, 
                  background: 'rgba(107, 203, 119, 0.1)', 
                  color: '#6BCB77', 
                  padding: '6px 10px', 
                  borderRadius: 6,
                  textAlign: 'center',
                  fontWeight: 600
                }}>
                  ¡El interés cubrirá el {( (projectedBreakdown.totalYield / targetAmount) * 100).toFixed(1)}% de tu meta!
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel" style={{ padding: 24, height: 300 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Trayectoria Proyectada</h4>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="label" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} />
                <RechartsTooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="projection" name="Proyección" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.05} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="real" name="Real" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} />
                <ReferenceLine y={targetAmount} stroke="var(--success)" strokeDasharray="3 3" label={{ position: 'right', value: 'META', fill: 'var(--success)', fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: 24, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Clock size={18} className="text-muted" />
          <h4 style={{ margin: 0 }}>Historial de Movimientos</h4>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th style={{ textAlign: 'right' }}>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {contributions.map((c, i) => (
              <tr key={i}>
                <td>{formatDate(c.date)}</td>
                <td>
                  <span style={{ 
                    padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                    background: c.amount > 0 ? 'rgba(129, 199, 132, 0.1)' : 'rgba(214, 61, 61, 0.1)',
                    color: c.amount > 0 ? 'var(--success)' : 'var(--danger)'
                  }}>
                    {c.amount > 0 ? 'APORTACIÓN' : 'RETIRADA'}
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: c.amount > 0 ? 'inherit' : 'var(--danger)' }}>
                  {formatCurrency(c.amount)}
                </td>
              </tr>
            ))}
            {contributions.length === 0 && (
              <tr>
                <td colSpan="3" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No hay movimientos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CreateGoalModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [initial, setInitial] = useState('')
  const [icon, setIcon] = useState('PiggyBank')

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: 450, padding: 32, background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Nueva Hucha</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Nombre del Objetivo</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Viaje, Coche..." />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Meta (€)</label>
              <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0.00" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Ahorro Inicial (€)</label>
              <input type="number" value={initial} onChange={e => setInitial(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'block' }}>Elegir Icono</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {ICONS.map(i => {
                const IconComp = i.icon
                return (
                  <div 
                    key={i.id} 
                    onClick={() => setIcon(i.id)}
                    style={{ 
                      padding: 12, 
                      borderRadius: 10, 
                      background: icon === i.id ? 'var(--accent)' : 'var(--border)', 
                      color: icon === i.id ? 'white' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    <IconComp size={20} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <button 
          className="btn" 
          style={{ width: '100%', height: 45, justifyContent: 'center' }} 
          onClick={() => onSave({ name, targetAmount: Number(target), initialAmount: Number(initial), icon })}
          disabled={!name || !target}
        >
          Crear Hucha
        </button>
      </div>
    </div>
  )
}

function CreateAutomationModal({ onClose, onSave, entities, savingsGoals, categories, editData }) {
  const [entityId, setEntityId] = useState(editData?.entityId || '')
  const [goalId, setGoalId] = useState(editData?.goalId || '')
  const [amount, setAmount] = useState(editData?.amount || '')
  const [dayOfMonth, setDayOfMonth] = useState(editData?.dayOfMonth || 1)
  const [duration, setDuration] = useState(12)
  const [active, setActive] = useState(editData?.active ?? 1)

  const finanzasCat = categories.find(c => c.name === 'Finanzas')
  const ahorroSub = finanzasCat?.subcategories.find(s => s.name === 'Ahorro')

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel" style={{ width: 500, padding: 32, background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>{editData ? 'Editar Traspaso' : 'Programar Traspaso'}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Cuenta de Origen</label>
            <select value={entityId} onChange={e => setEntityId(e.target.value)} required>
              <option value="">Seleccionar cuenta...</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({formatCurrency(e.balance)})</option>)}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <ArrowRight size={14} className="text-accent" />
              <label style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Hucha de Destino</label>
            </div>
            <select value={goalId} onChange={e => setGoalId(e.target.value)} required>
              <option value="">Seleccionar hucha...</option>
              {savingsGoals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Importe Mensual (€)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Día del Mes</label>
            <input type="number" min="1" max="28" value={dayOfMonth} onChange={e => setDayOfMonth(e.target.value)} />
          </div>

          {!editData && (
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Duración (meses)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
          )}

          {editData && (
            <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={active === 1} onChange={e => setActive(e.target.checked ? 1 : 0)} style={{ width: 'auto' }} />
              <label style={{ fontSize: 12 }}>Automatización activa</label>
            </div>
          )}
        </div>

        <button 
          className="btn" 
          style={{ width: '100%', height: 45, justifyContent: 'center' }} 
          onClick={() => onSave({ 
            entityId: parseInt(entityId), 
            goalId: parseInt(goalId), 
            amount: parseFloat(amount), 
            dayOfMonth: parseInt(dayOfMonth),
            categoryId: finanzasCat?.id,
            subcategoryId: ahorroSub?.id,
            startDate: editData?.startDate || new Date().toISOString().split('T')[0],
            endDate: editData?.endDate || new Date(new Date().setMonth(new Date().getMonth() + parseInt(duration))).toISOString().split('T')[0],
            active
          })}
          disabled={!entityId || !goalId || !amount}
        >
          {editData ? 'Guardar Cambios' : 'Confirmar Automatización'}
        </button>
      </div>
    </div>
  )
}

function ContributionModal({ goal, entities, mode, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [entityId, setEntityId] = useState('')

  const isWithdraw = mode === 'withdraw'

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel animate-scaleIn" style={{ width: 400, padding: 32, background: 'var(--bg-color)', textAlign: 'center' }}>
        <h3 style={{ marginBottom: 8, color: isWithdraw ? 'var(--danger)' : 'var(--success)' }}>
          {isWithdraw ? 'Retirar Ahorro' : 'Añadir Ahorro'}
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{goal.name}</p>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textAlign: 'left', marginBottom: 4 }}>
            {isWithdraw ? 'CUENTA DE DESTINO (OPCIONAL)' : 'CUENTA DE ORIGEN (OPCIONAL)'}
          </label>
          <select value={entityId} onChange={e => setEntityId(e.target.value)}>
            <option value="">Solo registro (sin afectar saldo)</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name} ({formatCurrency(e.balance)})</option>)}
          </select>
          {entityId && <p style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4, textAlign: 'left' }}>
            {isWithdraw ? 'Se sumará al saldo de la cuenta.' : 'Se restará del saldo de la cuenta.'}
          </p>}
        </div>

        <div style={{ marginBottom: 32 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textAlign: 'left', marginBottom: 4 }}>CANTIDAD (€)</label>
          <input 
            autoFocus
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            style={{ fontSize: 32, fontWeight: 800, textAlign: 'center', color: isWithdraw ? 'var(--danger)' : 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button 
            className="btn" 
            style={{ flex: 1, justifyContent: 'center', background: isWithdraw ? 'var(--danger)' : 'var(--accent)', color: 'white' }} 
            onClick={() => onSave({ amount: Number(amount), entityId })} 
            disabled={!amount}
          >
            {isWithdraw ? 'Retirar' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CompletionModal({ goal, onClose }) {
  const goalColor = getGoalColor(goal.id)
  const GoalIcon = getIconByName(goal.icon)

  return (
    <div className="modal-completion-overlay">
      <div className="modal-completion-content">
        <CelebrationParticles />
        
        <div className="completion-icon-wrapper" style={{ background: goalColor.gradient }}>
          <GoalIcon size={40} />
        </div>
        
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 12, color: 'var(--text-main)' }}>
          ¡Meta Alcanzada!
        </h2>
        
        <p style={{ fontSize: 18, color: 'var(--text-muted)', marginBottom: 32, lineHeight: 1.5 }}>
          Enhorabuena, has completado tu objetivo de ahorro para <strong style={{ color: 'var(--text-main)' }}>{goal.name}</strong>.
        </p>

        <div style={{ 
          background: 'rgba(0,0,0,0.03)', 
          padding: '24px', 
          borderRadius: 20, 
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>Total Ahorrado</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{formatCurrency(goal.currentAmount)}</div>
          </div>
        </div>

        <button 
          className="btn" 
          style={{ width: '100%', height: 50, justifyContent: 'center', fontSize: 16, fontWeight: 700 }} 
          onClick={onClose}
        >
          ¡Genial!
        </button>
      </div>
    </div>
  )
}

function CelebrationParticles() {
  const particles = Array.from({ length: 40 })
  const colors = ['#7E91B1', '#9CAF9C', '#D18B8B', '#A29BBD', '#BFA89A', '#FFD700', '#FF69B4']

  return (
    <>
      {particles.map((_, i) => (
        <div 
          key={i}
          className="celebration-particle"
          style={{
            left: `${Math.random() * 100}vw`,
            background: colors[Math.floor(Math.random() * colors.length)],
            width: `${Math.random() * 8 + 4}px`,
            height: `${Math.random() * 8 + 4}px`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${Math.random() * 2 + 2}s`
          }}
        />
      ))}
    </>
  )
}
