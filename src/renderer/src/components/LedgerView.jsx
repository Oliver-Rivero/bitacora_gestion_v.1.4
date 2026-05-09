import React, { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Plus, Search, FileDown, Upload, Trash2, Bell, AlertCircle, Pencil, X } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/formatters'
import { clsx } from 'clsx'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import RecurringView from './RecurringView'

export default function LedgerView() {
  const { 
    transactions, 
    entities, 
    categories, 
    addTransaction, 
    createReminder, 
    savingsGoals, 
    addRecurringTransaction,
    editTransaction,
    ledgerFormRequested,
    setLedgerFormRequested
  } = useData()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  
  // Filtro de fecha
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [quickFilter, setQuickFilter] = useState('all') // 'all', 'thisMonth', 'lastMonth', 'custom'

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [activeTab, setActiveTab] = useState('table') // 'table' | 'import' | 'reports'

  // Respond to quick add request
  React.useEffect(() => {
    if (ledgerFormRequested) {
      setShowAddModal(true)
      setLedgerFormRequested(false)
    }
  }, [ledgerFormRequested])

  const initialFormState = {
    date: new Date().toISOString().split('T')[0],
    type: 'gasto',
    amount: '',
    categoryId: '',
    subcategoryId: '',
    entityId: '',
    toEntityId: '',
    tags: '',
    note: '',
    addReminder: false,
    reminderDate: '',
    goalId: '',
    isRecurring: false,
    recurringDay: new Date().getDate()
  }

  // Form state
  const [formData, setFormData] = useState(initialFormState)

  const resetForm = () => {
    setFormData(initialFormState)
    setEditingId(null)
  }

  const openEditModal = (t) => {
    setEditingId(t.id)
    setFormData({
      date: t.date,
      type: t.type,
      amount: t.amount.toString(),
      categoryId: t.categoryId?.toString() || '',
      subcategoryId: t.subcategoryId?.toString() || '',
      entityId: t.entityId.toString(),
      toEntityId: t.toEntityId?.toString() || '',
      tags: t.tags || '',
      note: t.note || '',
      addReminder: false,
      reminderDate: '',
      goalId: t.goalId?.toString() || '',
      isRecurring: false,
      recurringDay: new Date().getDate()
    })
    setShowAddModal(true)
  }

  const applyQuickFilter = (type) => {
    setQuickFilter(type)
    const now = new Date()
    if (type === 'all') {
      setDateRange({ start: '', end: '' })
    } else if (type === 'thisMonth') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
      setDateRange({ start, end })
    } else if (type === 'lastMonth') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      setDateRange({ start, end })
    }
  }

  // Pre-fill most frequent values when opening modal or changing type
  React.useEffect(() => {
    if (showAddModal) {
      const typeTransactions = transactions.filter(t => t.type === formData.type)
      
      if (typeTransactions.length === 0) return

      const getMostFrequent = (key, data = typeTransactions) => {
        const counts = {}
        data.forEach(t => {
          if (t[key]) counts[t[key]] = (counts[t[key]] || 0) + 1
        })
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
        return entries.length > 0 ? entries[0][0] : ''
      }

      const mostFreqEntity = getMostFrequent('entityId')
      const mostFreqCategory = getMostFrequent('categoryId')
      
      // Get most frequent subcategory FOR that category
      const subTransactions = typeTransactions.filter(t => t.categoryId == mostFreqCategory)
      const mostFreqSubcategory = getMostFrequent('subcategoryId', subTransactions)

      setFormData(prev => ({
        ...prev,
        entityId: prev.entityId || mostFreqEntity,
        categoryId: prev.categoryId || mostFreqCategory,
        subcategoryId: prev.subcategoryId || mostFreqSubcategory
      }))
    }
  }, [showAddModal, formData.type])

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        (t.note?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.categoryName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.subcategoryName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.tags?.toLowerCase() || '').includes(search.toLowerCase())
      
      const matchesType = filterType === 'all' || t.type === filterType

      // Filtro de fecha
      let matchesDate = true
      if (dateRange.start && t.date < dateRange.start) matchesDate = false
      if (dateRange.end && t.date > dateRange.end) matchesDate = false
      
      return matchesSearch && matchesType && matchesDate
    })
  }, [transactions, search, filterType, dateRange])

  const handleAdd = async (e) => {
    e.preventDefault()
    const txn = {
      ...formData,
      amount: parseFloat(formData.amount),
      categoryId: parseInt(formData.categoryId),
      subcategoryId: formData.subcategoryId ? parseInt(formData.subcategoryId) : null,
      entityId: parseInt(formData.entityId),
      toEntityId: formData.toEntityId ? parseInt(formData.toEntityId) : null,
      goalId: formData.goalId ? parseInt(formData.goalId) : null
    }
    
    if (formData.addReminder && formData.reminderDate) {
      await createReminder({
        title: `Recordatorio: ${formData.note || 'Gasto/Ingreso'}`,
        dueDate: formData.reminderDate
      })
    }

    if (editingId) {
      await editTransaction({ ...txn, id: editingId })
    } else {
      await addTransaction(txn)
      
      if (formData.isRecurring && formData.type !== 'transferencia') {
        const todayDateStr = new Date().toISOString().split('T')[0]
        await addRecurringTransaction({
          entityId: txn.entityId,
          goalId: txn.goalId,
          amount: txn.amount,
          categoryId: txn.categoryId,
          subcategoryId: txn.subcategoryId,
          dayOfMonth: parseInt(formData.recurringDay),
          startDate: formData.date,
          type: formData.type,
          note: formData.note,
          lastProcessedDate: todayDateStr
        })
      }
    }

    setShowAddModal(false)
    resetForm()
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.text('Libro Mayor - Bitácora Gestión', 14, 15)
    
    const tableData = filteredTransactions.map(t => [
      t.date,
      t.type.toUpperCase(),
      formatCurrency(t.amount),
      t.categoryName || '-',
      t.subcategoryName || '-',
      t.entityName || '-',
      t.note || ''
    ])

    doc.autoTable({
      head: [['Fecha', 'Tipo', 'Importe', 'Categoría', 'Subcategoría', 'Entidad', 'Nota']],
      body: tableData,
      startY: 20
    })
    doc.save('informe_finanzas.pdf')
  }

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones')
    XLSX.writeFile(wb, 'informe_finanzas.xlsx')
  }

  const handleImportCSV = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = async (evt) => {
      const bstr = evt.target.result
      const wb = XLSX.read(bstr, { type: 'binary' })
      const wsname = wb.SheetNames[0]
      const ws = wb.Sheets[wsname]
      const data = XLSX.utils.sheet_to_json(ws)
      
      for (const item of data) {
        // Basic mapping logic (needs to be adjusted based on user CSV format)
        await addTransaction({
          date: item.Fecha || new Date().toISOString().split('T')[0],
          type: item.Tipo?.toLowerCase() || 'gasto',
          amount: parseFloat(item.Importe) || 0,
          categoryId: item.CategoryId || null,
          entityId: item.EntityId || entities[0]?.id,
          note: item.Nota || ''
        })
      }
    }
    reader.readAsBinaryString(file)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>Libro Mayor</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Añadir Registro
          </button>
        </div>
      </div>

      <div className="segmented-control glass-panel">
        <button 
          className={clsx('segment-item', activeTab === 'table' && 'active')} 
          onClick={() => setActiveTab('table')}
        >
          Registros
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'import' && 'active')} 
          onClick={() => setActiveTab('import')}
        >
          Importar CSV
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'recurring' && 'active')} 
          onClick={() => setActiveTab('recurring')}
        >
          Recurrentes
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'reports' && 'active')} 
          onClick={() => setActiveTab('reports')}
        >
          Informes
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0px', marginBottom: 24, overflow: 'hidden' }}>

        <div style={{ padding: '20px' }}>
          {activeTab === 'table' && (
            <>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar por nota, categoría, etiquetas..." 
                    style={{ paddingLeft: 40 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select style={{ width: 150 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                  <option value="all">Todos los tipos</option>
                  <option value="gasto">Gastos</option>
                  <option value="ingreso">Ingresos</option>
                  <option value="transferencia">Transferencias</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <div className="segmented-control" style={{ marginBottom: 0, padding: 4 }}>
                  <button className={clsx('segment-item', quickFilter === 'all' && 'active')} style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => applyQuickFilter('all')}>Todo</button>
                  <button className={clsx('segment-item', quickFilter === 'thisMonth' && 'active')} style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => applyQuickFilter('thisMonth')}>Este Mes</button>
                  <button className={clsx('segment-item', quickFilter === 'lastMonth' && 'active')} style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => applyQuickFilter('lastMonth')}>Mes Pasado</button>
                  <button className={clsx('segment-item', quickFilter === 'custom' && 'active')} style={{ fontSize: 11, padding: '4px 12px' }} onClick={() => setQuickFilter('custom')}>Personalizado</button>
                </div>

                {quickFilter === 'custom' && (
                  <div className="wizard-slide-enter" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input 
                      type="date" 
                      style={{ padding: '4px 8px', fontSize: 12, width: 130 }} 
                      value={dateRange.start} 
                      onChange={e => setDateRange({...dateRange, start: e.target.value})} 
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>a</span>
                    <input 
                      type="date" 
                      style={{ padding: '4px 8px', fontSize: 12, width: 130 }} 
                      value={dateRange.end} 
                      onChange={e => setDateRange({...dateRange, end: e.target.value})} 
                    />
                  </div>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Entidad</th>
                    <th>Importe</th>
                    <th>Nota</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{formatDate(t.date)}</td>
                      <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: 12, 
                          fontSize: 10, 
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          background: t.type === 'ingreso' ? 'rgba(108,165,123,0.1)' : t.type === 'gasto' ? 'rgba(192,104,104,0.1)' : 'rgba(126,145,177,0.1)',
                          color: t.type === 'ingreso' ? 'var(--success)' : t.type === 'gasto' ? 'var(--danger)' : 'var(--accent)'
                        }}>
                          {t.type}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{t.categoryName || '-'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.subcategoryName || ''}</div>
                      </td>
                      <td>{t.entityName} {t.toEntityName && `→ ${t.toEntityName}`}</td>
                      <td style={{ fontWeight: 600, color: t.type === 'ingreso' ? 'var(--success)' : t.type === 'gasto' ? 'var(--danger)' : 'inherit' }}>
                        {t.type === 'gasto' ? '-' : t.type === 'ingreso' ? '+' : ''} {formatCurrency(t.amount)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn-secondary" style={{ padding: 6, marginRight: 8 }} onClick={() => openEditModal(t)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn-secondary" style={{ padding: 6 }} onClick={() => {
                          if (confirm('¿Estás seguro de eliminar este registro?')) {
                            deleteTransaction(t.id)
                          }
                        }}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {activeTab === 'import' && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Upload size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
              <h3>Cargar Registros CSV</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Sube un archivo Excel o CSV para importar transacciones en bloque.</p>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImportCSV} style={{ display: 'none' }} id="csv-upload" />
              <label htmlFor="csv-upload" className="btn">Seleccionar Archivo</label>
            </div>
          )}

          {activeTab === 'reports' && (
            <div style={{ display: 'flex', gap: 24 }}>
              <div className="glass-panel" style={{ flex: 1, padding: 24, textAlign: 'center' }}>
                <FileDown size={32} style={{ color: 'var(--danger)', marginBottom: 16 }} />
                <h3>Exportar PDF</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Genera un informe profesional con los registros actuales.</p>
                <button className="btn" onClick={exportPDF}>Descargar PDF</button>
              </div>
              <div className="glass-panel" style={{ flex: 1, padding: 24, textAlign: 'center' }}>
                <FileDown size={32} style={{ color: 'var(--success)', marginBottom: 16 }} />
                <h3>Exportar Excel</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Descarga todos los datos en formato compatible con Excel.</p>
                <button className="btn" onClick={exportCSV}>Descargar Excel</button>
              </div>
            </div>
          )}

          {activeTab === 'recurring' && <RecurringView />}
        </div>
      </div>

      {/* Add Modal - Simplified implementation for brevity */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 550, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ marginBottom: 0 }}>{editingId ? 'Editar Registro' : 'Nuevo Registro'}</h2>
              <button className="btn-icon" onClick={() => {
                setShowAddModal(false)
                resetForm()
              }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fecha</label>
                  <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Importe</label>
                  <input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Entidad</label>
                  <select value={formData.entityId} onChange={e => setFormData({...formData, entityId: e.target.value})} required>
                    <option value="">Seleccionar...</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>

              {formData.type === 'transferencia' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Entidad Destino</label>
                  <select value={formData.toEntityId} onChange={e => setFormData({...formData, toEntityId: e.target.value})} required>
                    <option value="">Seleccionar...</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              )}

              {formData.type !== 'transferencia' && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Categoría</label>
                    <select 
                      value={formData.categoryId} 
                      onChange={e => {
                        const newCatId = e.target.value
                        const typeTransactions = transactions.filter(t => t.type === formData.type && t.categoryId == newCatId)
                        
                        const counts = {}
                        typeTransactions.forEach(t => {
                          if (t.subcategoryId) counts[t.subcategoryId] = (counts[t.subcategoryId] || 0) + 1
                        })
                        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
                        const mostFreqSub = entries.length > 0 ? entries[0][0] : ''
                        
                        setFormData({...formData, categoryId: newCatId, subcategoryId: mostFreqSub})
                      }} 
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {categories.filter(c => c.type === formData.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subcategoría</label>
                    <select value={formData.subcategoryId} onChange={e => setFormData({...formData, subcategoryId: e.target.value})}>
                      <option value="">Seleccionar...</option>
                      {categories.find(c => c.id == formData.categoryId)?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {formData.type === 'gasto' && (
                (() => {
                  const sub = categories.find(c => c.id == formData.categoryId)?.subcategories.find(s => s.id == formData.subcategoryId)
                  const isAhorro = sub?.name === 'Ahorro'
                  
                  if (isAhorro) {
                    return (
                      <div className="wizard-slide-enter" style={{ padding: '16px', background: 'rgba(126, 145, 177, 0.05)', borderRadius: 12, border: '1px solid var(--accent)' }}>
                        <label style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Vincular con Hucha</label>
                        <select 
                          value={formData.goalId} 
                          onChange={e => setFormData({...formData, goalId: e.target.value})}
                          style={{ border: '1px solid var(--accent)' }}
                        >
                          <option value="">Ninguna hucha seleccionada</option>
                          {savingsGoals.map(g => <option key={g.id} value={g.id}>{g.name} ({formatCurrency(g.currentAmount)})</option>)}
                        </select>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8 }}>Este gasto se sumará automáticamente al saldo de la hucha elegida.</p>
                      </div>
                    )
                  }
                  return null
                })()
              )}

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nota</label>
                <input type="text" placeholder="Concepto..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 10 }}>
                <input 
                  type="checkbox" 
                  style={{ width: 'auto' }} 
                  checked={formData.addReminder} 
                  onChange={e => setFormData({...formData, addReminder: e.target.checked})} 
                />
                <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bell size={14} /> Añadir recordatorio en Apple Reminders
                </label>
              </div>

              {formData.type !== 'transferencia' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: 'rgba(0,0,0,0.03)', borderRadius: 10, marginTop: -4 }}>
                  <input 
                    type="checkbox" 
                    style={{ width: 'auto' }} 
                    checked={formData.isRecurring} 
                    onChange={e => setFormData({...formData, isRecurring: e.target.checked})} 
                  />
                  <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                     Operación recurrente (Mensual)
                  </label>
                </div>
              )}

              {formData.isRecurring && formData.type !== 'transferencia' && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Día del mes para recurrencia</label>
                  <input type="number" min="1" max="31" value={formData.recurringDay} onChange={e => setFormData({...formData, recurringDay: e.target.value})} required />
                </div>
              )}

              {formData.addReminder && (
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fecha del recordatorio</label>
                  <input type="datetime-local" value={formData.reminderDate} onChange={e => setFormData({...formData, reminderDate: e.target.value})} required />
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => {
                  setShowAddModal(false)
                  resetForm()
                }}>Cancelar</button>
                <button type="submit" className="btn" style={{ flex: 1 }}>{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
