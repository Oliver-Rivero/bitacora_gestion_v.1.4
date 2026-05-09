import { useState, useEffect } from 'react'
import { LayoutDashboard, ArrowRightLeft, Building2, Settings, Sun, Moon, Landmark, PieChart, LineChart, Plus } from 'lucide-react'
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

  const navItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'ledger', label: 'Libro Mayor', icon: ArrowRightLeft },
    { id: 'analytics', label: 'Analíticas', icon: LineChart },
    { id: 'entities', label: 'Entidades', icon: Building2 },
    { id: 'savings', label: 'Ahorro', icon: Landmark },
    { id: 'budget', label: 'Presupuesto', icon: PieChart },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ]

  return (
    <>
      <div className="sidebar glass-panel" style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, WebkitAppRegion: 'drag' }}>
        <div className="sidebar-header">
          <img src={theme === 'dark' ? logoDark : logoLight} alt="Bitácora" className="sidebar-logo" />
        </div>

        <div style={{ padding: '0 20px 24px 20px', WebkitAppRegion: 'no-drag' }}>
          <button 
            onClick={() => {
              setActiveTab('ledger')
              setLedgerFormRequested(true)
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent) 0%, #4a4ae6 100%)',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(100, 100, 255, 0.3)',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(100, 100, 255, 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 100, 255, 0.3)'
            }}
          >
            <Plus size={18} />
            Nueva Operación
          </button>
        </div>
        
        <div className="sidebar-nav">
          {navItems.map(item => {
            const Icon = item.icon
            return (
              <div 
                key={item.id}
                className={clsx('nav-item', activeTab === item.id && 'active')}
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </div>
            )
          })}
        </div>
        
        <div style={{ marginTop: 'auto', WebkitAppRegion: 'no-drag' }}>
          <div className="nav-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
          </div>
          <div style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-muted)', opacity: 0.6 }}>
            beta 1.1
          </div>
        </div>
      </div>

      <div className="main-content">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'analytics' && <AnalyticsView />}
        {activeTab === 'ledger' && <LedgerView />}
        {activeTab === 'entities' && <EntitiesView />}
        {activeTab === 'savings' && <SavingsView />}
        {activeTab === 'budget' && <BudgetView />}
        { activeTab === 'settings' && <ConfigView /> }
      </div>
    </>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}
