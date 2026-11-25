import React from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import './NotificationSettings.css';

export const NotificationSettings: React.FC = () => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <div className="notification-settings">
        <div className="notification-unsupported">
          ⚠️ Tu navegador no soporta notificaciones push
        </div>
      </div>
    );
  }

  return (
    <div className="notification-settings">
      <div className="notification-header">
        <h3>🔔 Recordatorios de Pagos</h3>
        <p>Recibe notificaciones sobre tus pagos pendientes</p>
      </div>

      <div className="notification-status">
        <div className="status-item">
          <span className="label">Este dispositivo:</span>
          <span className={`badge ${isSubscribed ? 'active' : 'inactive'}`}>
            {isSubscribed ? '✓ Activo' : '○ Desactivado'}
          </span>
        </div>
        <div className="status-item">
          <span className="label">Permisos:</span>
          <span className={`badge ${permission === 'granted' ? 'active' : 'inactive'}`}>
            {permission === 'granted'
              ? '✓ Concedidos'
              : permission === 'denied'
                ? '✗ Denegados'
                : '○ Pendiente'}
          </span>
        </div>
      </div>

      <div className="notification-schedule">
        <p>📅 <strong>Horario:</strong> 9:00 AM y 6:00 PM (hora de Panamá)</p>
        <p>📋 <strong>Contenido:</strong> Pagos pendientes de hoy + próximos 3 días</p>
      </div>

      {error && (
        <div className="notification-error">
          ⚠️ {error}
        </div>
      )}

      {permission === 'denied' && (
        <div className="notification-warning">
          ⚠️ Has bloqueado las notificaciones. Debes habilitarlas en la configuración del navegador.
        </div>
      )}

      <div className="notification-actions">
        {isSubscribed ? (
          <button
            onClick={unsubscribe}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            {isLoading ? 'Desactivando...' : '🔕 Desactivar Notificaciones'}
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={isLoading || permission === 'denied'}
            className="btn btn-primary"
          >
            {isLoading ? 'Activando...' : '🔔 Activar Notificaciones'}
          </button>
        )}
      </div>
    </div>
  );
};
