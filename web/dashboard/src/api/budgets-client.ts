import { supabase } from '../lib/supabase';
import {
  createBudget as _createBudget,
  deleteBudget as _deleteBudget,
  fetchAlertSettings as _fetchAlertSettings,
  fetchBudgets as _fetchBudgets,
  fetchBudgetStatus as _fetchBudgetStatus,
  updateAlertSettings as _updateAlertSettings,
  updateBudget as _updateBudget,
  type AlertSettings,
  type Budget,
} from '@personal-dashboard/supabase-queries';

export type { AlertSettings, Budget, BudgetStatus } from '@personal-dashboard/supabase-queries';

/** Same rpc the purchase alerts use, so the page and the push show the same numbers. */
export const fetchBudgetStatus = (asOf?: string) => _fetchBudgetStatus(supabase, asOf);

export const fetchBudgets = () => _fetchBudgets(supabase);

export const createBudget = (input: { categoryId: number; label: string; emoji: string; monthlyLimit: number }) =>
  _createBudget(supabase, input);

export const updateBudget = (
  id: number,
  patch: Partial<Pick<Budget, 'label' | 'emoji' | 'monthlyLimit' | 'isActive'>>,
) => _updateBudget(supabase, id, patch);

export const deleteBudget = (id: number) => _deleteBudget(supabase, id);

export const fetchAlertSettings = () => _fetchAlertSettings(supabase);

export const updateAlertSettings = (patch: Partial<AlertSettings>) => _updateAlertSettings(supabase, patch);
