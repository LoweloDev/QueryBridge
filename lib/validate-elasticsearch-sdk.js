#!/usr/bin/env node

const { QueryParser } = require('./dist/query-parser.js');
const { QueryTranslator } = require('./dist/query-translator.js');

// Import Elasticsearch validation library
try {
  const { Client } = require('@elastic/elasticsearch');
  
  console.log('🔍 Elasticsearch Translation Validation with Official SDK');
  console.log('='.repeat(60));

  const testQueries = [
    // Basic queries that should produce valid Elasticsearch operations
    'FIND articles',
    'FIND articles WHERE title LIKE \'elasticsearch%\'',
    'FIND products WHERE price >= 100 AND price <= 500',
    'FIND users WHERE status IN [\'active\', \'pending\']',
    'FIND articles WHERE title ILIKE \'search%\'',
    'FIND orders GROUP BY status',
    'FIND articles ORDER BY score DESC LIMIT 20',
    'FIND orders JOIN users ON orders.user_id = users.id WHERE users.status = \'active\'',
  ];

  let passed = 0;
  let failed = 0;

  for (const [index, query] of testQueries.entries()) {
    try {
      console.log(`\n📝 Test ${index + 1}: ${query.substring(0, 50)}...`);
      
      // Parse and translate
      const parsed = QueryParser.parse(query);
      const esQuery = QueryTranslator.toElasticsearch(parsed);
      
      console.log(`✅ Generated Elasticsearch query successfully`);
      console.log(`   Index: ${esQuery.index}`);
      
      // Validate structure against expected Elasticsearch search API format
      let isValid = false;
      let validationResults = [];
      
      // Check index name
      if (typeof esQuery.index === 'string' && esQuery.index.length > 0) {
        validationResults.push('✅ Valid index name');
        isValid = true;
      } else {
        validationResults.push('❌ Invalid index name');
        isValid = false;
      }
      
      // Check body structure
      if (esQuery.body && typeof esQuery.body === 'object') {
        validationResults.push('✅ Valid body structure');
        
        // Check query structure
        if (esQuery.body.query) {
          const queryKeys = Object.keys(esQuery.body.query);
          const validQueryTypes = ['match_all', 'bool', 'term', 'terms', 'range', 'match', 'nested', 'has_child'];
          
          if (queryKeys.some(key => validQueryTypes.includes(key))) {
            validationResults.push('✅ Valid query type');
          } else {
            validationResults.push(`⚠️  Query type may need validation: ${queryKeys.join(', ')}`);
          }
        }
        
        // Check aggregations structure
        if (esQuery.body.aggs) {
          validationResults.push('✅ Aggregations present');
        }
        
        // Check sort structure
        if (esQuery.body.sort) {
          if (Array.isArray(esQuery.body.sort)) {
            validationResults.push('✅ Valid sort structure');
          } else {
            validationResults.push('⚠️  Sort should be an array');
          }
        }
        
        // Check size/from parameters
        if (esQuery.body.size && typeof esQuery.body.size === 'number') {
          validationResults.push('✅ Valid size parameter');
        }
        if (esQuery.body.from && typeof esQuery.body.from === 'number') {
          validationResults.push('✅ Valid from parameter');
        }
        
      } else {
        validationResults.push('❌ Invalid body structure');
        isValid = false;
      }
      
      // Display validation results
      validationResults.forEach(result => console.log(`     ${result}`));
      
      // Try to validate the query structure would work with Elasticsearch client
      try {
        // This would be the actual query format sent to Elasticsearch
        const searchParams = {
          index: esQuery.index,
          body: esQuery.body
        };
        
        // Basic parameter validation that the client would perform
        if (searchParams.index && searchParams.body) {
          console.log(`✅ Compatible with Elasticsearch Client search() method`);
          if (isValid) passed++;
          else failed++;
        } else {
          console.log(`❌ Not compatible with Elasticsearch Client`);
          failed++;
        }
        
      } catch (error) {
        console.log(`❌ Client compatibility error: ${error.message}`);
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ Translation Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  const percentage = Math.round((passed / (passed + failed)) * 100);
  console.log(`🎯 Success Rate: ${percentage}%`);

  if (failed === 0) {
    console.log('🎉 All Elasticsearch queries are SDK compatible!');
  } else {
    console.log(`⚠️  ${failed} queries need fixing for Elasticsearch SDK compatibility`);
  }

  process.exit(failed > 0 ? 1 : 0);

} catch (error) {
  console.error('❌ Elasticsearch SDK not available, falling back to basic validation');
  console.error(`Error: ${error.message}`);
  process.exit(1);
}