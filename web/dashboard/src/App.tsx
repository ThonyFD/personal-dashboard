import React from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Overview from './pages/Overview'
import Transactions from './pages/Transactions'
import Merchants from './pages/Merchants'
import Categories from './pages/Categories'
import Charts from './pages/Charts'
import CashFlow from './pages/CashFlow'
import Reports from './pages/Reports'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Recurring from './pages/Recurring'
import Exports from './pages/Exports'
import SystemHealth from './pages/SystemHealth'
import './App.css'

const queryClient = new QueryClient()

function Navigation() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const closeMenu = () => setIsMenuOpen(false)

  if (!user) return null

  return (
    <nav className="nav">
      <Link to="/"><h1>AI Finance Agent</h1></Link>

      {/* Hamburger button */}
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

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}

      {/* Sliding menu */}
      <div className={`menu-drawer ${isMenuOpen ? 'open' : ''}`}>
        {/* User info section */}
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

        {/* Navigation links */}
        <div className="menu-links">
          <Link to="/" onClick={closeMenu}>
            <span className="menu-icon">📊</span>
            Overview
          </Link>
          <Link to="/cashflow" onClick={closeMenu}>
            <span className="menu-icon">💰</span>
            Cash Flow
          </Link>
          <Link to="/recurring" onClick={closeMenu}>
            <span className="menu-icon">🔄</span>
            Recurring
          </Link>
          <Link to="/goals" onClick={closeMenu}>
            <span className="menu-icon">🏆</span>
            Goals
          </Link>
          <Link to="/budgets" onClick={closeMenu}>
            <span className="menu-icon">🎯</span>
            Budgets
          </Link>
          <Link to="/reports" onClick={closeMenu}>
            <span className="menu-icon">📋</span>
            Reports
          </Link>
          <Link to="/exports" onClick={closeMenu}>
            <span className="menu-icon">📤</span>
            Exports
          </Link>
          <Link to="/charts" onClick={closeMenu}>
            <span className="menu-icon">📈</span>
            Charts
          </Link>
          <Link to="/transactions" onClick={closeMenu}>
            <span className="menu-icon">💳</span>
            Transactions
          </Link>
          <Link to="/merchants" onClick={closeMenu}>
            <span className="menu-icon">🏪</span>
            Merchants
          </Link>
          <Link to="/categories" onClick={closeMenu}>
            <span className="menu-icon">🏷️</span>
            Categories
          </Link>
          <Link to="/system-health" onClick={closeMenu}>
            <span className="menu-icon">🔧</span>
            System Health
          </Link>
        </div>

        {/* Sign out button */}
        <div className="menu-footer">
          <button
            onClick={() => {
              handleSignOut()
              closeMenu()
            }}
            className="menu-signout-btn"
          >
            <span className="menu-icon">🚪</span>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}

function AppContent() {
  return (
    <div className="app">
      <Navigation />
      <main className="main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Overview />
            </ProtectedRoute>
          } />
          <Route path="/cashflow" element={
            <ProtectedRoute>
              <CashFlow />
            </ProtectedRoute>
          } />
          <Route path="/recurring" element={
            <ProtectedRoute>
              <Recurring />
            </ProtectedRoute>
          } />
          <Route path="/goals" element={
            <ProtectedRoute>
              <Goals />
            </ProtectedRoute>
          } />
          <Route path="/budgets" element={
            <ProtectedRoute>
              <Budgets />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/exports" element={
            <ProtectedRoute>
              <Exports />
            </ProtectedRoute>
          } />
          <Route path="/charts" element={
            <ProtectedRoute>
              <Charts />
            </ProtectedRoute>
          } />
          <Route path="/transactions" element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="/merchants" element={
            <ProtectedRoute>
              <Merchants />
            </ProtectedRoute>
          } />
          <Route path="/categories" element={
            <ProtectedRoute>
              <Categories />
            </ProtectedRoute>
          } />
          <Route path="/system-health" element={
            <ProtectedRoute>
              <SystemHealth />
            </ProtectedRoute>
          } />
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
          <AppContent />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
