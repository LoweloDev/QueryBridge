#!/usr/bin/env node

const { QueryParser } = require('./dist/query-parser.js');
const { QueryTranslator } = require('./dist/query-translator.js');

// Test queries to validate
const testQueries = [
  'FIND users WHERE age > 25 AND status = "active" ORDER BY created_at DESC LIMIT 50 AGGREGATE count: COUNT(*), avg_age: AVG(age) GROUP BY status',
  'FIND users WHERE id = 123',
  'FIND users ORDER BY name ASC LIMIT 10',
  'FIND orders WHERE status = "pending" AND total > 100',
  'FIND users AGGREGATE total: COUNT(*) GROUP BY department',
];

console.log('🔍 PostgreSQL SQL Validation Test');
console.log('='.repeat(50));

let passed = 0;
let failed = 0;

for (const [index, query] of testQueries.entries()) {
  try {
    console.log(`\n📝 Test ${index + 1}: ${query.substring(0, 60)}...`);
    
    // Parse the query
    const parsed = QueryParser.parse(query);
    console.log(`✅ Parser: Successfully parsed`);
    
    // Generate SQL
    const sql = QueryTranslator.toSQL(parsed);
    console.log(`✅ Translator: ${sql}`);
    
    // Validate SQL syntax (basic checks)
    if (sql.includes('SELECT') && sql.includes('FROM') && sql.endsWith(';')) {
      console.log(`✅ Syntax: Basic SQL structure valid`);
      
      // Check for common issues
      if (sql.includes('AS *')) {
        console.log(`❌ Issue: Invalid alias "AS *" found`);
        failed++;
      } else if (sql.includes('COUNT(*) AS count')) {
        console.log(`✅ Aggregate: Proper COUNT alias`);
        passed++;
      } else {
        passed++;
      }
    } else {
      console.log(`❌ Syntax: Invalid SQL structure`);
      failed++;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    failed++;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log(failed === 0 ? '🎉 All tests passed!' : `⚠️  ${failed} tests failed`);

process.exit(failed > 0 ? 1 : 0);