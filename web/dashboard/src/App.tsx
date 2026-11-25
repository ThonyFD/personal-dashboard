import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import OwnerRoute, { DefaultRedirect, NON_OWNER_HOME } from './components/OwnerRoute'
import AppearanceSettings from './components/AppearanceSettings'
import { FAREWELL_STATE, FarewellToast, SignOutConfirmDialog } from './components/SignOut'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Merchants from './pages/Merchants'
import Categories from './pages/Categories'
import Charts from './pages/Charts'
import CashFlow from './pages/CashFlow'
import MonthlyControl from './pages/MonthlyControl'
import Reports from './pages/Reports'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Recurring from './pages/Recurring'
import Exports from './pages/Exports'
import SystemHealth from './pages/SystemHealth'
import Timeline from './pages/Timeline'
import Habits from './pages/Habits'
import Mood from './pages/Mood'
import TermsOfService from './pages/TermsOfService'
import PrivacyPolicy from './pages/PrivacyPolicy'
import HomePage from './pages/HomePage'
import AlertBanner from './components/AlertBanner'
import { useForegroundPush } from './hooks/usePushNotifications'
import { AppearanceProvider } from './theme/AppearanceContext'
import './App.css'

const queryClient = new QueryClient()

const financeLinks = [
  { to: '/finance/overview', icon: '📊', label: 'Overview' },
  { to: '/finance/cashflow', icon: '💰', label: 'Cash Flow' },
  { to: '/finance/monthly-control', icon: '🧾', label: 'Control Mensual' },
  { to: '/finance/recurring', icon: '🔄', label: 'Recurring' },
  { to: '/finance/goals', icon: '🏆', label: 'Goals' },
  { to: '/finance/budgets', icon: '🎯', label: 'Budgets' },
  { to: '/finance/reports', icon: '📋', label: 'Reports' },
  { to: '/finance/exports', icon: '📤', label: 'Exports' },
  { to: '/finance/charts', icon: '📈', label: 'Charts' },
  { to: '/finance/transactions', icon: '💳', label: 'Transactions' },
  { to: '/finance/merchants', icon: '🏪', label: 'Merchants' },
  { to: '/finance/categories', icon: '🏷️', label: 'Categories' },
  { to: '/finance/system-health', icon: '🔧', label: 'System Health' },
] as const

const aztonLinks = [
  { to: '/azton/timeline', icon: '⚡', label: 'Timeline' },
  { to: '/azton/habits', icon: '🧩', label: 'Hábitos' },
  { to: '/azton/mood', icon: '🫀', label: 'Mood' },
] as const

function Navigation() {
  const { user, isOwner, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  const [confirmSignOut, setConfirmSignOut] = React.useState(false)
  const currentSection = !isOwner || location.pathname.startsWith('/azton') ? 'azton' : 'finance'
  const currentLinks = currentSection === 'azton' ? aztonLinks : financeLinks

  const handleSignOut = async () => {
    try {
      await signOut()
      setConfirmSignOut(false)
      navigate('/login', { state: FAREWELL_STATE })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const closeMenu = () => setIsMenuOpen(false)

  if (!user) return null

  return (
    <nav className="nav">
      <div className="nav-brand" onClick={() => navigate(isOwner ? '/' : NON_OWNER_HOME)}>
        <img src="/logo.svg" alt="Personal Dashboard" className="nav-logo" />
        <div className="nav-brand-copy">
          <h1>Personal Dashboard</h1>
          <span>{currentSection === 'azton' ? 'Azton Workspace' : 'Finance Workspace'}</span>
        </div>
      </div>

      <button
        className="hamburger-btn"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
      >
        <div className={`hamburger-icon ${isMenuOpen ? 'open' : ''}`}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>

      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}

      <div className={`menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-header">
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              className="menu-profile-img"
            />
          )}
          <div className="menu-user-info">
            <div className="menu-user-name">{user.displayName || user.email}</div>
            <div className="menu-user-email">{user.email}</div>
          </div>
        </div>

        {isOwner && (
          <div className="menu-section-switcher">
            <p className="menu-section-label">Secciones</p>
            <div className="menu-section-buttons">
              <Link
                to="/finance/overview"
                onClick={closeMenu}
                className={currentSection === 'finance' ? 'is-active' : ''}
              >
                Finanzas
              </Link>
              <Link
                to="/azton/timeline"
                onClick={closeMenu}
                className={currentSection === 'azton' ? 'is-active' : ''}
              >
                Azton
              </Link>
            </div>
          </div>
        )}

        <div className="menu-links">
          <p className="menu-section-label">
            {currentSection === 'azton' ? 'Azton Workspace' : 'Finance Workspace'}
          </p>
          {currentLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeMenu}
              className={location.pathname === link.to ? 'is-current' : ''}
            >
              <span className="menu-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>

        <AppearanceSettings />

        <div className="menu-footer">
          <button
            onClick={() => {
              closeMenu()
              setConfirmSignOut(true)
            }}
            className="menu-signout-btn"
          >
            <span className="menu-icon">🚪</span>
            Cerrar sesión
          </button>
        </div>
      </div>

      {confirmSignOut && (
        <SignOutConfirmDialog onConfirm={handleSignOut} onCancel={() => setConfirmSignOut(false)} />
      )}
    </nav>
  )
}

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isOwner } = useAuth()
  // Pushes that arrive while the dashboard is open, on any page.
  useForegroundPush(isOwner)
  const isFinanceSection = location.pathname.startsWith('/finance')
  const showFarewell = Boolean((location.state as typeof FAREWELL_STATE | null)?.farewell)
  // Clears the flag so a reload or back navigation does not show the toast again.
  const dismissFarewell = React.useCallback(
    () => navigate(location.pathname, { replace: true, state: null }),
    [navigate, location.pathname],
  )

  return (
    <div className="app">
      {showFarewell && <FarewellToast onDone={dismissFarewell} />}
      <Navigation />
      {isFinanceSection && isOwner && <AlertBanner />}
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          <Route path="/app" element={<ProtectedRoute><DefaultRedirect /></ProtectedRoute>} />
          <Route path="/finance" element={<ProtectedRoute><DefaultRedirect /></ProtectedRoute>} />
          <Route path="/azton" element={<Navigate to="/azton/timeline" replace />} />

          <Route path="/finance/overview" element={
            <ProtectedRoute>
              <OwnerRoute><Overview /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/cashflow" element={
            <ProtectedRoute>
              <OwnerRoute><CashFlow /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/monthly-control" element={
            <ProtectedRoute>
              <OwnerRoute><MonthlyControl /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/recurring" element={
            <ProtectedRoute>
              <OwnerRoute><Recurring /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/goals" element={
            <ProtectedRoute>
              <OwnerRoute><Goals /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/budgets" element={
            <ProtectedRoute>
              <OwnerRoute><Budgets /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/reports" element={
            <ProtectedRoute>
              <OwnerRoute><Reports /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/exports" element={
            <ProtectedRoute>
              <OwnerRoute><Exports /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/charts" element={
            <ProtectedRoute>
              <OwnerRoute><Charts /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/transactions" element={
            <ProtectedRoute>
              <OwnerRoute><Transactions /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/merchants" element={
            <ProtectedRoute>
              <OwnerRoute><Merchants /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/categories" element={
            <ProtectedRoute>
              <OwnerRoute><Categories /></OwnerRoute>
            </ProtectedRoute>
          } />
          <Route path="/finance/system-health" element={
            <ProtectedRoute>
              <OwnerRoute><SystemHealth /></OwnerRoute>
            </ProtectedRoute>
          } />

          <Route path="/azton/timeline" element={
            <ProtectedRoute>
              <Timeline />
            </ProtectedRoute>
          } />
          <Route path="/azton/habits" element={
            <ProtectedRoute>
              <Habits />
            </ProtectedRoute>
          } />
          <Route path="/azton/mood" element={
            <ProtectedRoute>
              <Mood />
            </ProtectedRoute>
          } />

          <Route path="/cashflow" element={<Navigate to="/finance/cashflow" replace />} />
          <Route path="/monthly-control" element={<Navigate to="/finance/monthly-control" replace />} />
          <Route path="/recurring" element={<Navigate to="/finance/recurring" replace />} />
          <Route path="/goals" element={<Navigate to="/finance/goals" replace />} />
          <Route path="/budgets" element={<Navigate to="/finance/budgets" replace />} />
          <Route path="/reports" element={<Navigate to="/finance/reports" replace />} />
          <Route path="/exports" element={<Navigate to="/finance/exports" replace />} />
          <Route path="/charts" element={<Navigate to="/finance/charts" replace />} />
          <Route path="/transactions" element={<Navigate to="/finance/transactions" replace />} />
          <Route path="/merchants" element={<Navigate to="/finance/merchants" replace />} />
          <Route path="/categories" element={<Navigate to="/finance/categories" replace />} />
          <Route path="/system-health" element={<Navigate to="/finance/system-health" replace />} />
          <Route path="/timeline" element={<Navigate to="/azton/timeline" replace />} />
          <Route path="/habits" element={<Navigate to="/azton/habits" replace />} />
          <Route path="/mood" element={<Navigate to="/azton/mood" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppearanceProvider>
            <AppContent />
          </AppearanceProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
