-- Populate initial categories from the hardcoded list in the frontend
-- Run this after applying migration 002_add_categories_table.sql

INSERT INTO categories (id, name, icon, color, description, is_default) VALUES
(1, 'Food & Dining', '🍽️', '#FF6B6B', 'Restaurants, Coffee shops, Fast food, Bars', true),
(2, 'Groceries', '🛒', '#4ECB71', 'Supermarkets, Grocery stores', true),
(3, 'Transportation', '🚗', '#4ECDC4', 'Uber, Gas stations, Parking, Tolls', true),
(4, 'Entertainment', '🎮', '#9B59B6', 'Netflix, Gaming, Movies, Streaming services', true),
(5, 'Shopping', '🛍️', '#F39C12', 'Amazon, Retail stores, Clothing', true),
(6, 'Bills & Utilities', '💡', '#3498DB', 'Electric, Water, Internet, Phone', true),
(7, 'Healthcare', '🏥', '#E74C3C', 'Hospitals, Pharmacies, Doctors', true),
(8, 'Travel', '✈️', '#1ABC9C', 'Hotels, Airlines, Airbnb', true),
(9, 'Education', '📚', '#2ECC71', 'Schools, Universities, Online courses', true),
(10, 'Services', '🔧', '#95A5A6', 'Repairs, Cleaning, Salons', true),
(11, 'Subscriptions', '📱', '#E67E22', 'Monthly memberships, Recurring services', true),
(12, 'Transfers', '💸', '#34495E', 'Yappy, Bank transfers, P2P payments', true),
(13, 'Investment', '📈', '#27AE60', 'Admiral Markets, Brokers, Trading platforms, Crypto exchanges', true),
(14, 'Pago Mensual', '💳', '#8E44AD', 'Loan payments, Mortgages, Financing', true),
(15, 'Other', '📦', '#95A5A6', 'Uncategorized transactions', true)
ON CONFLICT (name) DO NOTHING;

-- Reset the sequence to continue from the last inserted ID
SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
