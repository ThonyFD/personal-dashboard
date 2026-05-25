import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function HomePage() {
  const { user } = useAuth()

  return (
    <div className="marketing-shell">
      <section className="marketing-hero">
        <img src="/logo.svg" alt="AI Finance Agent" className="hero-logo" />
        <p className="marketing-eyebrow">Google OAuth Verification</p>
        <h1>AI Finance Agent</h1>
        <p className="marketing-lead">
          AI Finance Agent is a personal finance dashboard that reads Gmail
          messages you label as financial, extracts transaction details, and
          organizes them into reports, cash-flow views, budgets, and recurring
          payment tracking.
        </p>

        <div className="marketing-actions">
          <Link to={user ? '/app' : '/login'} className="marketing-primary">
            {user ? 'Open dashboard' : 'Sign in with Google'}
          </Link>
          <Link to="/privacy" className="marketing-secondary">
            Privacy Policy
          </Link>
        </div>
      </section>

      <section className="marketing-card-grid">
        <article className="marketing-card">
          <h2>What it does</h2>
          <p>
            Imports transaction notifications from Gmail, normalizes merchants,
            and makes the data available inside your dashboard.
          </p>
        </article>

        <article className="marketing-card">
          <h2>Google data used</h2>
          <p>
            Uses Google Sign-In for authentication and Gmail read-only access to
            fetch only the emails needed to process your financial activity.
          </p>
        </article>

        <article className="marketing-card">
          <h2>Transparency</h2>
          <p>
            The app stores extracted transaction data so you can review trends,
            categories, reports, and historical activity in one place.
          </p>
        </article>
      </section>

      <footer className="marketing-footer">
        <div>
          <strong>AI Finance Agent</strong>
          <p>Contact: thonyfd@gmail.com</p>
        </div>
        <div className="marketing-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to={user ? '/app' : '/login'}>{user ? 'Dashboard' : 'Login'}</Link>
        </div>
      </footer>
    </div>
  )
}
