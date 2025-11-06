#!/usr/bin/env node
/**
 * Download USDA FoodData Central CSV (Helper Script)
 * 
 * Since USDA doesn't provide direct download URLs, this script:
 * 1. Provides instructions for manual download
 * 2. Attempts to download a sample via API if USDA_API_KEY is set
 * 
 * Usage:
 *   npm run download-usda
 */

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const USDA_DIR = path.join(DATA_DIR, 'usda');

async function downloadSampleViaAPI() {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.log('💡 Set USDA_API_KEY environment variable to download sample data via API');
    return;
  }
  
  console.log('📡 Downloading sample foods via API...\n');
  
  const sampleFoods = [
    'chicken breast', 'ground beef', 'salmon', 'eggs', 'milk',
    'rice', 'pasta', 'bread', 'oatmeal', 'banana', 'apple'
  ];
  
  const foods: any[] = [];
  
  for (const term of sampleFoods) {
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(term)}&pageSize=10&dataType=Foundation,SR%20Legacy`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.foods) {
        foods.push(...data.foods.slice(0, 5));
        console.log(`✅ Downloaded ${foods.length} sample foods`);
      }
      
      await new Promise(r => setTimeout(r, 500)); // Rate limit
    } catch (err) {
      console.warn(`⚠️  Failed: ${term}`);
    }
  }
  
  if (foods.length > 0) {
    const sampleFile = path.join(USDA_DIR, 'usda-sample.json');
    fs.writeFileSync(sampleFile, JSON.stringify(foods, null, 2));
    console.log(`\n✅ Saved ${foods.length} sample foods to: ${sampleFile}`);
    console.log('   Note: This is a small sample. For full import, download CSV manually.\n');
  }
}

async function main() {
  console.log('🌾 USDA FoodData Central Download Helper');
  console.log('=======================================\n');
  
  if (!fs.existsSync(USDA_DIR)) {
    fs.mkdirSync(USDA_DIR, { recursive: true });
  }
  
  console.log('📥 Manual Download Instructions:');
  console.log('   1. Visit: https://fdc.nal.usda.gov/download-datasets.html');
  console.log('   2. Download "FoodData Central CSV" (latest version)');
  console.log('   3. Extract ZIP file');
  console.log('   4. Place CSV files in: data/usda/\n');
  
  console.log('💡 Alternative: Use API (requires API key):');
  console.log('   1. Get API key: https://api.data.gov/signup/');
  console.log('   2. Set: export USDA_API_KEY=your_key');
  console.log('   3. Run: npm run import-usda\n');
  
  // Try API download if key exists
  await downloadSampleViaAPI();
  
  // Check if CSV files exist
  if (fs.existsSync(USDA_DIR)) {
    const files = fs.readdirSync(USDA_DIR).filter(f => f.endsWith('.csv') || f.endsWith('.json'));
    if (files.length > 0) {
      console.log(`✅ Found ${files.length} file(s) in data/usda/:`);
      files.forEach(f => console.log(`   - ${f}`));
      console.log('\n🚀 Ready to import! Run: npm run import-usda');
    }
  }
}

main().catch(console.error);
