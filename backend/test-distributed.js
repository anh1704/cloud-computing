// Test script cho hệ thống phân tán
const fetch = require('node-fetch');

// Cấu hình servers
const servers = [
  { id: 'server-a', url: 'http://localhost:4000', name: 'Primary Server' },
  { id: 'server-b', url: 'http://localhost:4001', name: 'Secondary Server' },
  { id: 'server-c', url: 'http://localhost:4002', name: 'Tertiary Server' }
];

// Test data
const testProduct = {
  name: 'Test Product',
  description: 'This is a test product for distributed system',
  price: 100000,
  category: 'Test',
  stock: 10,
  imageUrl: 'https://via.placeholder.com/300'
};

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      timeout: 5000,
      ...options
    });
    return { success: true, data: await response.json(), status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  
  for (const server of servers) {
    const result = await makeRequest(`${server.url}/api/health`);
    if (result.success) {
      console.log(`✅ ${server.name}: HEALTHY (${result.status})`);
    } else {
      console.log(`❌ ${server.name}: UNHEALTHY - ${result.error}`);
    }
  }
}

async function testClusterStatus() {
  console.log('\n📊 Testing Cluster Status...');
  
  for (const server of servers) {
    const result = await makeRequest(`${server.url}/api/cluster/status`);
    if (result.success) {
      console.log(`✅ ${server.name}: Cluster status retrieved`);
      console.log(`   - Total servers: ${result.data.stats.total}`);
      console.log(`   - Healthy servers: ${result.data.stats.healthy}`);
      console.log(`   - Health percentage: ${result.data.stats.healthPercentage}%`);
    } else {
      console.log(`❌ ${server.name}: Failed to get cluster status - ${result.error}`);
    }
  }
}

async function testDataSync() {
  console.log('\n🔄 Testing Data Synchronization...');
  
  // Test 1: Create product on server A
  console.log('1. Creating product on Server A...');
  const createResult = await makeRequest(`${servers[0].url}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testProduct)
  });
  
  if (createResult.success) {
    console.log(`✅ Product created on Server A with ID: ${createResult.data.id}`);
    const productId = createResult.data.id;
    
    // Wait for sync
    console.log('⏳ Waiting for sync (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test 2: Check if product exists on other servers
    console.log('2. Checking if product exists on other servers...');
    for (let i = 1; i < servers.length; i++) {
      const result = await makeRequest(`${servers[i].url}/products/${productId}`);
      if (result.success) {
        console.log(`✅ Product found on ${servers[i].name}`);
      } else {
        console.log(`❌ Product NOT found on ${servers[i].name}`);
      }
    }
    
    // Test 3: Update product on server B
    console.log('3. Updating product on Server B...');
    const updateData = { ...testProduct, name: 'Updated Test Product', price: 150000 };
    const updateResult = await makeRequest(`${servers[1].url}/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (updateResult.success) {
      console.log(`✅ Product updated on Server B`);
      
      // Wait for sync
      console.log('⏳ Waiting for sync (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 4: Check if update is synced to other servers
      console.log('4. Checking if update is synced to other servers...');
      for (let i = 0; i < servers.length; i++) {
        if (i === 1) continue; // Skip server B (already updated)
        
        const result = await makeRequest(`${servers[i].url}/products/${productId}`);
        if (result.success && result.data.name === 'Updated Test Product') {
          console.log(`✅ Update synced to ${servers[i].name}`);
        } else {
          console.log(`❌ Update NOT synced to ${servers[i].name}`);
        }
      }
    } else {
      console.log(`❌ Failed to update product on Server B - ${updateResult.error}`);
    }
    
    // Test 5: Delete product on server C
    console.log('5. Deleting product on Server C...');
    const deleteResult = await makeRequest(`${servers[2].url}/products/${productId}`, {
      method: 'DELETE'
    });
    
    if (deleteResult.success) {
      console.log(`✅ Product deleted on Server C`);
      
      // Wait for sync
      console.log('⏳ Waiting for sync (5 seconds)...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Test 6: Check if deletion is synced to other servers
      console.log('6. Checking if deletion is synced to other servers...');
      for (let i = 0; i < servers.length; i++) {
        if (i === 2) continue; // Skip server C (already deleted)
        
        const result = await makeRequest(`${servers[i].url}/products/${productId}`);
        if (!result.success || result.status === 404) {
          console.log(`✅ Deletion synced to ${servers[i].name}`);
        } else {
          console.log(`❌ Deletion NOT synced to ${servers[i].name}`);
        }
      }
    } else {
      console.log(`❌ Failed to delete product on Server C - ${deleteResult.error}`);
    }
    
  } else {
    console.log(`❌ Failed to create product on Server A - ${createResult.error}`);
  }
}

async function testFailover() {
  console.log('\n🔄 Testing Failover Mechanism...');
  
  // This test would require stopping one of the servers
  // For now, we'll just test the healthy servers endpoint
  for (const server of servers) {
    const result = await makeRequest(`${server.url}/api/cluster/healthy-servers`);
    if (result.success) {
      console.log(`✅ ${server.name}: Healthy servers endpoint working`);
      console.log(`   - Primary server: ${result.data.primaryServer?.serverId || 'None'}`);
      console.log(`   - Healthy servers: ${result.data.healthyServers.length}`);
    } else {
      console.log(`❌ ${server.name}: Healthy servers endpoint failed - ${result.error}`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Distributed System Tests...');
  console.log('=' * 50);
  
  try {
    await testHealthCheck();
    await testClusterStatus();
    await testDataSync();
    await testFailover();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
  }
}

// Chạy tests
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testHealthCheck,
  testClusterStatus,
  testDataSync,
  testFailover,
  runAllTests
};
