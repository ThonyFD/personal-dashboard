import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUnresolvedAlerts, resolveAlert } from '../api/supabase-data-client';
import type { SystemAlert } from '../api/supabase-data-client';
import './AlertBanner.css';

const SEVERITY_ICON: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '🚨',
};

export default function AlertBanner() {
  const queryClient = useQueryClient();

  const { data: alerts = [] } = useQuery<SystemAlert[]>({
    queryKey: ['system-alerts'],
    queryFn: fetchUnresolvedAlerts,
    refetchInterval: 5 * 60 * 1000,
  });

  const { mutate: dismiss } = useMutation({
    mutationFn: (id: number) => resolveAlert(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['system-alerts'] }),
  });

  if (alerts.length === 0) return null;

  return (
    <div className="alert-banner-container">
      {alerts.map((alert) => (
        <div key={alert.id} className={`alert-banner alert-banner--${alert.severity}`}>
          <span className="alert-banner__icon">{SEVERITY_ICON[alert.severity] ?? '⚠️'}</span>
          <div className="alert-banner__body">
            <strong>{alert.title}</strong>
            {alert.type === 'duplicate_merchants' && alert.details && (
              <span className="alert-banner__detail">
                {' — '}
                {(alert.details as any).duplicate_groups} grupos,{' '}
                {(alert.details as any).duplicate_records} registros extra.{' '}
                <a href="/merchants">Ver Merchants →</a>
              </span>
            )}
          </div>
          <button
            className="alert-banner__dismiss"
            onClick={() => dismiss(alert.id)}
            aria-label="Descartar alerta"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
