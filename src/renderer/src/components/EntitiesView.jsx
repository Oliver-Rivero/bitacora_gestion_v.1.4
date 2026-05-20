import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useData } from '../context/DataContext'
import { Building2, TrendingUp, TrendingDown, AlertCircle, Edit2, Globe, Trash2, Plus, X } from 'lucide-react'
import { formatCurrency, getLogoUrl } from '../utils/formatters'
import { clsx } from 'clsx'

export default function EntitiesView() {
  const { entities, transactions, editEntity } = useData()
  const [selectedEntityId, setSelectedEntityId] = useState(null)
  const [showEditModal, setShowEditModal] = useState(false)
  
  // Note-related states
  const [notes, setNotes] = useState([])
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteContent, setEditingNoteContent] = useState('')

  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id)
    }
  }, [entities, selectedEntityId])

  const selectedEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId)
  }, [entities, selectedEntityId])

  const fetchNotes = useCallback(async () => {
    if (selectedEntityId) {
      const res = await window.api.getEntityNotes(selectedEntityId)
      setNotes(res || [])
    }
  }, [selectedEntityId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  const entityTransactions = useMemo(() => {
    if (!selectedEntity) return []
    return transactions.filter(t => 
      t.entityId === selectedEntity.id || t.toEntityId === selectedEntity.id
    )
  }, [transactions, selectedEntity])

  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !selectedEntityId) return
    await window.api.addEntityNote({
      entityId: selectedEntityId,
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString()
    })
    setNewNoteContent('')
    fetchNotes()
  }

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id)
    setEditingNoteContent(note.content)
  }

  const handleSaveNote = async (id) => {
    if (!editingNoteContent.trim()) return
    await window.api.editEntityNote({
      id,
      content: editingNoteContent.trim()
    })
    setEditingNoteId(null)
    setEditingNoteContent('')
    fetchNotes()
  }

  const handleDeleteNote = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta nota de gestión?')) {
      await window.api.deleteEntityNote(id)
      fetchNotes()
    }
  }

  return (
    <div>
      <h1>Entidades</h1>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Sidebar for Entities */}
        <div className="glass-panel" style={{ width: 300, padding: 12, height: 'fit-content' }}>
          {entities.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No hay entidades. Añade una en Configuración.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {entities.map(entity => (
                <div 
                  key={entity.id}
                  onClick={() => setSelectedEntityId(entity.id)}
                  className={clsx('entity-list-item', selectedEntityId === entity.id && 'active')}
                >
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    borderRadius: 8, 
                    background: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {getLogoUrl(entity.url) ? (
                      <img src={getLogoUrl(entity.url)} alt={entity.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Building2 size={16} color="var(--text-muted)" />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entity.name}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>{formatCurrency(entity.balance)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail View */}
        <div style={{ flex: 1 }}>
          {selectedEntity ? (
            <div className="glass-panel" style={{ padding: 32 }}>
              
              {/* Header Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ 
                    width: 64, 
                    height: 64, 
                    borderRadius: 16, 
                    background: 'white', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: 'var(--glass-shadow)',
                    flexShrink: 0
                  }}>
                    {getLogoUrl(selectedEntity.url) ? (
                      <img src={getLogoUrl(selectedEntity.url)} alt={selectedEntity.name} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                    ) : (
                      <Building2 size={32} color="var(--text-muted)" />
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h2 style={{ margin: 0, fontSize: 24 }}>{selectedEntity.name}</h2>
                      <button 
                        className="btn-secondary" 
                        onClick={() => setShowEditModal(true)}
                        style={{ padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, height: 'auto', border: '1px solid var(--border)' }}
                        title="Editar Entidad"
                      >
                        <Edit2 size={13} />
                        Editar
                      </button>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      {selectedEntity.url ? (
                        <>
                          <Globe size={14} />
                          <a href={`https://${selectedEntity.url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                            {selectedEntity.url}
                          </a>
                        </>
                      ) : (
                        <span>Sin sitio web</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Balance Actual</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(selectedEntity.balance)}</div>
                </div>
              </div>

              {/* Grid: Movements & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 32 }}>
                
                {/* Left Column: Movements */}
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 16 }}>Últimos Movimientos</h3>
                  {entityTransactions.length === 0 ? (
                    <div className="empty-state" style={{ minHeight: 200 }}>
                      <AlertCircle size={40} opacity={0.3} />
                      <p>No hay movimientos registrados para esta entidad.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Importe</th>
                          <th>Concepto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entityTransactions.slice(0, 20).map(t => (
                          <tr key={t.id}>
                            <td>{t.date}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                                {t.type === 'ingreso' ? <TrendingUp size={14} color="var(--success)" /> : <TrendingDown size={14} color="var(--danger)" />}
                                {t.type.toUpperCase()}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, color: t.type === 'ingreso' ? 'var(--success)' : (t.type === 'gasto' || t.entityId === selectedEntity.id ? 'var(--danger)' : 'var(--success)') }}>
                              {t.type === 'transferencia' ? (t.entityId === selectedEntity.id ? '-' : '+') : (t.type === 'gasto' ? '-' : '+')} {formatCurrency(t.amount)}
                            </td>
                            <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Right Column: Notes */}
                <div>
                  <h3 style={{ marginTop: 0, marginBottom: 16 }}>Notas de Gestión</h3>
                  
                  {/* Add Note Form */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                    <input 
                      placeholder="Nueva nota de gestión..." 
                      value={newNoteContent} 
                      onChange={e => setNewNoteContent(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleAddNote()
                        }
                      }}
                      style={{ flex: 1, height: 38 }}
                    />
                    <button className="btn" style={{ height: 38, padding: '0 16px' }} onClick={handleAddNote}>
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Notes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 450, overflowY: 'auto', paddingRight: 4 }}>
                    {notes.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>
                        No hay notas de gestión. Añade la primera arriba.
                      </div>
                    ) : (
                      notes.map(note => (
                        <div 
                          key={note.id} 
                          className="glass-panel" 
                          style={{ 
                            padding: 12, 
                            position: 'relative', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 8,
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border)'
                          }}
                        >
                          {editingNoteId === note.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              <textarea 
                                value={editingNoteContent} 
                                onChange={e => setEditingNoteContent(e.target.value)}
                                style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 8, fontSize: 13, resize: 'none' }}
                                autoFocus
                              />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button 
                                  className="btn-secondary" 
                                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }} 
                                  onClick={() => setEditingNoteId(null)}
                                >
                                  Cancelar
                                </button>
                                <button 
                                  className="btn" 
                                  style={{ padding: '4px 10px', fontSize: 11, borderRadius: 6 }} 
                                  onClick={() => handleSaveNote(note.id)}
                                >
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text-main)' }}>
                                {note.content}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                  {new Date(note.createdAt).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button 
                                    className="btn-icon-subtle" 
                                    onClick={() => handleStartEditNote(note)}
                                    title="Editar nota"
                                    style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button 
                                    className="btn-icon-subtle" 
                                    onClick={() => handleDeleteNote(note.id)}
                                    title="Eliminar nota"
                                    style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="glass-panel empty-state" style={{ minHeight: 300 }}>
              <Building2 size={48} style={{ opacity: 0.3 }} />
              <h3>{entities.length === 0 ? 'No hay entidades configuradas' : 'Selecciona una entidad'}</h3>
              <p>
                {entities.length === 0 
                  ? 'Ve a Configuración para añadir tus bancos o cuentas.' 
                  : 'Elige una entidad de la lista para ver su balance y movimientos.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showEditModal && selectedEntity && (
        <EditEntityModal 
          entity={selectedEntity} 
          onClose={() => setShowEditModal(false)} 
          onSave={async (data) => {
            await editEntity(data)
            setShowEditModal(false)
          }}
        />
      )}
    </div>
  )
}

function EditEntityModal({ entity, onClose, onSave }) {
  const [name, setName] = useState(entity.name)
  const [url, setUrl] = useState(entity.url || '')
  const [color, setColor] = useState(entity.color || '#7E91B1')

  const COLORS = ['#7E91B1', '#9CAF9C', '#D18B8B', '#A29BBD', '#A09D9A', '#BFA89A', '#D9CD96', '#9BADC4']

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel animate-scaleIn" style={{ width: 450, padding: 32, background: 'var(--bg-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0 }}>Editar Entidad</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Nombre de la Entidad</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Santander, Revolut..." />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>URL del Sitio Web</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="Ej: santander.com" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>Color de Identificación</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div 
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ 
                    width: 24, 
                    height: 24, 
                    borderRadius: '50%', 
                    background: c, 
                    cursor: 'pointer',
                    border: color === c ? '2px solid white' : '2px solid transparent',
                    boxShadow: color === c ? '0 0 0 1px var(--text-main)' : 'none'
                  }}
                />
              ))}
              <input 
                type="color" 
                value={color} 
                onChange={e => setColor(e.target.value)} 
                style={{ width: 28, height: 28, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }} 
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button 
            className="btn" 
            style={{ flex: 1, justifyContent: 'center' }} 
            onClick={() => onSave({ id: entity.id, name, url, color })}
            disabled={!name}
          >
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  )
}
