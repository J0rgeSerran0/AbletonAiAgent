#!/usr/bin/env ts-node

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';

async function debugConnection() {
    console.log("=== DEBUGGING DATABASE CONNECTION ===");
    
    // Test 1: Simple count query
    console.log("\n1. Testing simple count query...");
    const countStart = Date.now();
    const countResult = await db.select({ count: resources.id }).from(resources);
    const countEnd = Date.now();
    console.log(`Count query time: ${countEnd - countStart}ms`);
    console.log(`Result: ${countResult.length} rows`);
    
    // Test 2: Simple select all
    console.log("\n2. Testing select all query...");
    const selectStart = Date.now();
    const allResources = await db.select().from(resources);
    const selectEnd = Date.now();
    console.log(`Select all time: ${selectEnd - selectStart}ms`);
    console.log(`Result: ${allResources.length} rows`);
    
    // Test 3: Where clause query
    console.log("\n3. Testing where clause query...");
    const whereStart = Date.now();
    const whereResult = await db.select().from(resources).where(eq(resources.url, "https://www.ableton.com/en/manual/synchronizing-with-link-tempo-follower-and-midi/"));
    const whereEnd = Date.now();
    console.log(`Where query time: ${whereEnd - whereStart}ms`);
    console.log(`Result: ${whereResult.length} rows`);
    
    // Test 4: Multiple identical queries to check for caching
    console.log("\n4. Testing multiple identical queries...");
    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        const result = await db.select().from(resources).where(eq(resources.url, "https://www.ableton.com/en/manual/synchronizing-with-link-tempo-follower-and-midi/"));
        const end = Date.now();
        console.log(`Query ${i + 1} time: ${end - start}ms, Result: ${result.length} rows`);
    }
    
    // Test 5: Check if we're getting the same connection
    console.log("\n5. Testing connection identity...");
    const connection1 = await db.select().from(resources).limit(1);
    const connection2 = await db.select().from(resources).limit(1);
    console.log(`Connection 1 result: ${connection1.length} rows`);
    console.log(`Connection 2 result: ${connection2.length} rows`);
}

debugConnection().catch(console.error); 