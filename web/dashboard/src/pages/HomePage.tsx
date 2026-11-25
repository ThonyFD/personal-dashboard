import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="marketing-shell">
      <section className="marketing-hero">
        <img src="/logo.svg" alt="Personal Dashboard" className="hero-logo" />
        <p className="marketing-eyebrow">Signal, Control, Growth</p>
        <h1>Elige tu workspace</h1>
        <p className="marketing-lead">
          Personal Dashboard ahora separa dos sistemas: un workspace de
          Finanzas para control operativo y un workspace Azton para hábitos,
          mood y consistencia diaria. Entra directo al sistema que quieres usar.
        </p>

        {!user && (
          <div className="marketing-actions">
            <Link to="/login" className="marketing-primary">
              Sign in with Google
            </Link>
            <Link to="/privacy" className="marketing-secondary">
              Privacy Policy
            </Link>
          </div>
        )}
      </section>

      <section className="marketing-selector-grid">
        <article className="marketing-selector-card finance">
          <p className="marketing-selector-tag">Finance Workspace</p>
          <h2>Finanzas</h2>
          <p>
            Transacciones, cash flow, control mensual, merchants, categorías y
            salud operativa del sistema financiero.
          </p>
          <ul className="marketing-feature-list">
            <li>Overview y reportes</li>
            <li>Control mensual y recurring</li>
            <li>Merchants, categorías y alertas</li>
          </ul>
          <Link to={user ? '/finance/overview' : '/login'} className="marketing-primary marketing-selector-cta">
            {user ? 'Entrar a Finanzas' : 'Login para Finanzas'}
          </Link>
        </article>

        <article className="marketing-selector-card azton">
          <p className="marketing-selector-tag">Azton Workspace</p>
          <h2>Azton</h2>
          <p>
            Timeline de hábitos, focus sessions, mood tracking y visualización
            de consistencia en una capa separada del dashboard financiero.
          </p>
          <ul className="marketing-feature-list">
            <li>Timeline diario por bloques</li>
            <li>CRUD de hábitos y focus timer</li>
            <li>Mood tracker + heatmap</li>
          </ul>
          <Link to={user ? '/azton/timeline' : '/login'} className="marketing-secondary marketing-selector-cta">
            {user ? 'Entrar a Azton' : 'Login para Azton'}
          </Link>
        </article>
      </section>

      <section className="marketing-card-grid">
        <article className="marketing-card">
          <h2>Arquitectura separada</h2>
          <p>
            Finanzas y Azton comparten identidad visual y autenticación, pero ya
            no comparten el mismo menú operativo.
          </p>
        </article>

        <article className="marketing-card">
          <h2>Entrada clara</h2>
          <p>
            Desde el home eliges a qué sistema entrar sin mezclar navegación
            financiera con hábitos y bienestar.
          </p>
        </article>

        <article className="marketing-card">
          <h2>Identidad consistente</h2>
          <p>
            Se mantiene la dirección dark, tecnológica y de alto contraste del
            Brand Book en ambas superficies.
          </p>
        </article>
      </section>

      <footer className="marketing-footer">
        <div>
          <strong>Personal Dashboard</strong>
          <p>Contact: thonyfd@gmail.com</p>
        </div>
        <div className="marketing-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to={user ? '/finance/overview' : '/login'}>{user ? 'Finanzas' : 'Login'}</Link>
          <Link to={user ? '/azton/timeline' : '/login'}>{user ? 'Azton' : 'Login'}</Link>
        </div>
      </footer>
    </div>
  )
}
