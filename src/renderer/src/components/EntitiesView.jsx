import React, { useState, useMemo, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { Building2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { formatCurrency, getLogoUrl } from '../utils/formatters'
import { clsx } from 'clsx'

export default function EntitiesView() {
  const { entities, transactions } = useData()
  const [selectedEntityId, setSelectedEntityId] = useState(null)

  useEffect(() => {
    if (!selectedEntityId && entities.length > 0) {
      setSelectedEntityId(entities[0].id)
    }
  }, [entities, selectedEntityId])

  const selectedEntity = useMemo(() => {
    return entities.find(e => e.id === selectedEntityId)
  }, [entities, selectedEntityId])
  
  const entityTransactions = useMemo(() => {
    if (!selectedEntity) return []
    return transactions.filter(t => 
      t.entityId === selectedEntity.id || t.toEntityId === selectedEntity.id
    )
  }, [transactions, selectedEntity])


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
                      <img src={getLogoUrl(entity.url)} alt={entity.name} style={{ width: '100%', height: '100%' }} />
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
                      <img src={getLogoUrl(selectedEntity.url)} alt={selectedEntity.name} style={{ width: '80%' }} />
                    ) : (
                      <Building2 size={32} color="var(--text-muted)" />
                    )}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 24 }}>{selectedEntity.name}</h2>
                    <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{selectedEntity.url || 'Sin sitio web'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Balance Actual</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(selectedEntity.balance)}</div>
                </div>
              </div>

              <h3>Últimos Movimientos</h3>
              {entityTransactions.length === 0 ? (
                <div className="empty-state">
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
    </div>
  )
}
