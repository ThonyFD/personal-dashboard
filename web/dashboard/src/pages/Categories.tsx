import { useState, useEffect } from 'react'
import {
  fetchCategories,
  createNewCategory,
  updateExistingCategory,
  deleteExistingCategory,
  getNextCategoryId,
  Category,
} from '../api/categories-client'
import { populateDefaultCategories } from '../utils/populate-categories'

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state for new category
  const [newCategory, setNewCategory] = useState({
    name: '',
    icon: '',
    color: '#95A5A6',
    description: '',
  })

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    icon: '',
    color: '',
    description: '',
  })

  // Load categories on mount
  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchCategories()
      setCategories(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load categories')
      console.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      alert('Please enter a category name')
      return
    }

    if (!newCategory.icon.trim()) {
      alert('Please enter an icon (emoji)')
      return
    }

    try {
      const nextId = await getNextCategoryId()
      await createNewCategory(
        nextId,
        newCategory.name.trim(),
        newCategory.icon.trim(),
        newCategory.color,
        newCategory.description.trim() || undefined
      )

      // Reset form
      setNewCategory({
        name: '',
        icon: '',
        color: '#95A5A6',
        description: '',
      })

      // Reload categories
      await loadCategories()
      alert('Category created successfully!')
    } catch (err: any) {
      alert(`Error creating category: ${err.message}`)
      console.error('Error creating category:', err)
    }
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      icon: category.icon,
      color: category.color,
      description: category.description || '',
    })
  }

  const handleUpdate = async () => {
    if (editingId === null) return

    try {
      await updateExistingCategory(editingId, {
        name: editForm.name.trim(),
        icon: editForm.icon.trim(),
        color: editForm.color,
        description: editForm.description.trim() || undefined,
      })

      setEditingId(null)
      await loadCategories()
      alert('Category updated successfully!')
    } catch (err: any) {
      alert(`Error updating category: ${err.message}`)
      console.error('Error updating category:', err)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    if (category.isDefault) {
      alert('Cannot delete default categories')
      return
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"? This will affect all merchants using this category.`)) {
      return
    }

    try {
      await deleteExistingCategory(category.id)
      await loadCategories()
      alert('Category deleted successfully!')
    } catch (err: any) {
      alert(`Error deleting category: ${err.message}`)
      console.error('Error deleting category:', err)
    }
  }

  const defaultCategories = categories.filter(c => c.isDefault)
  const customCategories = categories.filter(c => !c.isDefault)

  if (loading) {
    return (
      <div>
        <h1>Category Management</h1>
        <p>Loading categories...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1>Category Management</h1>
        <div className="card" style={{ backgroundColor: '#fee', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: '#c00', margin: 0 }}>Error: {error}</p>
          <button onClick={loadCategories} style={{ marginTop: '1rem' }}>Retry</button>
        </div>
      </div>
    )
  }

  const handlePopulateDefaults = async () => {
    if (!confirm('This will create 15 default categories. Continue?')) {
      return
    }
    try {
      await populateDefaultCategories()
      await loadCategories()
      alert('Default categories created successfully!')
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  return (
    <div>
      <h1>Category Management</h1>

      {/* Show populate button if no categories */}
      {categories.length === 0 && (
        <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fff3cd', padding: '1.5rem' }}>
          <h2 style={{ marginTop: 0 }}>No Categories Found</h2>
          <p>It looks like you haven't created any categories yet. You can either:</p>
          <ul>
            <li>Click the button below to create 15 default categories automatically</li>
            <li>Or manually create categories using the form below</li>
          </ul>
          <button
            onClick={handlePopulateDefaults}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500',
            }}
          >
            Create 15 Default Categories
          </button>
        </div>
      )}

      {/* Add New Category Section - Mobile Responsive */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Add New Category</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
              Category Name *
            </label>
            <input
              type="text"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              placeholder="e.g., Investment, Insurance, Taxes..."
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Icon (Emoji) *
              </label>
              <input
                type="text"
                value={newCategory.icon}
                onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                placeholder="e.g., 📊"
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
                Color
              </label>
              <input
                type="color"
                value={newCategory.color}
                onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                style={{
                  width: '100%',
                  height: '2.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: '500', fontSize: '0.9rem' }}>
              Description
            </label>
            <input
              type="text"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              placeholder="Optional description"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
              }}
            />
          </div>
        </div>
        <button
          onClick={handleAddCategory}
          disabled={!newCategory.name.trim() || !newCategory.icon.trim()}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: newCategory.name.trim() && newCategory.icon.trim() ? 'pointer' : 'not-allowed',
            fontSize: '0.9rem',
            fontWeight: '500',
            opacity: newCategory.name.trim() && newCategory.icon.trim() ? 1 : 0.5,
            width: '100%'
          }}
        >
          Add Category
        </button>
      </div>

      {/* Custom Categories Section - Mobile Responsive */}
      {customCategories.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2>Your Custom Categories ({customCategories.length})</h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem'
          }}>
            {customCategories.map((category) => (
              <div
                key={category.id}
                style={{
                  padding: '1rem',
                  borderRadius: '8px',
                  border: `2px solid ${category.color}40`,
                  backgroundColor: category.color + '10',
                  position: 'relative',
                }}
              >
                {editingId === category.id ? (
                  // Edit mode
                  <div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        value={editForm.icon}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                        maxLength={10}
                        style={{ width: '60px', padding: '0.25rem', fontSize: '1.2rem' }}
                      />
                      <input
                        type="color"
                        value={editForm.color}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        style={{ width: '60px', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="Description"
                        style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={handleUpdate}
                        style={{
                          flex: 1,
                          padding: '0.25rem',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{
                          flex: 1,
                          padding: '0.25rem',
                          backgroundColor: '#999',
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
                  </div>
                ) : (
                  // View mode
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                      <span style={{
                        fontWeight: 'bold',
                        color: category.color,
                        fontSize: '1.1rem'
                      }}>
                        {category.name}
                      </span>
                    </div>
                    {category.description && (
                      <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                        {category.description}
                      </p>
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      display: 'flex',
                      gap: '0.25rem',
                    }}>
                      <button
                        onClick={() => startEdit(category)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        style={{
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
                    </div>
                    <div style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: category.color,
                      borderRadius: '2px',
                      marginTop: '0.5rem'
                    }} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default Categories Section - Mobile Responsive */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Default Categories ({defaultCategories.length})</h2>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
          These are the built-in categories that come with auto-categorization rules.
          Default categories cannot be deleted, but you can edit their appearance.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1rem'
        }}>
          {defaultCategories.map((category) => (
            <div
              key={category.id}
              style={{
                padding: '1rem',
                borderRadius: '8px',
                border: `2px solid ${category.color}40`,
                backgroundColor: category.color + '10',
                position: 'relative',
              }}
            >
              {editingId === category.id ? (
                // Edit mode (same as custom categories)
                <div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={editForm.icon}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      maxLength={10}
                      style={{ width: '60px', padding: '0.25rem', fontSize: '1.2rem' }}
                    />
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      style={{ width: '60px', cursor: 'pointer' }}
                    />
                  </div>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      placeholder="Description"
                      style={{ width: '100%', padding: '0.25rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={handleUpdate}
                      style={{
                        flex: 1,
                        padding: '0.25rem',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{
                        flex: 1,
                        padding: '0.25rem',
                        backgroundColor: '#999',
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
                </div>
              ) : (
                // View mode
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: category.color,
                      fontSize: '1.1rem'
                    }}>
                      {category.name}
                    </span>
                  </div>
                  {category.description && (
                    <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                      {category.description}
                    </p>
                  )}
                  <button
                    onClick={() => startEdit(category)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                    }}
                  >
                    Edit
                  </button>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: category.color,
                    borderRadius: '2px',
                    marginTop: '0.5rem'
                  }} />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Category Usage</h2>
        <p style={{ color: '#666' }}>
          Categories are used to organize merchants and transactions. When you create or edit a merchant,
          you can assign it to a category. The dashboard analytics group transactions by category.
        </p>
      </div>
    </div>
  )
}
