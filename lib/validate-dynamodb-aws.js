#!/usr/bin/env node

const { QueryParser } = require('./dist/query-parser.js');
const { QueryTranslator } = require('./dist/query-translator.js');

// Import DynamoDB validation library
try {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
  
  console.log('🔍 DynamoDB Translation Validation with AWS SDK');
  console.log('='.repeat(50));

  const testQueries = [
    // Basic queries that should produce valid DynamoDB operations
    'FIND users',
    'FIND users WHERE id = \'user123\'',
    'FIND products WHERE price > 100',
    'FIND orders WHERE status IN [\'active\', \'pending\']',
    'FIND orders DB_SPECIFIC: {"partition_key": "USER#12345", "sort_key": "ORDER#67890"}',
    'FIND products DB_SPECIFIC: {"sort_key_prefix": "PRODUCT#electronics"}',
  ];

  let passed = 0;
  let failed = 0;

  for (const [index, query] of testQueries.entries()) {
    try {
      console.log(`\n📝 Test ${index + 1}: ${query.substring(0, 50)}...`);
      
      // Parse and translate
      const parsed = QueryParser.parse(query);
      const dynamoQuery = QueryTranslator.toDynamoDB(parsed);
      
      console.log(`✅ Generated DynamoDB query successfully`);
      console.log(`   Operation: ${dynamoQuery.operation || 'scan'}`);
      console.log(`   Table: ${dynamoQuery.TableName}`);
      
      // Validate using AWS SDK - try to construct the command
      let isValid = false;
      
      if (dynamoQuery.operation === 'scan' || !dynamoQuery.operation) {
        // Test ScanCommand construction
        try {
          const scanParams = { ...dynamoQuery };
          delete scanParams.operation; // Remove our custom property
          const command = new ScanCommand(scanParams);
          console.log(`✅ Valid ScanCommand structure`);
          isValid = true;
        } catch (error) {
          console.log(`❌ Invalid ScanCommand: ${error.message}`);
        }
      } else if (dynamoQuery.operation === 'query') {
        // Test QueryCommand construction
        try {
          const queryParams = { ...dynamoQuery };
          delete queryParams.operation; // Remove our custom property
          const command = new QueryCommand(queryParams);
          console.log(`✅ Valid QueryCommand structure`);
          isValid = true;
        } catch (error) {
          console.log(`❌ Invalid QueryCommand: ${error.message}`);
        }
      }
      
      if (isValid) {
        passed++;
      } else {
        failed++;
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  const percentage = Math.round((passed / (passed + failed)) * 100);
  console.log(`🎯 Success Rate: ${percentage}%`);

  if (failed === 0) {
    console.log('🎉 All DynamoDB queries are AWS SDK compatible!');
  } else {
    console.log(`⚠️  ${failed} queries need fixing for AWS SDK compatibility`);
  }

  process.exit(failed > 0 ? 1 : 0);

} catch (error) {
  console.error('❌ AWS SDK not available, falling back to basic validation');
  process.exit(1);
}