-- Table definition for storing nutrition data per standard serving (e.g., 1 piece, 100g)
CREATE TABLE IF NOT EXISTS food_nutrition (
    id SERIAL PRIMARY KEY,
    food_name VARCHAR(255) NOT NULL,
    serving_size VARCHAR(100) NOT NULL, -- e.g., '1 roti', '100g'
    calories DECIMAL(10, 2) NOT NULL DEFAULT 0,
    protein_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
    carbs_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
    fat_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
    iron_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    zinc_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    magnesium_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    calcium_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    potassium_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    sodium_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    VitaminD3_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    VitaminB12_mg DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert example data for 1 Roti
-- If a user eats 10 rotis, the application logic will multiply these values by 10
INSERT INTO food_nutrition (
    food_name, 
    serving_size, 
    calories, 
    protein_g, 
    carbs_g, 
    fat_g, 
    iron_mg, 
    zinc_mg, 
    magnesium_mg, 
    calcium_mg, 
    potassium_mg, 
    sodium_mg,
    VitaminD3_mg,
    VitaminB12_mg
) VALUES (
    'Roti', 
    '1 piece (approx 30g)', 
    85.00,  -- kcal
    3.00,   -- protein in grams
    17.00,  -- carbs in grams
    0.80,   -- fat in grams
    0.90,   -- iron in mg
    0.40,   -- zinc in mg
    15.00,  -- magnesium in mg
    10.00,  -- calcium in mg
    60.00,  -- potassium in mg
    120.00, -- sodium in mg (varies if salt is added)
    0.00,   -- VitaminD3 in mg
    0.00    -- VitaminB12 in mg
);
