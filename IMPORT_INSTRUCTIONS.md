# USDA & CNF Import Instructions

## Quick Start

1. **Place ZIP files in workspace root** (`C:\Users\any2c\Documents\Code\HiPat5-GPT-1\`):
   - `FoodData_Central_foundation_food_csv_2025-04-24.zip`
   - `FoodData_Central_sr_legacy_food_csv_2018-04.zip`
   - `cnf-fcen-csv.zip`

2. **Run import commands:**
   ```bash
   npm run import-usda
   npm run import-cnf
   ```

3. **Run SQL migrations in Supabase:**
   - `supabase/migrations/20251030100000_bulk_import_usda_foods.sql`
   - `supabase/migrations/20251030110000_bulk_import_cnf_foods.sql`

## What the scripts do:

- ✅ Automatically extract ZIP files
- ✅ Parse CSV files (handles USDA's multi-file structure)
- ✅ Generate SQL migrations with proper country codes
- ✅ Limit to ~15,000 foods per database

## Manual Alternative:

If ZIP files can't be placed in workspace root:
1. Extract ZIP files manually
2. Place CSV files in:
   - `data/usda/` for USDA files
   - `data/cnf/` for CNF files
3. Run the import scripts






