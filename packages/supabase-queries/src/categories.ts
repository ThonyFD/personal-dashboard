import type { SupabaseClient } from '@supabase/supabase-js';
import type { Category } from './types.js';

export async function fetchCategories(client: SupabaseClient): Promise<Category[]> {
  const { data, error } = await client
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

export async function createCategory(
  client: SupabaseClient,
  name: string,
  icon: string,
  color: string,
  description?: string,
  isDefault?: boolean,
): Promise<void> {
  const { error } = await client
    .from('categories')
    .insert({ name, icon, color, description: description ?? null, is_default: isDefault ?? false });
  if (error) throw error;
}

export async function updateCategory(
  client: SupabaseClient,
  id: number,
  updates: { name?: string; icon?: string; color?: string; description?: string },
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.icon !== undefined) patch.icon = updates.icon;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.description !== undefined) patch.description = updates.description;

  const { error } = await client.from('categories').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(client: SupabaseClient, id: number): Promise<void> {
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}
