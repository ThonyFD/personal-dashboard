import { supabase } from '../lib/supabase';

export interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, icon, color, description, is_default, created_at')
    .order('name');

  if (error) throw error;

  return (data ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    color: c.color,
    description: c.description,
    isDefault: c.is_default ?? false,
    createdAt: c.created_at,
  }));
}

export async function createNewCategory(
  _id: number,  // ignored — Postgres assigns the ID via sequence
  name: string,
  icon: string,
  color: string,
  description?: string,
  isDefault?: boolean
): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .insert({ name, icon, color, description: description ?? null, is_default: isDefault ?? false });

  if (error) throw error;
}

export async function updateExistingCategory(
  id: number,
  updates: { name?: string; icon?: string; color?: string; description?: string }
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.icon !== undefined) patch.icon = updates.icon;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.description !== undefined) patch.description = updates.description;

  const { error } = await supabase.from('categories').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteExistingCategory(id: number): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// Kept for backward compatibility — no longer needed with sequences, but callers may still use it
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
