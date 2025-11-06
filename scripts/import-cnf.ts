#!/usr/bin/env node
/**
 * Import Canadian Nutrient File (CNF)
 * 
 * CNF uses relational structure:
 * - FOOD NAME.csv (FoodID, FoodDescription)
 * - NUTRIENT AMOUNT.csv (FoodID, NutrientID, NutrientValue)
 * - NUTRIENT NAME.csv (NutrientID, NutrientName, NutrientUnit)
 * 
 * Usage:
 *   npm run import-cnf
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const DATA_DIR = path.join(process.cwd(), 'data');
const CNF_DIR = path.join(DATA_DIR, 'cnf');
const OUTPUT_SQL = path.join(process.cwd(), 'supabase', 'migrations', '20251030110000_bulk_import_cnf_foods.sql');

interface FoodInfo {
  food_id: number;
  food_code: string;
  description: string;
}

interface NutrientInfo {
  nutrient_id: number;
  name: string;
  unit: string;
}

interface NutrientRow {
  food_id: number;
  nutrient_id: number;
  value: number;
}

interface CNFFood {
  food_code: string;
  food_name: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// Extract CNF ZIP file if it exists
async function extractCNFZip(): Promise<void> {
  const zipFile = 'cnf-fcen-csv.zip';
  const zipPath = path.join(process.cwd(), zipFile);
  
  if (fs.existsSync(zipPath)) {
    console.log(`📦 Found ZIP: ${zipFile}`);
    console.log(`   Extracting to: ${CNF_DIR}...`);
    
    try {
      const zipPathNorm = zipPath.replace(/\\/g, '/');
      const destPathNorm = CNF_DIR.replace(/\\/g, '/');
      execSync(`powershell -Command "Expand-Archive -Path '${zipPathNorm}' -DestinationPath '${destPathNorm}' -Force"`, { stdio: 'inherit' });
      console.log(`   ✅ Extracted: ${zipFile}\n`);
    } catch (err: any) {
      console.warn(`   ⚠️  Failed to extract ${zipFile}: ${err.message}`);
      console.log(`   💡 Please extract manually and place CSV files in: ${CNF_DIR}\n`);
    }
  }
}

// Parse CSV file with proper CSV handling (handles quoted fields with commas)
async function parseCSVFile(filePath: string): Promise<any[]> {
  const rows: any[] = [];
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let headers: string[] = [];
  let isFirstLine = true;
  
  // Proper CSV parser that handles quoted fields
  function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    values.push(current.trim());
    return values;
  }
  
  for await (const line of rl) {
    if (!line.trim()) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    
    if (isFirstLine) {
      headers = values.map(h => h.toLowerCase().replace(/^"|"$/g, ''));
      isFirstLine = false;
      continue;
    }
    
    if (values.length !== headers.length) {
      // Skip malformed rows but log a warning occasionally
      if (rows.length % 1000 === 0) {
        console.warn(`   ⚠️  Skipping malformed row at line ${rows.length + 2} (expected ${headers.length} columns, got ${values.length})`);
      }
      continue;
    }
    
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i].replace(/^"|"$/g, ''); // Remove quotes
    });
    
    rows.push(row);
  }
  
  return rows;
}

function findCSVFiles(dir: string): string[] {
  const csvFiles: string[] = [];
  
  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (item.endsWith('.csv')) {
        csvFiles.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return csvFiles;
}

async function importFromCSV(): Promise<CNFFood[]> {
  console.log('📂 Checking for CNF CSV files in data/cnf/...\n');
  
  // Extract ZIP file first
  await extractCNFZip();
  
  if (!fs.existsSync(CNF_DIR)) {
    fs.mkdirSync(CNF_DIR, { recursive: true });
  }
  
  const csvFiles = findCSVFiles(CNF_DIR);
  
  if (csvFiles.length === 0) {
    console.log('❌ No CSV files found in data/cnf/');
    console.log('\n📥 Please place ZIP file in workspace root or CSV files in: data/cnf/\n');
    return [];
  }
  
  console.log(`✅ Found ${csvFiles.length} CSV file(s)`);
  
  // Find key files
  const foodNameFile = csvFiles.find(f => f.includes('FOOD NAME') || f.includes('food_name'));
  const nutrientAmountFile = csvFiles.find(f => f.includes('NUTRIENT AMOUNT') || f.includes('nutrient_amount'));
  const nutrientNameFile = csvFiles.find(f => f.includes('NUTRIENT NAME') || f.includes('nutrient_name'));
  
  if (!foodNameFile || !nutrientAmountFile || !nutrientNameFile) {
    console.error('❌ Missing required CNF files:');
    console.error(`   Food Name: ${foodNameFile ? '✅' : '❌'}`);
    console.error(`   Nutrient Amount: ${nutrientAmountFile ? '✅' : '❌'}`);
    console.error(`   Nutrient Name: ${nutrientNameFile ? '✅' : '❌'}`);
    return [];
  }
  
  console.log(`   Food Name: ${path.basename(foodNameFile)}`);
  console.log(`   Nutrient Amount: ${path.basename(nutrientAmountFile)}`);
  console.log(`   Nutrient Name: ${path.basename(nutrientNameFile)}\n`);
  
  // Parse food names
  console.log('   Reading food names...');
  const foodRows = await parseCSVFile(foodNameFile);
  console.log(`   ✅ Parsed ${foodRows.length} rows from FOOD NAME.csv`);
  
  const foodsMap = new Map<number, FoodInfo>();
  
  for (const row of foodRows) {
    const foodId = parseInt(row.foodid || row.food_id || '0');
    if (!foodId || isNaN(foodId)) {
      // Skip invalid rows but don't spam warnings
      if (foodsMap.size < 100 && foodsMap.size % 10 === 0) {
        console.warn(`   ⚠️  Skipping invalid food ID: ${row.foodid || 'missing'}`);
      }
      continue;
    }
    
    foodsMap.set(foodId, {
      food_id: foodId,
      food_code: (row.foodcode || row.food_code || String(foodId)).replace(/'/g, "''"),
      description: (row.fooddescription || row.food_description || '').replace(/'/g, "''")
    });
  }
  
  console.log(`   ✅ Loaded ${foodsMap.size} valid foods`);
  
  // Parse nutrient names
  console.log('   Reading nutrient names...');
  const nutrientRows = await parseCSVFile(nutrientNameFile);
  const nutrientsMap = new Map<number, NutrientInfo>();
  
  for (const row of nutrientRows) {
    const nutrientId = parseInt(row.nutrientid || row.nutrient_id || '0');
    if (!nutrientId) continue;
    
    nutrientsMap.set(nutrientId, {
      nutrient_id: nutrientId,
      name: row.nutrientname || row.nutrient_name || '',
      unit: row.nutrientunit || row.nutrient_unit || 'g'
    });
  }
  
  console.log(`   ✅ Loaded ${nutrientsMap.size} nutrients`);
  
  // Parse nutrient amounts
  console.log('   Reading nutrient amounts...');
  const nutrientAmountRows = await parseCSVFile(nutrientAmountFile);
  console.log(`   ✅ Parsed ${nutrientAmountRows.length} nutrient rows`);
  
  const nutrientsByFood = new Map<number, Map<number, number>>(); // food_id -> nutrient_id -> value
  
  for (const row of nutrientAmountRows) {
    const foodId = parseInt(row.foodid || row.food_id || '0');
    const nutrientId = parseInt(row.nutrientid || row.nutrient_id || '0');
    const value = parseFloat(row.nutrientvalue || row.nutrient_value || '0');
    
    if (!foodId || !nutrientId || isNaN(foodId) || isNaN(nutrientId)) continue;
    
    if (!nutrientsByFood.has(foodId)) {
      nutrientsByFood.set(foodId, new Map());
    }
    nutrientsByFood.get(foodId)!.set(nutrientId, value);
  }
  
  console.log(`   ✅ Loaded nutrients for ${nutrientsByFood.size} foods\n`);
  
  // Combine foods and nutrients
  console.log('   Combining foods and nutrients...');
  const foods: CNFFood[] = [];
  const maxFoods = 15000;
  
  // CNF nutrient IDs: 208=KCAL, 203=PROTEIN, 205=CARBOHYDRATE, 204=FAT, 291=FIBER (check)
  // Let me check for fiber ID
  let fiberNutrientId = 291; // Common fiber ID, but may vary
  
  for (const [nutrientId, nutrientInfo] of nutrientsMap.entries()) {
    if (nutrientInfo.name.toLowerCase().includes('fiber') || 
        nutrientInfo.name.toLowerCase().includes('fibre')) {
      fiberNutrientId = nutrientId;
      break;
    }
  }
  
  console.log(`   Using nutrient IDs: 208=KCAL, 203=PROTEIN, 205=CARB, 204=FAT, ${fiberNutrientId}=FIBER`);
  
  for (const [foodId, foodInfo] of foodsMap.entries()) {
    if (foods.length >= maxFoods) break;
    
    const nutrients = nutrientsByFood.get(foodId) || new Map();
    
    const kcal = nutrients.get(208) || 0; // Energy (kilocalories)
    const protein = nutrients.get(203) || 0; // Protein
    const carbs = nutrients.get(205) || 0; // Carbohydrate
    const fat = nutrients.get(204) || 0; // Fat
    const fiber = nutrients.get(fiberNutrientId) || 0; // Fiber
    
    if (kcal > 0) {
      foods.push({
        food_code: foodInfo.food_code,
        food_name: foodInfo.description,
        kcal,
        protein_g: protein,
        carbs_g: carbs,
        fat_g: fat,
        fiber_g: fiber
      });
    }
  }
  
  console.log(`   ✅ Combined ${foods.length} foods with nutrients\n`);
  
  return foods;
}

function generateSQL(foods: CNFFood[]): string {
  console.log(`📝 Generating SQL migration for ${foods.length} foods...`);
  
  const sql: string[] = [];
  sql.push('-- Bulk Import Canadian Nutrient File (CNF) Foods');
  sql.push(`-- Generated: ${new Date().toISOString()}`);
  sql.push(`-- Total foods: ${foods.length}`);
  sql.push('');
  sql.push('-- CNF 2015 -> food_cache (100 g basis)');
  sql.push('-- Safe for re-runs: uses ON CONFLICT and temp staging');
  sql.push('');
  sql.push('BEGIN;');
  sql.push('');
  sql.push('-- 1) Staging table (drop/create)');
  sql.push('DROP TABLE IF EXISTS tmp_cnf_foods;');
  sql.push('CREATE TEMP TABLE tmp_cnf_foods (');
  sql.push('  food_code       text PRIMARY KEY,');
  sql.push('  food_name       text NOT NULL,');
  sql.push('  kcal            numeric,');
  sql.push('  protein_g       numeric,');
  sql.push('  carbs_g         numeric,');
  sql.push('  fat_g           numeric,');
  sql.push('  fiber_g         numeric');
  sql.push(');');
  sql.push('');
  sql.push('-- 2) Insert staging data');
  sql.push('INSERT INTO tmp_cnf_foods (food_code, food_name, kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES');
  
  // Remove duplicates by food_code
  const uniqueFoods = Array.from(new Map(foods.map(f => [f.food_code, f])).values());
  console.log(`   Deduplicated: ${uniqueFoods.length} unique foods`);
  
  // Generate VALUES rows - escape single quotes by doubling them
  const values = uniqueFoods.map((food) => {
    const foodName = food.food_name.replace(/'/g, "''");
    const kcal = Math.round(food.kcal * 10) / 10;
    const protein_g = Math.round(food.protein_g * 10) / 10;
    const carbs_g = Math.round(food.carbs_g * 10) / 10;
    const fat_g = Math.round(food.fat_g * 10) / 10;
    const fiber_g = Math.round(food.fiber_g * 10) / 10;
    
    return `  ('${food.food_code}', '${foodName}', ${kcal}, ${protein_g}, ${carbs_g}, ${fat_g}, ${fiber_g})`;
  });
  
  // Split into batches to avoid SQL statement size limits
  const batchSize = 1000;
  for (let i = 0; i < values.length; i += batchSize) {
    const batch = values.slice(i, i + batchSize);
    sql.push(batch.join(',\n'));
    if (i + batchSize < values.length) {
      sql.push(',');
    }
  }
  
  sql.push(';');
  sql.push('');
  sql.push('-- 3) Upsert into food_cache with quote-safe literals');
  sql.push('--    (we keep id stable as \'cnf_{food_code}\')');
  sql.push('INSERT INTO public.food_cache');
  sql.push('  (id, name, brand, serving_size, grams_per_serving, macros, micros, source_db, confidence, expires_at, country_code)');
  sql.push('SELECT');
  sql.push('  \'cnf_\' || f.food_code                                  AS id,');
  sql.push('  replace(f.food_name, $$\'$$, $$\'\'\'$$)                     AS name,');
  sql.push('  NULL                                                   AS brand,');
  sql.push('  \'100g\'                                                 AS serving_size,');
  sql.push('  100                                                    AS grams_per_serving,');
  sql.push('  jsonb_build_object(');
  sql.push('    \'kcal\',       round(coalesce(f.kcal,0)::numeric, 1),');
  sql.push('    \'protein_g\',  round(coalesce(f.protein_g,0)::numeric, 1),');
  sql.push('    \'carbs_g\',    round(coalesce(f.carbs_g,0)::numeric, 1),');
  sql.push('    \'fat_g\',      round(coalesce(f.fat_g,0)::numeric, 1)');
  sql.push('  )                                                       AS macros,');
  sql.push('  jsonb_build_object(');
  sql.push('    \'fiber_g\',    round(coalesce(f.fiber_g,0)::numeric, 1)');
  sql.push('  )                                                       AS micros,');
  sql.push('  \'CNF\'                                                   AS source_db,');
  sql.push('  0.95                                                    AS confidence,');
  sql.push('  now() + interval \'90 days\'                              AS expires_at,');
  sql.push('  \'CA\'                                                    AS country_code');
  sql.push('FROM tmp_cnf_foods f');
  sql.push('ON CONFLICT (id) DO UPDATE SET');
  sql.push('  name          = EXCLUDED.name,');
  sql.push('  macros        = EXCLUDED.macros,');
  sql.push('  micros        = EXCLUDED.micros,');
  sql.push('  confidence    = EXCLUDED.confidence,');
  sql.push('  expires_at    = EXCLUDED.expires_at,');
  sql.push('  last_accessed = now();');
  sql.push('');
  sql.push('DO $$');
  sql.push('DECLARE');
  sql.push('  n int;');
  sql.push('BEGIN');
  sql.push('  SELECT count(*) INTO n FROM tmp_cnf_foods;');
  sql.push('  RAISE NOTICE \'CNF bulk import complete: % foods staged (see food_cache for upserted rows).\', n;');
  sql.push('END $$;');
  sql.push('');
  sql.push('COMMIT;');
  
  return sql.join('\n');
}

async function main() {
  console.log('🍁 Canadian Nutrient File (CNF) Import Script');
  console.log('=============================================\n');
  
  if (!fs.existsSync(CNF_DIR)) {
    fs.mkdirSync(CNF_DIR, { recursive: true });
  }
  
  const foods = await importFromCSV();
  
  if (foods.length === 0) {
    console.error('❌ No foods to import');
    process.exit(1);
  }
  
  const sql = generateSQL(foods);
  
  fs.writeFileSync(OUTPUT_SQL, sql, 'utf8');
  console.log(`✅ Generated migration: ${OUTPUT_SQL}`);
  console.log(`\n📊 Summary:`);
  console.log(`   - Foods imported: ${foods.length}`);
  console.log(`   - SQL file size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`\n🚀 Next step: Run the migration in Supabase SQL Editor`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
