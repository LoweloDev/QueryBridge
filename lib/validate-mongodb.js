#!/usr/bin/env node

const { QueryParser } = require('./dist/query-parser.js');
const { QueryTranslator } = require('./dist/query-translator.js');

// Test queries to validate MongoDB output
const testQueries = [
  'FIND users WHERE status IN [\'active\', \'pending\'] AND role NOT IN [\'admin\', \'super_admin\']',
  'FIND users WHERE name LIKE \'John%\' AND email LIKE \'%@gmail.com\'',
  'FIND users LEFT JOIN orders ON users.id = orders.user_id',
];

console.log('🔍 MongoDB Translation Validation Test');
console.log('='.repeat(50));

for (const [index, query] of testQueries.entries()) {
  try {
    console.log(`\n📝 Test ${index + 1}: ${query}`);
    
    // Parse the query
    const parsed = QueryParser.parse(query);
    console.log(`✅ Parser: Successfully parsed`);
    console.log('Parsed WHERE conditions:', JSON.stringify(parsed.where, null, 2));
    
    // Generate MongoDB query
    const mongoQuery = QueryTranslator.toMongoDB(parsed);
    console.log(`✅ MongoDB: ${JSON.stringify(mongoQuery, null, 2)}`);
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

console.log('\n' + '='.repeat(50));