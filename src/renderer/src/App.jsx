import { useState, useEffect } from 'react'
import { LayoutDashboard, ArrowRightLeft, Building2, Settings, Sun, Moon, Landmark, PieChart, LineChart, Plus, Settings2, Check, GripVertical } from 'lucide-react'
import { clsx } from 'clsx'
import { DataProvider, useData } from './context/DataContext'
import DashboardView from './components/DashboardView'
import LedgerView from './components/LedgerView'
import EntitiesView from './components/EntitiesView'
import SavingsView from './components/SavingsView'
import BudgetView from './components/BudgetView'
import ConfigView from './components/ConfigView'
import AnalyticsView from './components/AnalyticsView'
import { formatCurrency } from './utils/formatters'
import logoLight from './assets/logo-light.png'
import logoDark from './assets/logo-dark.png'

function AppContent() {
  const { entities, setLedgerFormRequested } = useData()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  const [isEditingSidebar, setIsEditingSidebar] = useState(false)
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverItem, setDragOverItem] = useState(null)

  const [navItems, setNavItems] = useState([
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'ledger', label: 'Libro Mayor', icon: ArrowRightLeft },
    { id: 'analytics', label: 'Analíticas', icon: LineChart },
    { id: 'entities', label: 'Entidades', icon: Building2 },
    { id: 'savings', label: 'Ahorro', icon: Landmark },
    { id: 'budget', label: 'Presupuesto', icon: PieChart },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ])

  // Load custom sidebar order on mount
  useEffect(() => {
    const saved = localStorage.getItem('sidebar_order')
    if (saved) {
      try {
        const orderIds = JSON.parse(saved)
        const currentIds = ['dashboard', 'ledger', 'analytics', 'entities', 'savings', 'budget', 'settings']
        const validOrderIds = orderIds.filter(id => currentIds.includes(id))
        
        const sorted = [...navItems].sort((a, b) => {
          const idxA = validOrderIds.indexOf(a.id)
          const idxB = validOrderIds.indexOf(b.id)
          const scoreA = idxA === -1 ? 999 : idxA
          const scoreB = idxB === -1 ? 999 : idxB
          return scoreA - scoreB
        })
        setNavItems(sorted)
      } catch (e) {
        console.error('Error parsing sidebar_order', e)
      }
    }
  }, [])

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    if (!isEditingSidebar) return
    setDraggedItem(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    if (!isEditingSidebar) return
    e.preventDefault()
    setDragOverItem(index)
  }

  const handleDrop = (index) => {
    if (!isEditingSidebar || draggedItem === null) return
    const newItems = [...navItems]
    const item = newItems.splice(draggedItem, 1)[0]
    newItems.splice(index, 0, item)
    setNavItems(newItems)
    setDraggedItem(null)
    setDragOverItem(null)
    
    // Save new order to localStorage
    localStorage.setItem('sidebar_order', JSON.stringify(newItems.map(i => i.id)))
  }

  return (
    <div className={clsx('app-container', isEditingSidebar && 'edit-mode')} style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div className="sidebar glass-panel" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, WebkitAppRegion: 'drag' }}>
        <div className="sidebar-header">
          <img src={theme === 'dark' ? logoDark : logoLight} alt="Bitácora" className="sidebar-logo" />
        </div>

        <div style={{ padding: '0 20px 24px 20px', WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={() => {
              if (isEditingSidebar) return
              setActiveTab('ledger')
              setLedgerFormRequested(true)
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: isEditingSidebar ? 'not-allowed' : 'pointer',
              opacity: isEditingSidebar ? 0.6 : 1,
              boxShadow: theme === 'dark' ? '0 4px 12px rgba(145, 163, 190, 0.2)' : '0 4px 12px rgba(126, 145, 177, 0.2)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease'
            }}
            onMouseEnter={e => {
              if (isEditingSidebar) return
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = theme === 'dark' ? '0 6px 16px rgba(145, 163, 190, 0.35)' : '0 6px 16px rgba(126, 145, 177, 0.35)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = theme === 'dark' ? '0 4px 12px rgba(145, 163, 190, 0.2)' : '0 4px 12px rgba(126, 145, 177, 0.2)'
            }}
          >
            <Plus size={18} />
            Nueva Operación
          </button>
        </div>
        
        <div className="sidebar-nav">
          {navItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div 
                key={item.id}
                draggable={isEditingSidebar}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={() => { setDraggedItem(null); setDragOverItem(null); }}
                className={clsx(
                  'nav-item', 
                  activeTab === item.id && !isEditingSidebar && 'active',
                  dragOverItem === index && 'drag-over'
                )}
                style={{ 
                  WebkitAppRegion: 'no-drag',
                  cursor: isEditingSidebar ? 'grab' : 'pointer',
                  opacity: draggedItem === index ? 0.4 : 1,
                  transition: 'all 0.2s ease',
                  transform: dragOverItem === index ? 'translateY(2px)' : 'none'
                }}
                onClick={() => !isEditingSidebar && setActiveTab(item.id)}
              >
                {isEditingSidebar ? (
                  <GripVertical size={16} style={{ opacity: 0.5, marginRight: 8, flexShrink: 0 }} />
                ) : (
                  <Icon size={18} />
                )}
                {item.label}
              </div>
            )
          })}
        </div>
        
        <div style={{ marginTop: 'auto', WebkitAppRegion: 'no-drag', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div 
            className="edit-sidebar-btn" 
            onClick={() => setIsEditingSidebar(!isEditingSidebar)}
            style={{ margin: '0 8px 4px 8px' }}
          >
            {isEditingSidebar ? <Check size={14} /> : <Settings2 size={14} />}
            <span>{isEditingSidebar ? 'Finalizar edición' : 'Personalizar menú'}</span>
          </div>

          <div className="nav-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          </div>
          <div style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            beta 1.5
          </div>
        </div>
      </div>

      <div className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'ledger' && <LedgerView />}
        {activeTab === 'entities' && <EntitiesView />}
        {activeTab === 'savings' && <SavingsView />}
        {activeTab === 'budget' && <BudgetView />}
        { activeTab === 'settings' && <ConfigView /> }
      </div>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
