const Database = require('better-sqlite3');
const path = require('path');

// Connect to the SQLite database file
const dbPath = path.resolve(__dirname, '../../nutrition.sqlite');
const db = new Database(dbPath);

// Initialize the database schema
function initDB() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS food_nutrition (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_identifier TEXT UNIQUE NOT NULL,
        food_name TEXT NOT NULL,
        aliases TEXT NOT NULL, -- Stored as JSON string
        serving_size TEXT NOT NULL,
        calories REAL NOT NULL DEFAULT 0,
        protein_g REAL NOT NULL DEFAULT 0,
        carbs_g REAL NOT NULL DEFAULT 0,
        fat_g REAL NOT NULL DEFAULT 0,
        fiber_g REAL NOT NULL DEFAULT 0,
        sodium_mg REAL NOT NULL DEFAULT 0,
        iron_mg REAL NOT NULL DEFAULT 0,
        zinc_mg REAL NOT NULL DEFAULT 0,
        magnesium_mg REAL NOT NULL DEFAULT 0,
        calcium_mg REAL NOT NULL DEFAULT 0,
        potassium_mg REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;
  db.exec(createTableQuery);
}

// Get nutrition by keyword/alias (simple LIKE query)
function findFoodNutrition(keyword) {
  const query = `
    SELECT * FROM food_nutrition 
    WHERE key_identifier = ? 
    OR food_name LIKE ? 
    OR aliases LIKE ?
    LIMIT 1
  `;
  const likeKeyword = `%${keyword}%`;
  return db.prepare(query).get(keyword, likeKeyword, likeKeyword);
}

// Save a new food item (usually from AI's catalog_additions)
function saveFoodNutrition(item) {
  const query = `
    INSERT OR IGNORE INTO food_nutrition (
      key_identifier, 
      food_name, 
      aliases, 
      serving_size, 
      calories, 
      protein_g, 
      carbs_g, 
      fat_g, 
      fiber_g, 
      sodium_mg,
      iron_mg,
      zinc_mg,
      magnesium_mg,
      calcium_mg,
      potassium_mg
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const stmt = db.prepare(query);
  
  // Extract data (using fallback values if missing)
  const keyIdentifier = item.key_identifier || item.food_name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const aliasesStr = JSON.stringify(item.aliases || []);
  
  stmt.run(
    keyIdentifier,
    item.food_name || keyIdentifier,
    aliasesStr,
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
    item.base_potassium_mg || 0
  );
}

// Initialize on startup
initDB();

module.exports = {
  db,
  findFoodNutrition,
  saveFoodNutrition
};
