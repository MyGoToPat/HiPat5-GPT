#!/usr/bin/env node
/**
 * Import USDA FoodData Central from CSV
 * 
 * Handles USDA's multi-file structure:
 * - foundation_food.csv / food.csv (food descriptions)
 * - food_nutrient.csv (nutrient values linked by fdc_id)
 * 
 * Usage:
 *   npm run import-usda
 */

import * as fs from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { execSync } from 'child_process';

const DATA_DIR = path.join(process.cwd(), 'data');
const USDA_DIR = path.join(DATA_DIR, 'usda');
const OUTPUT_SQL = path.join(process.cwd(), 'supabase', 'migrations', '20251030100000_bulk_import_usda_foods.sql');

interface FoodInfo {
  fdc_id: number;
  description: string;
  brand_owner?: string;
}

interface NutrientRow {
  fdc_id: number;
  nutrient_id: number;
  amount: number;
}

interface FoodRow {
  fdc_id: number;
  description: string;
  brand_owner?: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

// Extract ZIP files if they exist
async function extractZIPFiles(): Promise<void> {
  const zipFiles = [
    'FoodData_Central_foundation_food_csv_2025-04-24.zip',
    'FoodData_Central_sr_legacy_food_csv_2018-04.zip'
  ];
  
  for (const zipFile of zipFiles) {
    const zipPath = path.join(process.cwd(), zipFile);
    if (fs.existsSync(zipPath)) {
      console.log(`📦 Found ZIP: ${zipFile}`);
      console.log(`   Extracting to: ${USDA_DIR}...`);
      
      try {
        const zipPathNorm = zipPath.replace(/\\/g, '/');
        const destPathNorm = USDA_DIR.replace(/\\/g, '/');
        execSync(`powershell -Command "Expand-Archive -Path '${zipPathNorm}' -DestinationPath '${destPathNorm}' -Force"`, { stdio: 'inherit' });
        console.log(`   ✅ Extracted: ${zipFile}\n`);
      } catch (err: any) {
        console.warn(`   ⚠️  Failed to extract ${zipFile}: ${err.message}`);
        console.log(`   💡 Please extract manually and place CSV files in: ${USDA_DIR}\n`);
      }
    }
  }
}

// Parse CSV file and return rows
async function parseCSVFile(filePath: string): Promise<any[]> {
  const rows: any[] = [];
  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  let headers: string[] = [];
  let isFirstLine = true;
  
  for await (const line of rl) {
    if (isFirstLine) {
      headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      isFirstLine = false;
      continue;
    }
    
    const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;
    
    const row: any = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Find all CSV files recursively
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

async function importFromCSV(): Promise<FoodRow[]> {
  console.log('📂 Checking for CSV files in data/usda/...\n');
  
  // Extract ZIP files first
  await extractZIPFiles();
  
  if (!fs.existsSync(USDA_DIR)) {
    fs.mkdirSync(USDA_DIR, { recursive: true });
  }
  
  const csvFiles = findCSVFiles(USDA_DIR);
  
  if (csvFiles.length === 0) {
    console.log('❌ No CSV files found in data/usda/');
    console.log('\n📥 Please place ZIP files in workspace root or CSV files in: data/usda/\n');
    return [];
  }
  
  console.log(`✅ Found ${csvFiles.length} CSV file(s)`);
  
  // Find food files and nutrient files
  const foodFiles = csvFiles.filter(f => 
    f.includes('foundation_food') || 
    f.includes('food.csv') || 
    f.includes('food_') && !f.includes('nutrient')
  );
  
  const nutrientFiles = csvFiles.filter(f => f.includes('food_nutrient'));
  
  console.log(`   Food files: ${foodFiles.length}`);
  console.log(`   Nutrient files: ${nutrientFiles.length}\n`);
  
  // Parse food files
  const foodsMap = new Map<number, FoodInfo>();
  
  for (const filePath of foodFiles) {
    console.log(`   Reading foods from: ${path.basename(filePath)}...`);
    const rows = await parseCSVFile(filePath);
    
    for (const row of rows) {
      const fdcId = parseInt(row.fdc_id || row.fdcid || '0');
      if (!fdcId) continue;
      
      foodsMap.set(fdcId, {
        fdc_id: fdcId,
        description: (row.description || row.name || '').replace(/'/g, "''"),
        brand_owner: row.brand_owner || row.brand_owner || null
      });
    }
    
    console.log(`   ✅ Loaded ${foodsMap.size} foods`);
  }
  
  // Parse nutrient files
  const nutrientsMap = new Map<number, Map<number, number>>(); // fdc_id -> nutrient_id -> amount
  
  for (const filePath of nutrientFiles) {
    console.log(`   Reading nutrients from: ${path.basename(filePath)}...`);
    const rows = await parseCSVFile(filePath);
    
    for (const row of rows) {
      const fdcId = parseInt(row.fdc_id || row.fdcid || '0');
      const nutrientId = parseInt(row.nutrient_id || row.nutrientid || '0');
      const amount = parseFloat(row.amount || '0');
      
      if (!fdcId || !nutrientId) continue;
      
      if (!nutrientsMap.has(fdcId)) {
        nutrientsMap.set(fdcId, new Map());
      }
      nutrientsMap.get(fdcId)!.set(nutrientId, amount);
    }
    
    console.log(`   ✅ Loaded nutrients for ${nutrientsMap.size} foods`);
  }
  
  // Combine foods and nutrients
  const foods: FoodRow[] = [];
  const maxFoods = 15000;
  
  console.log(`\n   Combining foods and nutrients...`);
  
  for (const [fdcId, foodInfo] of foodsMap.entries()) {
    if (foods.length >= maxFoods) break;
    
    const nutrients = nutrientsMap.get(fdcId) || new Map();
    
    // USDA nutrient IDs: 1008=kcal, 1003=protein, 1005=carbs, 1004=fat, 1079=fiber
    const kcal = nutrients.get(1008) || 0;
    const protein = nutrients.get(1003) || 0;
    const carbs = nutrients.get(1005) || 0;
    const fat = nutrients.get(1004) || 0;
    const fiber = nutrients.get(1079) || 0;
    
    if (kcal > 0) {
      foods.push({
        fdc_id: fdcId,
        description: foodInfo.description,
        brand_owner: foodInfo.brand_owner,
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

function generateSQL(foods: FoodRow[]): string {
  console.log(`📝 Generating SQL migration for ${foods.length} foods...`);
  
  const sql: string[] = [];
  sql.push('-- Bulk Import USDA FoodData Central Foods');
  sql.push(`-- Generated: ${new Date().toISOString()}`);
  sql.push(`-- Total foods: ${foods.length}`);
  sql.push('');
  sql.push('-- USDA -> food_cache (100 g basis)');
  sql.push('-- Safe for re-runs: uses ON CONFLICT and temp staging');
  sql.push('');
  sql.push('BEGIN;');
  sql.push('');
  sql.push('-- 1) Staging table (drop/create)');
  sql.push('DROP TABLE IF EXISTS tmp_usda_foods;');
  sql.push('CREATE TEMP TABLE tmp_usda_foods (');
  sql.push('  fdc_id            bigint PRIMARY KEY,');
  sql.push('  description       text NOT NULL,');
  sql.push('  brand_owner       text,');
  sql.push('  kcal              numeric,');
  sql.push('  protein_g         numeric,');
  sql.push('  carbs_g           numeric,');
  sql.push('  fat_g             numeric,');
  sql.push('  fiber_g           numeric');
  sql.push(');');
  sql.push('');
  sql.push('-- 2) Insert staging data');
  sql.push('INSERT INTO tmp_usda_foods (fdc_id, description, brand_owner, kcal, protein_g, carbs_g, fat_g, fiber_g) VALUES');
  
  // Remove duplicates by fdc_id
  const uniqueFoods = Array.from(new Map(foods.map(f => [f.fdc_id, f])).values());
  console.log(`   Deduplicated: ${uniqueFoods.length} unique foods`);
  
  // Generate VALUES rows - escape single quotes by doubling them
  const values = uniqueFoods.map((food) => {
    const description = food.description.replace(/'/g, "''");
    const brandOwner = food.brand_owner ? food.brand_owner.replace(/'/g, "''") : null;
    const kcal = Math.round(food.kcal * 10) / 10;
    const protein_g = Math.round(food.protein_g * 10) / 10;
    const carbs_g = Math.round(food.carbs_g * 10) / 10;
    const fat_g = Math.round(food.fat_g * 10) / 10;
    const fiber_g = Math.round(food.fiber_g * 10) / 10;
    
    // Use NULL for brand_owner if empty, otherwise quote with escaped apostrophes
    const brandValue = brandOwner ? `'${brandOwner}'` : 'NULL';
    
    return `  (${food.fdc_id}, '${description}', ${brandValue}, ${kcal}, ${protein_g}, ${carbs_g}, ${fat_g}, ${fiber_g})`;
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
  sql.push('--    (we keep id stable as \'usda_{fdc_id}\')');
  sql.push('INSERT INTO public.food_cache');
  sql.push('  (id, name, brand, serving_size, grams_per_serving, macros, micros, source_db, usda_fdc_id, confidence, expires_at, country_code)');
  sql.push('SELECT');
  sql.push('  \'usda_\' || f.fdc_id::text                                              AS id,');
  sql.push('  replace(f.description, $$\'$$, $$\'\'\'$$)                                   AS name,');
  sql.push('  CASE WHEN f.brand_owner IS NULL OR f.brand_owner = \'\' THEN NULL');
  sql.push('       ELSE replace(f.brand_owner, $$\'$$, $$\'\'\'$$)');
  sql.push('  END                                                                    AS brand,');
  sql.push('  \'100g\'                                                                 AS serving_size,');
  sql.push('  100                                                                    AS grams_per_serving,');
  sql.push('  jsonb_build_object(');
  sql.push('    \'kcal\',       round(coalesce(f.kcal,0)::numeric, 1),');
  sql.push('    \'protein_g\',  round(coalesce(f.protein_g,0)::numeric, 1),');
  sql.push('    \'carbs_g\',    round(coalesce(f.carbs_g,0)::numeric, 1),');
  sql.push('    \'fat_g\',      round(coalesce(f.fat_g,0)::numeric, 1)');
  sql.push('  )                                                                       AS macros,');
  sql.push('  jsonb_build_object(');
  sql.push('    \'fiber_g\',    round(coalesce(f.fiber_g,0)::numeric, 1)');
  sql.push('  )                                                                       AS micros,');
  sql.push('  \'USDA\'                                                                  AS source_db,');
  sql.push('  f.fdc_id                                                                AS usda_fdc_id,');
  sql.push('  0.95                                                                     AS confidence,');
  sql.push('  now() + interval \'90 days\'                                              AS expires_at,');
  sql.push('  CASE WHEN f.brand_owner IS NULL OR f.brand_owner = \'\' THEN NULL');
  sql.push('       ELSE \'US\'');
  sql.push('  END                                                                     AS country_code');
  sql.push('FROM tmp_usda_foods f');
  sql.push('ON CONFLICT (id) DO UPDATE SET');
  sql.push('  name          = EXCLUDED.name,');
  sql.push('  brand         = EXCLUDED.brand,');
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
  sql.push('  SELECT count(*) INTO n FROM tmp_usda_foods;');
  sql.push('  RAISE NOTICE \'USDA bulk import complete: % foods staged (see food_cache for upserted rows).\', n;');
  sql.push('END $$;');
  sql.push('');
  sql.push('COMMIT;');
  
  return sql.join('\n');
}

async function main() {
  console.log('🌾 USDA FoodData Central Import Script');
  console.log('=====================================\n');
  
  if (!fs.existsSync(USDA_DIR)) {
    fs.mkdirSync(USDA_DIR, { recursive: true });
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
