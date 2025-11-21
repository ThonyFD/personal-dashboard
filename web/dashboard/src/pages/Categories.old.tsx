import { useState } from 'react'
import { DEFAULT_CATEGORIES, getAllCategories, getCategoryColor, getCategoryIcon, saveCustomCategory, deleteCustomCategory } from '../utils/categories'

export default function Categories() {
  const [newCategory, setNewCategory] = useState('')
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const all = getAllCategories()
    return all.filter(c => !DEFAULT_CATEGORIES.includes(c as any))
  })

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      saveCustomCategory(newCategory.trim())
      setCustomCategories([...customCategories, newCategory.trim()])
      setNewCategory('')
    }
  }

  const handleDeleteCategory = (category: string) => {
    if (confirm(`Are you sure you want to delete the category "${category}"?`)) {
      deleteCustomCategory(category)
      setCustomCategories(customCategories.filter(c => c !== category))
    }
  }

  return (
    <div>
      <h1>Category Management</h1>

      {/* Add New Category Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Add New Category</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Category Name
            </label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder="e.g., Investment, Insurance, Taxes..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
            />
          </div>
          <button
            onClick={handleAddCategory}
            disabled={!newCategory.trim()}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: newCategory.trim() ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              fontWeight: '500',
              opacity: newCategory.trim() ? 1 : 0.5,
            }}
          >
            Add Category
          </button>
        </div>
      </div>

      {/* Custom Categories Section */}
      {customCategories.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h2>Your Custom Categories</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '1rem'
          }}>
            {customCategories.map((category) => (
              <div
                key={category}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `2px solid ${getCategoryColor(category)}40`,
                  backgroundColor: getCategoryColor(category) + '10',
                  position: 'relative',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>{getCategoryIcon(category)}</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: getCategoryColor(category),
                    fontSize: '1.1rem'
                  }}>
                    {category}
                  </span>
                </div>
                <button
                  onClick={() => handleDeleteCategory(category)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.5rem',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                >
                  Delete
                </button>
                <div style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: getCategoryColor(category),
                  borderRadius: '2px',
                  marginTop: '0.5rem'
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Categories Section */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Default Categories</h2>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          These are the built-in categories that come with auto-categorization rules.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          {DEFAULT_CATEGORIES.map((category) => (
            <div
              key={category}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${getCategoryColor(category)}40`,
                backgroundColor: getCategoryColor(category) + '10',
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1.5rem' }}>{getCategoryIcon(category)}</span>
                <span style={{
                  fontWeight: 'bold',
                  color: getCategoryColor(category),
                  fontSize: '1.1rem'
                }}>
                  {category}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: getCategoryColor(category),
                borderRadius: '2px',
                marginTop: '0.5rem'
              }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Auto-Categorization</h2>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          Merchants are automatically categorized based on their name. You can always edit the category manually in the Merchants page.
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Category Examples:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Food & Dining') }}>
              {getCategoryIcon('Food & Dining')} Food & Dining:
            </strong>
            {' '}Restaurants, Coffee shops, Fast food, Bars
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Groceries') }}>
              {getCategoryIcon('Groceries')} Groceries:
            </strong>
            {' '}Supermarkets, Grocery stores
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Transportation') }}>
              {getCategoryIcon('Transportation')} Transportation:
            </strong>
            {' '}Uber, Gas stations, Parking, Tolls
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Entertainment') }}>
              {getCategoryIcon('Entertainment')} Entertainment:
            </strong>
            {' '}Netflix, Gaming, Movies, Streaming services
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Shopping') }}>
              {getCategoryIcon('Shopping')} Shopping:
            </strong>
            {' '}Amazon, Retail stores, Clothing
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Bills & Utilities') }}>
              {getCategoryIcon('Bills & Utilities')} Bills & Utilities:
            </strong>
            {' '}Electric, Water, Internet, Phone
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Healthcare') }}>
              {getCategoryIcon('Healthcare')} Healthcare:
            </strong>
            {' '}Hospitals, Pharmacies, Doctors
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Travel') }}>
              {getCategoryIcon('Travel')} Travel:
            </strong>
            {' '}Hotels, Airlines, Airbnb
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Education') }}>
              {getCategoryIcon('Education')} Education:
            </strong>
            {' '}Schools, Universities, Online courses
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Investment') }}>
              {getCategoryIcon('Investment')} Investment:
            </strong>
            {' '}Admiral Markets, Brokers, Trading platforms, Crypto exchanges
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Subscriptions') }}>
              {getCategoryIcon('Subscriptions')} Subscriptions:
            </strong>
            {' '}Monthly memberships, Recurring services
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Transfers') }}>
              {getCategoryIcon('Transfers')} Transfers:
            </strong>
            {' '}Yappy, Bank transfers, P2P payments
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong style={{ color: getCategoryColor('Services') }}>
              {getCategoryIcon('Services')} Services:
            </strong>
            {' '}Repairs, Cleaning, Salons
          </li>
        </ul>
      </div>
    </div>
  )
}
