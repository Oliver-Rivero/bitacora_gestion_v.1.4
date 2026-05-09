import React, { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'
import { Trash2, Edit, CheckCircle, XCircle, Search, Save, AlertCircle } from 'lucide-react'
import { formatCurrency } from '../utils/formatters'
import { clsx } from 'clsx'

export default function RecurringView() {
  const { recurringTransactions, entities, categories, savingsGoals, editRecurringTransaction, deleteRecurringTransaction } = useData()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState(null)

  const filteredTransactions = useMemo(() => {
    return recurringTransactions.filter(t => {
      const typeStr = t.type || 'gasto'
      const matchesSearch = 
        (t.note?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.categoryName?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (t.subcategoryName?.toLowerCase() || '').includes(search.toLowerCase())
      
      const matchesType = filterType === 'all' || typeStr === filterType
      
      return matchesSearch && matchesType
    })
  }, [recurringTransactions, search, filterType])

  const openEdit = (item) => {
    setFormData({
      ...item,
      type: item.type || 'gasto',
      note: item.note || ''
    })
    setShowEditModal(true)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    await editRecurringTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      categoryId: parseInt(formData.categoryId),
      subcategoryId: formData.subcategoryId ? parseInt(formData.subcategoryId) : null,
      entityId: parseInt(formData.entityId),
      goalId: formData.goalId ? parseInt(formData.goalId) : null,
      dayOfMonth: parseInt(formData.dayOfMonth),
      active: formData.active ? 1 : 0
    })
    setShowEditModal(false)
  }

  const toggleActive = async (item) => {
    await editRecurringTransaction({
      ...item,
      active: item.active ? 0 : 1
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar por nota, categoría..." 
                style={{ paddingLeft: 40 }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select style={{ width: 150 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">Todos</option>
              <option value="gasto">Gastos</option>
              <option value="ingreso">Ingresos</option>
            </select>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Día</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Entidad</th>
                <th>Importe</th>
                <th>Nota</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No hay operaciones recurrentes configuradas.<br/>
                    Puedes crearlas desde el Libro Mayor marcando la casilla "Operación recurrente".
                  </td>
                </tr>
              )}
              {filteredTransactions.map(t => (
                <tr key={t.id} style={{ opacity: t.active ? 1 : 0.6 }}>
                  <td><div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(126,145,177,0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 13 }}>{t.dayOfMonth}</div></td>
                  <td>
                    <span style={{ 
                      padding: '2px 8px', 
                      borderRadius: 12, 
                      fontSize: 10, 
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      background: (t.type || 'gasto') === 'ingreso' ? 'rgba(108,165,123,0.1)' : 'rgba(192,104,104,0.1)',
                      color: (t.type || 'gasto') === 'ingreso' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {t.type || 'gasto'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{t.categoryName || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.subcategoryName || ''}</div>
                  </td>
                  <td>{t.entityName}</td>
                  <td style={{ fontWeight: 600, color: (t.type || 'gasto') === 'ingreso' ? 'var(--success)' : 'var(--danger)' }}>
                    {(t.type || 'gasto') === 'gasto' ? '-' : '+'} {formatCurrency(t.amount)}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.note || `Automático: Día ${t.dayOfMonth}`}</td>
                  <td>
                    <button 
                      onClick={() => toggleActive(t)}
                      style={{ 
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        color: t.active ? 'var(--success)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
                      }}
                    >
                      {t.active ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      {t.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button className="btn-secondary" style={{ padding: 6 }} onClick={() => openEdit(t)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn-secondary" style={{ padding: 6 }} onClick={() => deleteRecurringTransaction(t.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

      {showEditModal && formData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 550, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ marginBottom: 0 }}>Editar Operación Recurrente</h2>
              <button className="btn-icon" onClick={() => setShowEditModal(false)}>
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Día del Mes</label>
                  <input type="number" min="1" max="31" value={formData.dayOfMonth} onChange={e => setFormData({...formData, dayOfMonth: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tipo</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Importe</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Entidad</label>
                  <select value={formData.entityId} onChange={e => setFormData({...formData, entityId: e.target.value})} required>
                    <option value="">Seleccionar...</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Categoría</label>
                  <select 
                    value={formData.categoryId} 
                    onChange={e => setFormData({...formData, categoryId: e.target.value, subcategoryId: ''})} 
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {categories.filter(c => c.type === formData.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Subcategoría</label>
                  <select value={formData.subcategoryId || ''} onChange={e => setFormData({...formData, subcategoryId: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    {categories.find(c => c.id == formData.categoryId)?.subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              {formData.type === 'gasto' && (
                (() => {
                  const sub = categories.find(c => c.id == formData.categoryId)?.subcategories.find(s => s.id == formData.subcategoryId)
                  const isAhorro = sub?.name === 'Ahorro'
                  
                  if (isAhorro) {
                    return (
                      <div style={{ padding: '16px', background: 'rgba(126, 145, 177, 0.05)', borderRadius: 12, border: '1px solid var(--accent)' }}>
                        <label style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Vincular con Hucha</label>
                        <select 
                          value={formData.goalId || ''} 
                          onChange={e => setFormData({...formData, goalId: e.target.value})}
                          style={{ border: '1px solid var(--accent)' }}
                        >
                          <option value="">Ninguna hucha seleccionada</option>
                          {savingsGoals.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
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

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>Cancelar</button>
                <button type="submit" className="btn" style={{ flex: 1 }}><Save size={16}/> Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
