import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMerchantsPaginated, updateMerchantCategoryById } from '../api/dataconnect-client'
import { formatCurrency } from '../utils/format'
import { getCategoryColor, getCategoryIcon } from '../utils/categories'
import { fetchCategories } from '../api/categories-client'
import { useState, useEffect } from 'react'

export default function Merchants() {
  const [editingMerchant, setEditingMerchant] = useState<number | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(15) // Default to "Other" (ID: 15)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState('') // Local input value
  const [searchTerm, setSearchTerm] = useState('') // Actual search term used in query
  const [categoryFilter, setCategoryFilter] = useState('')
  const [pageSize] = useState(50)
  const [isSearching, setIsSearching] = useState(false)

  const queryClient = useQueryClient()

  const { data: paginatedData, isLoading, error } = useQuery({
    queryKey: ['merchants', currentPage, searchTerm, categoryFilter],
    queryFn: async () => {
      setIsSearching(true)
      try {
        const result = await fetchMerchantsPaginated(currentPage, pageSize, searchTerm, categoryFilter)
        return result
      } finally {
        setIsSearching(false)
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      updateMerchantCategoryById(merchantId, categoryId),
    onMutate: async ({ merchantId, categoryId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['merchants', currentPage, searchTerm, categoryFilter] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['merchants', currentPage, searchTerm, categoryFilter])

      // Find the category object
      const category = categories.find(c => c.id === categoryId)

      // Optimistically update the cache
      queryClient.setQueryData(['merchants', currentPage, searchTerm, categoryFilter], (old: any) => {
        if (!old) return old
        return {
          ...old,
          merchants: old.merchants.map((merchant: any) =>
            merchant.id === merchantId ? {
              ...merchant,
              categoryId,
              categoryRef: category
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
      // Don't invalidate - optimistic update already updated the cache
    },
    onError: (error, _variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData) {
        queryClient.setQueryData(['merchants', currentPage, searchTerm, categoryFilter], context.previousData)
      }
      console.error('Failed to update category:', error)
      alert('Failed to update category. Please try again.')
    },
  })

  const handleEditCategory = (merchantId: number, currentCategoryId: number | null) => {
    setEditingMerchant(merchantId)
    setSelectedCategoryId(currentCategoryId || 15) // Default to "Other" (ID: 15)
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

  if (isLoading) return <div className="loading">Loading merchants...</div>
  if (error) return <div className="error">Error loading merchants: {error.message}</div>

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Merchants ({totalCount})</h1>
        <div style={{ fontSize: '0.85rem', color: '#666' }}>
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
              border: '1px solid #ddd',
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
              backgroundColor: isSearching ? '#ccc' : '#2196F3',
              color: 'white',
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
                  border: '2px solid #fff',
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
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem',
              flex: '1 1 auto',
              minWidth: '150px'
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id.toString()}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          {updateCategoryMutation.isPending && (
            <div style={{ color: '#2196F3', fontSize: '0.85rem' }}>
              Updating...
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Merchant</th>
              <th>Category</th>
              <th>Transactions</th>
              <th>Total Amount</th>
              <th>Avg per Transaction</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {merchants.map((merchant) => {
              const avgAmount = (merchant.transaction_count || 0) > 0
                ? (merchant.total_amount || 0) / (merchant.transaction_count || 1)
                : 0;

              const isEditing = editingMerchant === merchant.id;

              return (
                <tr key={merchant.id}>
                  <td style={{ fontWeight: 'bold' }}>
                    {merchant.name}
                    <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.25rem' }}>
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
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                          }}
                        >
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icon} {cat.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveCategory(merchant.id)}
                          disabled={updateCategoryMutation.isPending}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#4CAF50',
                            color: 'white',
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
                            backgroundColor: '#f44336',
                            color: 'white',
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
                          backgroundColor: merchant.categoryRef ? merchant.categoryRef.color + '20' : '#95A5A620',
                          color: merchant.categoryRef ? merchant.categoryRef.color : '#95A5A6',
                          fontWeight: '500',
                          fontSize: '0.9rem',
                        }}
                      >
                        <span>{merchant.categoryRef ? merchant.categoryRef.icon : '📦'}</span>
                        <span>{merchant.categoryRef ? merchant.categoryRef.name : 'Uncategorized'}</span>
                      </div>
                    )}
                  </td>
                  <td>{merchant.transaction_count || 0}</td>
                  <td style={{ fontWeight: 'bold' }}>
                    ${formatCurrency(merchant.total_amount || 0)}
                  </td>
                  <td>
                    ${formatCurrency(avgAmount)}
                  </td>
                  <td>
                    {!isEditing && merchant.inDatabase ? (
                      <button
                        onClick={() => handleEditCategory(merchant.id, merchant.categoryId)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Edit
                      </button>
                    ) : !isEditing ? (
                      <span style={{ fontSize: '0.85rem', color: '#ff9800', fontWeight: '500' }}>
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
            <span style={{ fontSize: '0.85rem', color: '#666', textAlign: 'center' }}>
              Page {currentPage} {totalPages > 0 ? `of ${totalPages}` : ''} ({totalCount > merchants.length ? `${totalCount}+` : totalCount} merchants)
            </span>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '0.4rem 0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
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
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
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
