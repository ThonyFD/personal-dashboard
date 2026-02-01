import { useState, useEffect } from 'react';
import { fetchTransactions, fetchStats } from '../api/dataconnect-client';
import { connectorConfig } from '../generated/esm/index.esm.js';

export default function Debug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  const runTests = async () => {
    setTesting(true);
    setLogs([]);

    try {
      addLog('Starting diagnostic tests...');

      // Test 1: Environment variables
      addLog('--- Environment Variables ---');
      addLog(`VITE_FIREBASE_PROJECT_ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'NOT SET'}`);
      addLog(`VITE_FIREBASE_API_KEY: ${import.meta.env.VITE_FIREBASE_API_KEY ? 'SET' : 'NOT SET'}`);
      addLog(`VITE_FIREBASE_AUTH_DOMAIN: ${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'NOT SET'}`);

      // Test 2: Connector Config
      addLog('--- Data Connect Configuration ---');
      addLog(`Service: ${connectorConfig.service}`);
      addLog(`Connector: ${connectorConfig.connector}`);
      addLog(`Location: ${connectorConfig.location}`);

      // Test 3: Fetch transactions
      addLog('--- Testing fetchTransactions ---');
      addLog('Attempting to fetch 5 transactions...');

      const transactions = await fetchTransactions(5);
      addLog(`✅ Success! Retrieved ${transactions.length} transactions`);

      if (transactions.length > 0) {
        addLog(`First transaction: ${JSON.stringify(transactions[0], null, 2)}`);
      }

      // Test 4: Fetch stats
      addLog('--- Testing fetchStats ---');
      addLog('Attempting to fetch stats...');

      const stats = await fetchStats();
      addLog(`✅ Success! Stats: ${JSON.stringify(stats, null, 2)}`);

      addLog('--- All Tests Completed Successfully ---');
    } catch (error: any) {
      addLog(`❌ ERROR: ${error.message}`);
      addLog(`Error stack: ${error.stack}`);
      addLog(`Error details: ${JSON.stringify(error, null, 2)}`);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Debug Dashboard</h1>

      <button
        onClick={runTests}
        disabled={testing}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          marginBottom: '20px',
          backgroundColor: testing ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: testing ? 'not-allowed' : 'pointer'
        }}
      >
        {testing ? 'Testing...' : 'Run Tests'}
      </button>

      <div style={{
        backgroundColor: '#000',
        color: '#0f0',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxHeight: '600px',
        overflow: 'auto'
      }}>
        {logs.length === 0 ? (
          <div>Click "Run Tests" to start diagnostics...</div>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} style={{ marginBottom: '4px' }}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
