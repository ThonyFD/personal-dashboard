// Categories API client for Data Connect
import { getDataConnect } from 'firebase/data-connect';
import {
  connectorConfig,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../generated/esm/index.esm.js';

// Initialize Data Connect
const dataConnect = getDataConnect(connectorConfig);

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

/**
 * Fetch all categories from the database
 */
export async function fetchCategories(): Promise<Category[]> {
  try {
    const result = await listCategories(dataConnect);

    return (result.data.categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      description: cat.description,
      isDefault: cat.isDefault || false,
      createdAt: cat.createdAt,
    }));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Create a new category
 */
export async function createNewCategory(
  id: number,
  name: string,
  icon: string,
  color: string,
  description?: string,
  isDefault?: boolean
): Promise<void> {
  try {
    await createCategory(dataConnect, {
      id,
      name,
      icon,
      color,
      description: description || null,
      isDefault: isDefault || false,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    throw error;
  }
}

/**
 * Update an existing category
 */
export async function updateExistingCategory(
  id: number,
  updates: {
    name?: string;
    icon?: string;
    color?: string;
    description?: string;
  }
): Promise<void> {
  try {
    await updateCategory(dataConnect, {
      id,
      name: updates.name || undefined,
      icon: updates.icon || undefined,
      color: updates.color || undefined,
      description: updates.description || undefined,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    throw error;
  }
}

/**
 * Delete a category
 */
export async function deleteExistingCategory(id: number): Promise<void> {
  try {
    await deleteCategory(dataConnect, { id });
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}

/**
 * Get next available category ID
 */
export async function getNextCategoryId(): Promise<number> {
  try {
    const categories = await fetchCategories();
    if (categories.length === 0) {
      return 1;
    }
    return Math.max(...categories.map(c => c.id)) + 1;
  } catch (error) {
    console.error('Error getting next category ID:', error);
    throw error;
  }
}
