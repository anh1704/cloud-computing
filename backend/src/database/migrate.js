const db = require('../models/database');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '001_fix_sku_unique_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration: Fix SKU unique constraint');
    
    // Execute migration
    await db.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 SKU constraint updated: Now allows reusing SKUs from deleted products');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 All migrations completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };