const Database = require('better-sqlite3');
const path = require('path');

// Connect to the SQLite database
const dbPath = path.resolve(__dirname, '../../nutrition.sqlite');
const db = new Database(dbPath);

// Create table if it doesn't exist yet (though the user already has it)
db.exec(`
  CREATE TABLE IF NOT EXISTS food_nutrition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_identifier TEXT NOT NULL UNIQUE,
    food_name TEXT NOT NULL,
    aliases TEXT NOT NULL,
    serving_size TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    fiber_g REAL NOT NULL DEFAULT 0,
    sodium_mg REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    iron_mg REAL NOT NULL DEFAULT 0,
    zinc_mg REAL NOT NULL DEFAULT 0,
    magnesium_mg REAL NOT NULL DEFAULT 0,
    calcium_mg REAL NOT NULL DEFAULT 0,
    potassium_mg REAL NOT NULL DEFAULT 0,
    VitaminD3_mg REAL NOT NULL DEFAULT 0,
    VitaminB12_mg REAL NOT NULL DEFAULT 0
  )
`);

const getFoodByKey = (key) => {
  const stmt = db.prepare('SELECT * FROM food_nutrition WHERE key_identifier = ?');
  return stmt.get(key);
};

const insertFood = (item) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO food_nutrition 
    (key_identifier, food_name, aliases, serving_size, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, iron_mg, zinc_mg, magnesium_mg, calcium_mg, potassium_mg, VitaminD3_mg, VitaminB12_mg)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Somi schema uses base_ prefix for these
  const info = stmt.run(
    item.key_identifier,
    item.key_identifier.replace(/_/g, ' '),
    JSON.stringify(item.aliases || []),
    item.base_unit || '100g',
    item.base_calories || 0,
    item.base_protein_g || 0,
    item.base_carbs_g || 0,
    item.base_fats_g || 0,
    item.base_fiber_g || 0,
    item.base_sodium_mg || 0,
    item.base_iron_mg || 0,
    item.base_zinc_mg || 0,
    item.base_magnesium_mg || 0,
    item.base_calcium_mg || 0,
    item.base_potassium_mg || 0,
    item.base_VitaminD3_mg || 0,
    item.base_VitaminB12_mg || 0
  );
  return info.changes;
};

module.exports = { db, getFoodByKey, insertFood };
