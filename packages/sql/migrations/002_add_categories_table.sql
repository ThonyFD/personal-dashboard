-- Migration: Add categories table
-- This migration creates a categories table to store category information
-- Previously categories were hardcoded in the frontend

-- Create categories table
CREATE TABLE categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(10) NOT NULL, -- Emoji icon
    color VARCHAR(7) NOT NULL, -- Hex color code (e.g., #FF6B6B)
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE, -- True for built-in categories
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for categories
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_is_default ON categories(is_default);

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add category_id foreign key to merchants table
-- First, add the column as nullable
ALTER TABLE merchants ADD COLUMN category_id BIGINT REFERENCES categories(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX idx_merchants_category_id ON merchants(category_id);

-- Comment for documentation
COMMENT ON TABLE categories IS 'Category definitions with icons and colors for merchant categorization';
COMMENT ON COLUMN categories.is_default IS 'True for built-in categories, false for user-created custom categories';
COMMENT ON COLUMN merchants.category_id IS 'Foreign key to categories table (replaces category VARCHAR)';
