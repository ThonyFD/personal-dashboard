import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { formatUsd, panamaDate } from '@personal-dashboard/supabase-queries'
import { fetchMerchants, recordManualTransfer } from '../api/supabase-data-client'
import {
  MANUAL_TRANSFER_STALE_QUERIES,
  browserStorage,
  readLastMerchantId,
  resolveMerchant,
  saveLastMerchantId,
} from '../lib/manual-transfer'

// Bank-app transfers that send no email. Saved as a TRANSFER of the chosen
// merchant, so it counts in that merchant's category and budget. No push alert.

interface ManualTransferFormProps {
  onSaved: (message: string) => void
  onCancel: () => void
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid var(--c-hairline)',
  borderRadius: '4px',
  fontSize: '0.9rem',
}

const labelStyle = { display: 'block', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.9rem' }

function newKey(): string {
  return crypto.randomUUID()
}

export function ManualTransferForm({ onSaved, onCancel }: ManualTransferFormProps) {
  const queryClient = useQueryClient()
  const [merchantText, setMerchantText] = useState('')
  const [amount, setAmount] = useState('')
  const [txnDate, setTxnDate] = useState(() => panamaDate(new Date()))
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  // One key per form: a double click saves a single row.
  const [idempotencyKey, setIdempotencyKey] = useState(newKey)

  const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ['merchants-all'],
    queryFn: fetchMerchants,
    staleTime: 5 * 60 * 1000,
  })

  // Preselect the merchant of the last saved transfer once the list arrives.
  useEffect(() => {
    if (merchantText || merchants.length === 0) return
    const lastId = readLastMerchantId()
    const last = lastId === null ? undefined : merchants.find((m) => m.id === lastId)
    if (last) setMerchantText(last.name)
  }, [merchants, merchantText])

  const mutation = useMutation({
    mutationFn: recordManualTransfer,
    onSuccess: (_id, variables) => {
      saveLastMerchantId(browserStorage(), variables.merchantId)
      for (const key of MANUAL_TRANSFER_STALE_QUERIES) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      onSaved(`Transferencia de ${formatUsd(variables.amount)} a ${variables.merchantName} guardada.`)
      setAmount('')
      setNote('')
      setError(null)
      setIdempotencyKey(newKey())
    },
    onError: (err: Error) => setError(err.message || 'No se pudo guardar la transferencia.'),
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const merchant = resolveMerchant(merchants, merchantText)
    if (!merchant) {
      setError('Elige un comercio de la lista.')
      return
    }
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Escribe un monto mayor que cero.')
      return
    }
    setError(null)
    mutation.mutate({
      merchantId: merchant.id,
      merchantName: merchant.name,
      amount: value,
      txnDate,
      description: note,
      idempotencyKey,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label htmlFor="manual-transfer-merchant" style={labelStyle}>Comercio o persona</label>
          <input
            id="manual-transfer-merchant"
            type="text"
            list="manual-transfer-merchants"
            placeholder={merchantsLoading ? 'Cargando...' : 'Escribe para buscar'}
            value={merchantText}
            onChange={(e) => setMerchantText(e.target.value)}
            autoComplete="off"
            style={inputStyle}
            required
          />
          <datalist id="manual-transfer-merchants">
            {merchants.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="manual-transfer-amount" style={labelStyle}>Monto</label>
          <input
            id="manual-transfer-amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div>
          <label htmlFor="manual-transfer-date" style={labelStyle}>Fecha</label>
          <input
            id="manual-transfer-date"
            type="date"
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            style={inputStyle}
            required
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="manual-transfer-note" style={labelStyle}>Nota</label>
          <input
            id="manual-transfer-note"
            type="text"
            placeholder="Opcional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: '0.75rem', color: 'var(--c-negative)', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        <button
          type="submit"
          disabled={mutation.isPending}
          style={{
            padding: '0.5rem 1rem',
            cursor: mutation.isPending ? 'not-allowed' : 'pointer',
            backgroundColor: mutation.isPending ? 'var(--c-muted)' : 'var(--c-primary)',
            color: 'var(--c-on-accent)',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar transferencia'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            backgroundColor: 'var(--c-surface)',
            color: 'var(--c-text-2)',
            border: '1px solid var(--c-hairline)',
            borderRadius: '4px',
            fontSize: '0.9rem',
          }}
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
