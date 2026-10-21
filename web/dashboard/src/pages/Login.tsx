import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const styles = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes pulseGlow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.05); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .login-bg {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #080B14;
    position: relative;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
  .login-bg::before {
    content: '';
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(122,92,255,0.15) 0%, transparent 70%);
    top: -150px;
    left: -150px;
    animation: pulseGlow 6s ease-in-out infinite;
  }
  .login-bg::after {
    content: '';
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(0,217,255,0.12) 0%, transparent 70%);
    bottom: -100px;
    right: -100px;
    animation: pulseGlow 8s ease-in-out infinite reverse;
  }
  .green-orb {
    position: absolute;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(57,255,20,0.08) 0%, transparent 70%);
    bottom: 20%;
    left: 10%;
    animation: pulseGlow 10s ease-in-out infinite;
  }
  .login-card {
    position: relative;
    z-index: 1;
    background: rgba(14, 17, 32, 0.85);
    border: 1px solid rgba(122, 92, 255, 0.3);
    border-radius: 20px;
    padding: 3rem 2.5rem;
    max-width: 420px;
    width: calc(100% - 2rem);
    box-shadow:
      0 0 0 1px rgba(0, 217, 255, 0.05),
      0 20px 60px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    animation: fadeUp 0.5s ease-out;
    backdrop-filter: blur(20px);
  }
  .login-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 1.5rem;
  }
  .login-logo img {
    width: 72px;
    height: 72px;
    border-radius: 16px;
    box-shadow: 0 0 24px rgba(57,255,20,0.25), 0 0 8px rgba(122,92,255,0.3);
  }
  .login-title {
    font-size: 1.75rem;
    font-weight: 700;
    text-align: center;
    margin-bottom: 0.4rem;
    background: linear-gradient(135deg, #E8FFFF 0%, #7A5CFF 50%, #00D9FF 100%);
    background-size: 200% 200%;
    animation: gradientShift 4s ease infinite;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
  }
  .login-subtitle {
    text-align: center;
    color: rgba(232, 255, 255, 0.5);
    font-size: 0.9rem;
    margin-bottom: 2rem;
    line-height: 1.5;
  }
  .login-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(122,92,255,0.4), rgba(0,217,255,0.4), transparent);
    margin-bottom: 2rem;
  }
  .google-btn {
    width: 100%;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, rgba(122,92,255,0.2), rgba(0,217,255,0.15));
    border: 1px solid rgba(122,92,255,0.5);
    border-radius: 12px;
    color: #E8FFFF;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    transition: all 0.25s ease;
    letter-spacing: 0.3px;
    position: relative;
    overflow: hidden;
  }
  .google-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(122,92,255,0.3), rgba(0,217,255,0.25));
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .google-btn:hover:not(:disabled)::before {
    opacity: 1;
  }
  .google-btn:hover:not(:disabled) {
    border-color: rgba(0,217,255,0.7);
    box-shadow: 0 0 20px rgba(122,92,255,0.3), 0 0 40px rgba(0,217,255,0.1);
    transform: translateY(-1px);
  }
  .google-btn:active:not(:disabled) {
    transform: translateY(0);
  }
  .google-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .google-btn span {
    position: relative;
    z-index: 1;
  }
  .google-btn svg {
    position: relative;
    z-index: 1;
    flex-shrink: 0;
  }
  .login-notice {
    margin-top: 1.5rem;
    padding: 1rem 1.25rem;
    background: rgba(0, 217, 255, 0.05);
    border: 1px solid rgba(0, 217, 255, 0.15);
    border-radius: 10px;
    font-size: 0.8rem;
    color: rgba(232, 255, 255, 0.45);
    line-height: 1.6;
  }
  .login-links {
    margin-top: 1.25rem;
    display: flex;
    justify-content: center;
    gap: 1.5rem;
    font-size: 0.8rem;
  }
  .login-links a {
    color: rgba(122,92,255,0.8);
    text-decoration: none;
    transition: color 0.2s;
  }
  .login-links a:hover {
    color: #00D9FF;
  }
  .error-box {
    background: rgba(255, 50, 50, 0.1);
    border: 1px solid rgba(255, 50, 50, 0.3);
    color: #ff6b6b;
    padding: 0.75rem 1rem;
    border-radius: 10px;
    margin-bottom: 1rem;
    font-size: 0.88rem;
  }
  .accent-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #39FF14;
    box-shadow: 0 0 6px #39FF14;
    margin-right: 0.5rem;
    vertical-align: middle;
    margin-top: -2px;
  }
`;

export default function Login() {
  const { signInWithGoogle, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [navigate, user]);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-bg">
        <div className="green-orb" />
        <div className="login-card">
          <div className="login-logo">
            <img src="/logo.svg" alt="AI Finance Agent" />
          </div>

          <h1 className="login-title">AI Finance Agent</h1>
          <p className="login-subtitle">
            <span className="accent-dot" />
            Sign in to access your Gmail-powered finance dashboard
          </p>

          <div className="login-divider" />

          {error && (
            <div className="error-box">{error}</div>
          )}

          <button
            className="google-btn"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.6 10.227c0-.709-.064-1.39-.182-2.045H10v3.868h5.382a4.6 4.6 0 01-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.35z" fill="#4285F4"/>
              <path d="M10 20c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.595-4.123H1.064v2.59A9.996 9.996 0 0010 20z" fill="#34A853"/>
              <path d="M4.405 11.9c-.2-.6-.314-1.24-.314-1.9 0-.66.114-1.3.314-1.9V5.51H1.064A9.996 9.996 0 000 10c0 1.614.386 3.14 1.064 4.49l3.34-2.59z" fill="#FBBC05"/>
              <path d="M10 3.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C14.959.99 12.695 0 10 0 6.09 0 2.71 2.24 1.064 5.51l3.34 2.59C5.19 5.736 7.395 3.977 10 3.977z" fill="#EA4335"/>
            </svg>
            <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
          </button>

          <div className="login-notice">
            By signing in, you allow the app to authenticate with Google and read
            the Gmail messages required to extract your financial transaction data.
          </div>

          <div className="login-links">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/">Home</Link>
          </div>
        </div>
      </div>
    </>
  );
}
