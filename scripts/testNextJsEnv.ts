#!/usr/bin/env ts-node

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import { media } from '@/lib/db/schema/media';

async function testNextJsEnv() {
    console.log('🔍 Testing in Next.js-like environment...\n');

    // Simulate the exact flow from your route
    const allResources = await db.select().from(resources);
    console.log(`Found ${allResources.length} resources in database`);

    // Test the exact same logic as in your route, including the URL processing
    for (let i = 0; i < Math.min(3, allResources.length); i++) {
        const resource = allResources[i];
        console.log(`\n--- Testing Resource ${i + 1} ---`);
        console.log(`Resource ID: ${resource.id}`);
        console.log(`Resource URL: ${resource.url}`);
        
        // Simulate the exact query from your route
        const allResourceMedia = await db.select().from(media).where(eq(media.resourceId, resource.id));
        console.log(`Route query result length: ${allResourceMedia.length}`);
        
        if (allResourceMedia.length === 0) {
            console.log(`❌ No media found - this matches your issue!`);
        } else {
            console.log(`✅ Found ${allResourceMedia.length} media items`);
        }
    }

    // Test connection behavior by simulating multiple requests
    console.log(`\n--- Testing connection behavior ---`);
    
    // Simulate multiple concurrent requests like in a web server
    const concurrentTests = [];
    for (let i = 0; i < 3; i++) {
        concurrentTests.push(async () => {
            const resource = allResources[i % allResources.length];
            const result = await db.select().from(media).where(eq(media.resourceId, resource.id));
            return { resourceId: resource.id, count: result.length };
        });
    }
    
    const concurrentResults = await Promise.all(concurrentTests.map(test => test()));
    concurrentResults.forEach((result, index) => {
        console.log(`Concurrent test ${index + 1}: ResourceId ${result.resourceId} -> ${result.count} media items`);
    });

    // Test with delays to simulate real-world usage
    console.log(`\n--- Testing with delays ---`);
    for (let i = 0; i < 3; i++) {
        const resource = allResources[i];
        console.log(`Testing resource ${i + 1}: ${resource.id}`);
        
        // Add a small delay like in your route
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const result = await db.select().from(media).where(eq(media.resourceId, resource.id));
        console.log(`Result after delay: ${result.length} media items`);
    }

    // Test database connection state
    console.log(`\n--- Testing database connection ---`);
    try {
        // Test if we can still query after multiple operations
        const testQuery = await db.select().from(resources).limit(1);
        console.log(`Database connection test: ${testQuery.length > 0 ? 'OK' : 'FAILED'}`);
        
        // Test media query again
        const testMedia = await db.select().from(media).limit(1);
        console.log(`Media query test: ${testMedia.length > 0 ? 'OK' : 'FAILED'}`);
        
    } catch (error) {
        console.error(`Database connection error:`, error);
    }
}

testNextJsEnv().catch(console.error); 