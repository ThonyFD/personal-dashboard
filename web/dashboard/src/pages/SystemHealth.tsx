import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Types
interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: string; message?: string };
    lastSync: { status: string; lastSyncedAt?: string; historyId?: string; message?: string };
    recentActivity: { status: string; recentTransactions: number; recentEmails: number };
  };
}

interface SystemMetrics {
  emails: {
    total: number;
    last24h: number;
    last7d: number;
    latestReceivedAt: string | null;
  };
  transactions: {
    total: number;
    last24h: number;
    last7d: number;
    latestDate: string | null;
  };
  syncState: {
    lastSyncedAt: string | null;
    historyId: string | null;
  };
}

const INGESTOR_URL = import.meta.env.VITE_INGESTOR_URL || 'https://ingestor-iswgxwwvra-uc.a.run.app';

// Fetch system health
async function fetchSystemHealth(): Promise<SystemHealth> {
  const response = await fetch(`${INGESTOR_URL}/monitoring/health`);
  if (!response.ok) {
    throw new Error('Failed to fetch system health');
  }
  return response.json();
}

// Fetch system metrics
async function fetchSystemMetrics(): Promise<SystemMetrics> {
  const response = await fetch(`${INGESTOR_URL}/monitoring/metrics`);
  if (!response.ok) {
    throw new Error('Failed to fetch system metrics');
  }
  return response.json();
}

export default function SystemHealth() {
  const [autoRefresh, setAutoRefresh] = useState(false);

  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30s if enabled
  });

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: fetchSystemMetrics,
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const handleRefresh = () => {
    refetchHealth();
    refetchMetrics();
  };

  if (healthLoading || metricsLoading) {
    return <div className="loading">Loading system health...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#10b981'; // green
      case 'degraded':
      case 'warning':
        return '#f59e0b'; // orange
      case 'unhealthy':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'degraded':
      case 'warning':
        return '⚠️';
      case 'unhealthy':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>🔧 System Health</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={handleRefresh}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      {health && (
        <div
          style={{
            padding: '1.5rem',
            backgroundColor: getStatusColor(health.status) + '15',
            border: `2px solid ${getStatusColor(health.status)}`,
            borderRadius: '8px',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {getStatusEmoji(health.status)} Overall Status: {health.status.toUpperCase()}
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
            Last checked: {formatDistanceToNow(new Date(health.timestamp), { addSuffix: true })}
          </p>
        </div>
      )}

      {/* Health Checks */}
      {health && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>Health Checks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {/* Database Check */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: `2px solid ${getStatusColor(health.checks.database.status)}`,
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getStatusEmoji(health.checks.database.status)} Database
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Status: <strong>{health.checks.database.status}</strong>
              </p>
              {health.checks.database.message && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  {health.checks.database.message}
                </p>
              )}
            </div>

            {/* Last Sync Check */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: `2px solid ${getStatusColor(health.checks.lastSync.status)}`,
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getStatusEmoji(health.checks.lastSync.status)} Gmail Sync
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                Status: <strong>{health.checks.lastSync.status}</strong>
              </p>
              {health.checks.lastSync.historyId && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#666' }}>
                  History ID: {health.checks.lastSync.historyId}
                </p>
              )}
              {health.checks.lastSync.message && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#ef4444' }}>
                  {health.checks.lastSync.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div>
          <h2>System Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {/* Emails Metric */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>📧 Emails</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                {metrics.emails.total.toLocaleString()}
              </p>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                <p style={{ margin: '0.25rem 0' }}>Last 24h: {metrics.emails.last24h}</p>
                <p style={{ margin: '0.25rem 0' }}>Last 7d: {metrics.emails.last7d}</p>
                {metrics.emails.latestReceivedAt && (
                  <p style={{ margin: '0.25rem 0' }}>
                    Latest: {formatDistanceToNow(new Date(metrics.emails.latestReceivedAt), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Transactions Metric */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>💳 Transactions</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                {metrics.transactions.total.toLocaleString()}
              </p>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>
                <p style={{ margin: '0.25rem 0' }}>Last 24h: {metrics.transactions.last24h}</p>
                <p style={{ margin: '0.25rem 0' }}>Last 7d: {metrics.transactions.last7d}</p>
                {metrics.transactions.latestDate && (
                  <p style={{ margin: '0.25rem 0' }}>
                    Latest: {formatDistanceToNow(new Date(metrics.transactions.latestDate), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>

            {/* Sync State */}
            <div
              style={{
                padding: '1rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0' }}>🔄 Sync State</h3>
              {metrics.syncState.historyId && (
                <>
                  <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0.5rem 0', fontFamily: 'monospace' }}>
                    {metrics.syncState.historyId}
                  </p>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {metrics.syncState.lastSyncedAt && (
                      <p style={{ margin: '0.25rem 0' }}>
                        Last synced: {formatDistanceToNow(new Date(metrics.syncState.lastSyncedAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </>
              )}
              {!metrics.syncState.historyId && (
                <p style={{ color: '#ef4444', margin: '0.5rem 0' }}>No sync state found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
