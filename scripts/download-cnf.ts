#!/usr/bin/env node
/**
 * Download Canadian Nutrient File (CNF)
 * 
 * Downloads the Canadian Nutrient File database for bulk import.
 * Health Canada provides CNF as downloadable files.
 * 
 * Usage:
 *   npm run download-cnf
 *   node scripts/download-cnf.js
 * 
 * Output:
 *   - data/cnf/canadian-nutrient-file.zip (or extracted files)
 *   - data/cnf-fooddata-summary.json (metadata)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const DATA_DIR = path.join(process.cwd(), 'data');
const CNF_DIR = path.join(DATA_DIR, 'cnf');
const OUTPUT_META = path.join(DATA_DIR, 'cnf-fooddata-summary.json');

// Health Canada CNF download URLs (may need manual verification)
const CNF_DOWNLOAD_PAGE = 'https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-compilation-canadian-food-composition-data-users-guide.html';

async function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(CNF_DIR)) {
    fs.mkdirSync(CNF_DIR, { recursive: true });
  }
}

async function main() {
  console.log('📥 Canadian Nutrient File (CNF) Download Script');
  console.log('================================================\n');
  
  await ensureDataDir();
  
  console.log('⚠️  Canadian Nutrient File requires manual download:');
  console.log('   1. Visit: https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-compilation-canadian-food-composition-data-users-guide.html');
  console.log('   2. Download "Canadian Nutrient File" database files');
  console.log('   3. Extract and place files in: data/cnf/\n');
  
  console.log('📝 Next steps:');
  console.log('   - Run: npm run import-cnf');
  console.log('   - This will process CNF files from data/cnf/ and generate SQL migration\n');
  
  // Check if manual download exists
  if (fs.existsSync(CNF_DIR)) {
    const files = fs.readdirSync(CNF_DIR);
    if (files.length > 0) {
      console.log(`✅ Found ${files.length} file(s) in data/cnf/:`);
      files.forEach(f => console.log(`   - ${f}`));
      console.log('\n✅ Ready for import. Run: npm run import-cnf');
    } else {
      console.log('❌ No files found in data/cnf/');
      console.log('   Please download CNF data manually and place in data/cnf/\n');
    }
  }
  
  // Write metadata
  const metadata = {
    source: 'Health Canada - Canadian Nutrient File (CNF)',
    url: CNF_DOWNLOAD_PAGE,
    download_instructions: 'Manual download required from Health Canada website',
    last_updated: new Date().toISOString(),
    note: 'CNF is updated periodically. Download the latest version from Health Canada.',
    format: 'CNF files may be in various formats (CSV, Excel, Access). Script will handle CSV.',
    country_code: 'CA'
  };
  
  fs.writeFileSync(OUTPUT_META, JSON.stringify(metadata, null, 2));
  console.log('✅ Wrote metadata: data/cnf-fooddata-summary.json');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});






