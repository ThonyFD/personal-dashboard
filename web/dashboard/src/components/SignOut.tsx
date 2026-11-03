import { useEffect, useState } from 'react'
import './SignOut.css'

/** Location state flag that tells the app to show the farewell toast after signing out. */
export const FAREWELL_STATE = { farewell: true } as const

export function SignOutConfirmDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !signingOut) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, signingOut])

  const confirm = async () => {
    setSigningOut(true)
    try {
      await onConfirm()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="signout-overlay" onClick={() => !signingOut && onCancel()}>
      <div
        className="signout-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        onClick={event => event.stopPropagation()}
      >
        <h2 id="signout-title">Cerrar sesión</h2>
        <p>¿Seguro que quieres salir? Tendrás que entrar con Google de nuevo.</p>
        <div className="signout-actions">
          <button className="signout-cancel" onClick={onCancel} disabled={signingOut} autoFocus>
            Cancelar
          </button>
          <button className="signout-confirm" onClick={confirm} disabled={signingOut}>
            {signingOut ? 'Saliendo…' : 'Salir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function FarewellToast({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3000)
    return () => window.clearTimeout(timer)
  }, [onDone])

  return (
    <div className="farewell-toast" role="status">
      ¡Vuelve pronto!
    </div>
  )
}
