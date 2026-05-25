import { supabase } from '../lib/supabase';
import {
  fetchCategories as _fetchCategories,
  createCategory as _createCategory,
  updateCategory as _updateCategory,
  deleteCategory as _deleteCategory,
} from '@personal-dashboard/supabase-queries';

export type { Category } from '@personal-dashboard/supabase-queries';

export const fetchCategories = () => _fetchCategories(supabase);

export const createNewCategory = (
  _id: number, // ignored — Postgres assigns via sequence
  name: string,
  icon: string,
  color: string,
  description?: string,
  isDefault?: boolean,
) => _createCategory(supabase, name, icon, color, description, isDefault);

export const updateExistingCategory = (
  id: number,
  updates: { name?: string; icon?: string; color?: string; description?: string },
) => _updateCategory(supabase, id, updates);

export const deleteExistingCategory = (id: number) => _deleteCategory(supabase, id);

// Kept for backward compatibility — callers that still reference this can be migrated later
export async function getNextCategoryId(): Promise<number> {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.id ?? 0) + 1;
}
