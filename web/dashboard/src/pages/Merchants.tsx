import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, parse } from 'date-fns'
import { Link } from 'react-router-dom'
import type { MerchantLinkState } from './Transactions'
import {
  DEFAULT_MERCHANT_SORT,
  fetchMerchantsPaginated,
  markMerchantOwnAccountById,
  updateMerchantCategoryById,
} from '../api/supabase-data-client'
import type { MerchantSort, MerchantSortKey } from '../api/supabase-data-client'
import { formatCurrency } from '../utils/format'
import { getCategoryColor, getCategoryIcon } from '../utils/categories'
import { fetchCategories } from '../api/categories-client'
import { useState, useEffect } from 'react'

// Select value for "own account": transfers between the owner's own accounts,
// which count against no budget and belong to no category.
const OWN_ACCOUNT = -1

// Text columns start A to Z; numbers and dates start with the biggest / newest.
const FIRST_DIRECTION_ASCENDING: Record<MerchantSortKey, boolean> = {
  name: true,
  category: true,
  transaction_count: false,
  total_amount: false,
  avg_amount: false,
  last_txn_date: false,
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: MerchantSortKey
  sort: MerchantSort
  onSort: (key: MerchantSortKey) => void
}) {
  const active = sort.key === sortKey
  return (
    <th aria-sort={active ? (sort.ascending ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={`th-sort${active ? ' th-sort--active' : ''}`}
        onClick={() => onSort(sortKey)}
      >
        <span>{label}</span>
        <span className="th-sort__arrow" aria-hidden="true">
          {active ? (sort.ascending ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function formatTxnDate(date: string | null | undefined): string {
  return date ? format(parse(date, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy') : '-'
}

export default function Merchants() {
  const [editingMerchant, setEditingMerchant] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(15) // Default to "Other" (ID: 15)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('') // Local input value
  const [searchTerm, setSearchTerm] = useState('') // Actual search term used in query
  const [categoryFilter, setCategoryFilter] = useState('')
  const [pageSize] = useState(50)
  const [isSearching, setIsSearching] = useState(false)
  const [sort, setSort] = useState<MerchantSort>(DEFAULT_MERCHANT_SORT)

  const queryClient = useQueryClient()
  const merchantsQueryKey = ['merchants', currentPage, searchTerm, categoryFilter, sort.key, sort.ascending]

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: merchantsQueryKey,
    queryFn: async () => {
      setIsSearching(true)
      try {
        const result = await fetchMerchantsPaginated(currentPage, pageSize, searchTerm, categoryFilter, sort)
        return result
      } finally {
        setIsSearching(false)
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep the table on screen while another page or order loads.
    placeholderData: previousData => previousData,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  const merchants = paginatedData?.merchants || []
  const totalCount = paginatedData?.totalCount || 0
  const totalPages = paginatedData?.totalPages || 0

  const updateCategoryMutation = useMutation({
    mutationFn: ({ merchantId, categoryId }: { merchantId: number; categoryId: number }) =>
      categoryId === OWN_ACCOUNT
        ? markMerchantOwnAccountById(merchantId)
        : updateMerchantCategoryById(merchantId, categoryId),
    onMutate: async ({ merchantId, categoryId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: merchantsQueryKey })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(merchantsQueryKey)

      // Find the category object
      const category = categories.find(c => c.id === categoryId)

      // Optimistically update the cache
      queryClient.setQueryData(merchantsQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          merchants: old.merchants.map((merchant: any) =>
            merchant.id === merchantId ? {
              ...merchant,
              categoryId: categoryId === OWN_ACCOUNT ? null : categoryId,
              categoryRef: category,
              isOwnAccount: categoryId === OWN_ACCOUNT,
            } : merchant
          )
        }
      })

      // Return a context object with the snapshotted value
      return { previousData }
    },
    onSuccess: () => {
      setEditingMerchant(null)
      setSelectedCategoryId(15) // Reset to "Other"
    },
    onSettled: () => {
      // The optimistic update only touched the page on screen. Every other
      // cached page and sort order still has the old category, and sorting by
      // category moves the merchant, so refetch them all from the server.
      queryClient.invalidateQueries({ queryKey: ['merchants'] })
    },
    onError: (error, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(merchantsQueryKey, context.previousData)
      }
      console.error('Failed to update category:', error)
      alert('Failed to update category. Please try again.')
    },
  })

  const handleEditCategory = (merchantId: number, currentCategoryId: number | null, isOwnAccount?: boolean) => {
    setEditingMerchant(merchantId)
    setSelectedCategoryId(isOwnAccount ? OWN_ACCOUNT : currentCategoryId || 15) // Default to "Other" (ID: 15)
  }

  const handleSaveCategory = (merchantId: number) => {
    updateCategoryMutation.mutate({ merchantId, categoryId: selectedCategoryId })
  }

  const handleCancelEdit = () => {
    setEditingMerchant(null)
    setSelectedCategoryId(15)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setEditingMerchant(null) // Cancel any ongoing edits
    setSelectedCategoryId(15)
  }

  const handleSearch = () => {
    setSearchTerm(searchInput)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleSearchBlur = () => {
    // Only trigger search if the input value is different from the current search term
    if (searchInput !== searchTerm) {
      handleSearch()
    }
  }

  const handleCategoryFilterChange = (category: string) => {
    setCategoryFilter(category)
    setCurrentPage(1) // Reset to first page when filtering
  }

  const handleSort = (key: MerchantSortKey) => {
    setSort((prev) =>
      prev.key === key
        ? { key, ascending: !prev.ascending }
        : { key, ascending: FIRST_DIRECTION_ASCENDING[key] }
    )
    setCurrentPage(1) // A new order starts from the top
    setEditingMerchant(null)
    setSelectedCategoryId(15)
  }

  if (isLoading) return <div className="loading">Loading merchants...</div>
  if (error) return <div className="error">Error loading merchants: {error.message}</div>

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Merchants ({totalCount})</h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--c-text-2)' }}>
          Click Edit to change merchant category
        </div>
      </div>

      {/* Search and Filter Controls - Mobile Responsive */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Search merchants... (Press Enter or click Search)"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={handleSearchBlur}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--c-hairline)',
              borderRadius: '4px',
              fontSize: '0.9rem',
              flex: 1
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: isSearching ? 'var(--c-muted)' : 'var(--c-primary)',
              color: 'var(--c-on-accent)',
              border: 'none',
              borderRadius: '4px',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              minWidth: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isSearching ? (
              <>
                <span style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid var(--c-on-accent)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite'
                }} />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Search</span>
              </>
            )}
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={categoryFilter}
            onChange={(e) => handleCategoryFilterChange(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid var(--c-hairline)',
              borderRadius: '4px',
              fontSize: '0.9rem',
              flex: '1 1 auto',
              minWidth: '150px'
            }}
          >
            <option value="">All Categories</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          {updateCategoryMutation.isPending && (
            <div style={{ color: 'var(--c-primary)', fontSize: '0.85rem' }}>
              Updating...
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <SortableHeader label="Merchant" sortKey="name" sort={sort} onSort={handleSort} />
              <SortableHeader label="Category" sortKey="category" sort={sort} onSort={handleSort} />
              <SortableHeader label="Transactions" sortKey="transaction_count" sort={sort} onSort={handleSort} />
              <SortableHeader label="Total Amount" sortKey="total_amount" sort={sort} onSort={handleSort} />
              <SortableHeader label="Avg per Transaction" sortKey="avg_amount" sort={sort} onSort={handleSort} />
              <SortableHeader label="Last Transaction" sortKey="last_txn_date" sort={sort} onSort={handleSort} />
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((merchant) => {
              const isEditing = editingMerchant === merchant.id;

              return (
                <tr key={merchant.id}>
                  <td style={{ fontWeight: 'bold' }}>
                    {merchant.inDatabase ? (
                      <Link
                        className="merchant-link"
                        to={`/finance/transactions?merchant=${merchant.id}`}
                        state={{ merchantName: merchant.name } satisfies MerchantLinkState}
                        title="Show this merchant's transactions"
                      >
                        {merchant.name}
                      </Link>
                    ) : (
                      merchant.name
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--c-text-3)', marginTop: '0.25rem' }}>
                      ID: {merchant.id} {!merchant.inDatabase && '(temp)'}
                    </div>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                          value={selectedCategoryId}
                          onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
                          style={{
                            padding: '0.25rem 0.5rem',
                            border: '1px solid var(--c-hairline)',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                          }}
                        >
                          {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </option>
                          ))}
                          <option value={OWN_ACCOUNT}>🔁 Own account (not spending)</option>
                        </select>
                        <button
                          onClick={() => handleSaveCategory(merchant.id)}
                          disabled={updateCategoryMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'var(--c-green)',
                            color: 'var(--c-on-accent)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          {updateCategoryMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'var(--c-negative)',
                            color: 'var(--c-on-accent)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          backgroundColor: merchant.categoryRef ? merchant.categoryRef.color + '20' : 'color-mix(in srgb, var(--c-muted) 12%, transparent)',
                          color: merchant.categoryRef ? merchant.categoryRef.color : 'var(--c-muted)',
                          fontWeight: '500',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span>{merchant.isOwnAccount ? '🔁' : merchant.categoryRef ? merchant.categoryRef.icon : '📦'}</span>
                        <span>{merchant.isOwnAccount ? 'Own account' : merchant.categoryRef ? merchant.categoryRef.name : 'Uncategorized'}</span>
                      </div>
                    )}
                  </td>
                  <td>{merchant.transaction_count || 0}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    ${formatCurrency(merchant.total_amount || 0)}
                  </td>
                  <td>
                    ${formatCurrency(merchant.avg_amount || 0)}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {formatTxnDate(merchant.last_txn_date)}
                  </td>
                  <td>
                    {!isEditing && merchant.inDatabase ? (
                      <button
                        onClick={() => handleEditCategory(merchant.id, merchant.categoryId, merchant.isOwnAccount)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'var(--c-primary)',
                          color: 'var(--c-on-accent)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Edit
                      </button>
                    ) : !isEditing ? (
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-warning)', fontWeight: '500' }}>
                        Not in DB
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Controls - Mobile Responsive */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.75rem',
            marginTop: '0.75rem',
            padding: '0.75rem'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--c-text-2)', textAlign: 'center' }}>
              Page {currentPage} {totalPages > 0 ? `of ${totalPages}` : ''} ({totalCount > merchants.length ? `${totalCount}+` : totalCount} merchants)
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--c-hairline)',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? 'var(--c-surface-2)' : 'var(--c-surface)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid var(--c-hairline)',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? 'var(--c-surface-2)' : 'var(--c-surface)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
