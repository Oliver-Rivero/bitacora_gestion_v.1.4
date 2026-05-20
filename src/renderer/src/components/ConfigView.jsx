import React, { useState } from 'react'
import { useData } from '../context/DataContext'
import { Plus, Trash2, Building2, Tag, Layers, Globe, ExternalLink, AlertTriangle, Download, Upload, ShieldCheck, Palette, Edit2, X } from 'lucide-react'
import { getLogoUrl, getDomain } from '../utils/formatters'
import { clsx } from 'clsx'

const COLORS = ['#7E91B1', '#9CAF9C', '#D18B8B', '#A29BBD', '#A09D9A', '#BFA89A', '#D9CD96', '#9BADC4']

export default function ConfigView() {
  const { 
    entities, categories, 
    addEntity, editEntity, deleteEntity,
    addCategory, deleteCategory,
    addSubcategory, deleteSubcategory,
    resetAllData, exportDatabase, importDatabase
  } = useData()

  const [activeTab, setActiveTab] = useState('categories')
  
  // Category Form
  const [newCat, setNewCat] = useState({ name: '', type: 'gasto' })
  const [newSub, setNewSub] = useState({ categoryId: '', name: '' })
  
  // Entity Form
  const [newEnt, setNewEnt] = useState({ name: '', url: '', color: '#7E91B1' })

  // Edit Entity Form State
  const [editingEntity, setEditingEntity] = useState(null)

  // Special Category Colors
  const [colorAhorro, setColorAhorro] = useState(localStorage.getItem('color_ahorro') || '#5D7EA7')
  const [colorInversion, setColorInversion] = useState(localStorage.getItem('color_inversion') || '#827A9E')
  const [triggerRefresh, setTriggerRefresh] = useState(0)

  const handleColorChange = (type, val) => {
    if (type === 'ahorro') {
      setColorAhorro(val)
      localStorage.setItem('color_ahorro', val)
    } else {
      setColorInversion(val)
      localStorage.setItem('color_inversion', val)
    }
  }

  return (
    <div>
      <h1>Configuración</h1>

      <div className="segmented-control glass-panel">
        <button 
          className={clsx('segment-item', activeTab === 'categories' && 'active')} 
          onClick={() => setActiveTab('categories')}
        >
          Categorías y Subcategorías
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'entities' && 'active')} 
          onClick={() => setActiveTab('entities')}
        >
          Entidades Bancarias
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'customization' && 'active')} 
          onClick={() => setActiveTab('customization')}
        >
          Personalización
        </button>
        <button 
          className={clsx('segment-item', activeTab === 'advanced' && 'active')} 
          onClick={() => setActiveTab('advanced')}
        >
          Avanzado
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '0px', overflow: 'hidden' }}>

        <div style={{ padding: '32px' }}>
          {activeTab === 'categories' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              {/* Categories Management */}
              <div>
                <h3>Gestión de Categorías</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, marginTop: 12 }}>
                  <input 
                    placeholder="Nombre categoría..." 
                    value={newCat.name} 
                    onChange={e => setNewCat({...newCat, name: e.target.value})} 
                  />
                  <select 
                    style={{ width: 140 }} 
                    value={newCat.type} 
                    onChange={e => {
                      setNewCat({...newCat, type: e.target.value});
                      setNewSub({...newSub, categoryId: ''});
                    }}
                  >
                    <option value="gasto">Gasto</option>
                    <option value="ingreso">Ingreso</option>
                    <option value="inversion">Inversión</option>
                  </select>
                  <button className="btn" onClick={async () => {
                    if (newCat.name) {
                      await addCategory(newCat)
                      setNewCat({ name: '', type: newCat.type })
                    }
                  }}>
                    <Plus size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {categories.filter(c => c.type === newCat.type).map(cat => (
                    <div key={cat.id} className="glass-panel" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Tag 
                          size={16} 
                          color={
                            cat.type === 'ingreso' ? 'var(--success)' : 
                            cat.type === 'gasto' ? 'var(--danger)' : 
                            cat.type === 'ahorro' ? 'var(--accent)' :
                            cat.type === 'inversion' ? '#827A9E' :
                            'var(--text-muted)'
                          } 
                        />
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                        <span style={{ fontSize: 10, opacity: 0.6, textTransform: 'uppercase' }}>({cat.type})</span>
                      </div>
                      <button className="btn-secondary" style={{ padding: 6 }} onClick={() => deleteCategory(cat.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subcategories Management */}
              <div>
                <h3>Gestión de Subcategorías</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20, marginTop: 12 }}>
                  <select style={{ flex: 1 }} value={newSub.categoryId} onChange={e => setNewSub({...newSub, categoryId: e.target.value})}>
                    <option value="">Categoría...</option>
                    {categories.filter(c => c.type === newCat.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input 
                    placeholder="Nombre sub..." 
                    value={newSub.name} 
                    onChange={e => setNewSub({...newSub, name: e.target.value})} 
                  />
                  <button className="btn" onClick={async () => {
                    if (newSub.categoryId && newSub.name) {
                      await addSubcategory(newSub)
                      setNewSub({ categoryId: newSub.categoryId, name: '' })
                    }
                  }}>
                    <Plus size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {newSub.categoryId ? (
                    (() => {
                      const subcategories = categories.find(c => c.id == newSub.categoryId)?.subcategories || [];
                      if (subcategories.length === 0) {
                        return (
                          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12, background: 'rgba(0,0,0,0.01)' }}>
                            Esta categoría aún no tiene subcategorías. ¡Crea la primera arriba!
                          </div>
                        );
                      }
                      return subcategories.map(sub => (
                        <div key={sub.id} className="glass-panel" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <Layers size={14} color="var(--text-muted)" />
                            <span style={{ fontSize: 14 }}>{sub.name}</span>
                          </div>
                          <button className="btn-secondary" style={{ padding: 4 }} onClick={() => deleteSubcategory(sub.id)}>
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ));
                    })()
                  ) : (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12, background: 'rgba(0,0,0,0.01)' }}>
                      Selecciona una categoría arriba para gestionar sus subcategorías.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'entities' && (
            <div>
              <div className="glass-panel" style={{ padding: 24, marginBottom: 32, display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(126, 145, 177, 0.03)' }}>
                <div style={{ flex: 1, display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>Nombre de la Entidad</label>
                    <input 
                      placeholder="Ej. Santander, Revolut..." 
                      value={newEnt.name} 
                      onChange={e => setNewEnt({...newEnt, name: e.target.value})} 
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, display: 'block', textTransform: 'uppercase' }}>URL del Sitio Web</label>
                    <input 
                      placeholder="Ej. santander.com" 
                      value={newEnt.url} 
                      onChange={e => setNewEnt({...newEnt, url: e.target.value})} 
                    />
                  </div>
                </div>
                <div style={{ paddingTop: 18 }}>
                  <button className="btn" style={{ height: 45, padding: '0 24px' }} onClick={async () => {
                    if (newEnt.name) {
                      await addEntity(newEnt)
                      setNewEnt({ name: '', url: '', color: '#7E91B1' })
                    }
                  }}>
                    <Plus size={18} /> Añadir Entidad
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {entities.map(ent => (
                  <div key={ent.id} className="glass-panel v5-hover-effect" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 52, 
                      height: 52, 
                      borderRadius: 12, 
                      background: 'white', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      flexShrink: 0
                    }}>
                      {getLogoUrl(ent.url) ? (
                        <img src={getLogoUrl(ent.url)} alt={ent.name} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
                      ) : (
                        <Building2 size={24} color="var(--text-muted)" />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ent.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={12} />
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {getDomain(ent.url) || 'Sin URL'}
                        </span>
                      </div>
                    </div>
                    <button className="btn-secondary" style={{ padding: 8, borderRadius: 8, borderColor: 'transparent', marginRight: -6 }} onClick={() => setEditingEntity(ent)} title="Editar Entidad">
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-secondary" style={{ padding: 8, borderRadius: 8, color: 'var(--danger)', borderColor: 'transparent' }} onClick={() => deleteEntity(ent.id)} title="Eliminar Entidad">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'customization' && (
            <div style={{ animation: 'fadeUp 0.3s ease', padding: '32px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, color: 'var(--accent)' }}>
                  <Palette size={24} />
                  <h2 style={{ margin: 0 }}>Paleta de Colores de la Aplicación</h2>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 32 }}>
                  Personaliza los colores de tus flujos financieros y categorías de transacciones. Los cambios se aplicarán instantáneamente a los gráficos de distribución y paneles de control.
                </p>

                {/* Sección: Categorías Especiales */}
                <div className="glass-panel" style={{ padding: 24, marginBottom: 32, border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Categorías del Balance Global</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 12, border: '1px solid var(--border)', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: `${colorAhorro}15`, 
                          border: `1px solid ${colorAhorro}30`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0 
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorAhorro }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>Ahorro (Huchas)</div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Flujos de ahorro personal</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input 
                          type="color" 
                          style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} 
                          value={colorAhorro} 
                          onChange={(e) => handleColorChange('ahorro', e.target.value)} 
                        />
                        <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{colorAhorro.toUpperCase()}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: 'rgba(0,0,0,0.02)', borderRadius: 12, border: '1px solid var(--border)', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ 
                          width: 28, 
                          height: 28, 
                          borderRadius: '50%', 
                          background: `${colorInversion}15`, 
                          border: `1px solid ${colorInversion}30`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          flexShrink: 0 
                        }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colorInversion }} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>Inversión (Activos)</div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Flujos salientes a inversión</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input 
                          type="color" 
                          style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} 
                          value={colorInversion} 
                          onChange={(e) => handleColorChange('inversion', e.target.value)} 
                        />
                        <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{colorInversion.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección: Categorías Generales */}
                <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--border)' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>Categorías de Flujo Financiero</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                    Lista de tus categorías registradas. Modifica el color de cada una para hacer que los gráficos de barras y sectores se vean a tu gusto.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {categories.filter(c => c.type !== 'ahorro').map((cat, i) => {
                      const defaultColor = COLORS[i % COLORS.length]
                      const customColor = localStorage.getItem(`category_color_${cat.name}`) || defaultColor
                      
                      return (
                        <div 
                          key={cat.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '12px 16px', 
                            background: 'rgba(0,0,0,0.01)', 
                            borderRadius: 12, 
                            border: '1px solid var(--border)',
                            transition: 'all 0.2s ease'
                          }}
                          className="v5-hover-effect"
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            <div style={{ 
                              width: 28, 
                              height: 28, 
                              borderRadius: '50%', 
                              background: `${customColor}15`, 
                              border: `1px solid ${customColor}30`, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              flexShrink: 0 
                            }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: customColor }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                              <span style={{ 
                                fontSize: 9, 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                padding: '2px 6px', 
                                borderRadius: 4, 
                                background: 
                                  cat.type === 'ingreso' ? 'rgba(46, 204, 113, 0.1)' : 
                                  cat.type === 'gasto' ? 'rgba(231, 76, 60, 0.1)' :
                                  cat.type === 'ahorro' ? 'rgba(93, 126, 167, 0.15)' :
                                  'rgba(130, 122, 158, 0.15)', 
                                color: 
                                  cat.type === 'ingreso' ? 'var(--success)' : 
                                  cat.type === 'gasto' ? 'var(--danger)' :
                                  cat.type === 'ahorro' ? 'var(--accent)' :
                                  '#827A9E',
                                display: 'inline-block',
                                marginTop: 4
                              }}>
                                {cat.type}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <input 
                              type="color" 
                              style={{ width: 40, height: 32, padding: 0, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} 
                              value={customColor} 
                              onChange={(e) => {
                                localStorage.setItem(`category_color_${cat.name}`, e.target.value)
                                setTriggerRefresh(prev => prev + 1)
                              }} 
                            />
                            <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 700 }}>{customColor.toUpperCase()}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: '40px 0' }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 20, 
                  background: 'rgba(255, 60, 60, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                  color: 'var(--danger)'
                }}>
                  <AlertTriangle size={32} />
                </div>
                
                <h2 style={{ marginBottom: 16 }}>Copias de Seguridad y Datos</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
                  Gestiona la integridad de tus datos exportando copias de seguridad o restaurando una anterior.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 40 }}>
                  <div className="glass-panel" style={{ padding: 24, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--accent)' }}>
                      <Download size={20} />
                      <h3 style={{ margin: 0, fontSize: 16 }}>Exportar Datos</h3>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Guarda una copia completa de tu base de datos en formato .db para tenerla a buen recaudo.</p>
                    <button className="btn" style={{ width: '100%' }} onClick={async () => {
                      const success = await exportDatabase()
                      if (success) alert('Copia de seguridad exportada correctamente.')
                    }}>
                      Exportar ahora
                    </button>
                  </div>

                  <div className="glass-panel" style={{ padding: 24, textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, color: 'var(--accent)' }}>
                      <Upload size={20} />
                      <h3 style={{ margin: 0, fontSize: 16 }}>Importar Datos</h3>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Restaura una copia de seguridad previa. <strong>Atención:</strong> La app se reiniciará automáticamente.</p>
                    <button className="btn-secondary" style={{ width: '100%' }} onClick={async () => {
                      if (window.confirm('⚠️ ¿Estás seguro? Se sobrescribirán todos los datos actuales con la copia seleccionada.')) {
                        await importDatabase()
                      }
                    }}>
                      Importar archivo
                    </button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 24, background: 'rgba(255, 60, 60, 0.05)', border: '1px solid rgba(255, 60, 60, 0.2)' }}>
                  <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--danger)' }}>Resetear Aplicación</h3>
                  <p style={{ fontSize: 13, marginBottom: 20 }}>Esta acción es irreversible. Asegúrate de tener una copia de tus datos si los necesitas.</p>
                  
                  <button 
                    className="btn" 
                    style={{ background: 'var(--danger)', borderColor: 'var(--danger)', margin: '0 auto' }}
                    onClick={async () => {
                      if (window.confirm('⚠️ ¿Estás COMPLETAMENTE seguro de que quieres borrar todos tus datos?')) {
                        const confirmation = window.prompt('Escribe "ELIMINAR" para confirmar la operación:')
                        if (confirmation === 'ELIMINAR') {
                          await resetAllData()
                          alert('Todos los datos han sido eliminados correctamente.')
                          setActiveTab('categories')
                        }
                      }
                    }}
                  >
                    <Trash2 size={16} /> Borrar todos los datos
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingEntity && (
        <EditEntityModal 
          entity={editingEntity} 
          onClose={() => setEditingEntity(null)} 
          onSave={async (data) => {
            await editEntity(data)
            setEditingEntity(null)
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
