import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const NON_OWNER_HOME = '/azton/habits'

/** Finance pages are owner-only; other accounts land on their habits. Use inside ProtectedRoute. */
export default function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { isOwner } = useAuth()
  return isOwner ? <>{children}</> : <Navigate to={NON_OWNER_HOME} replace />
}

/** Default landing after login: finance for the owner, habits for everyone else. */
export function DefaultRedirect({ financePath = '/finance/overview' }: { financePath?: string }) {
  const { isOwner } = useAuth()
  return <Navigate to={isOwner ? financePath : NON_OWNER_HOME} replace />
}
