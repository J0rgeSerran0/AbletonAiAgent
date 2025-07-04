#!/usr/bin/env ts-node

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources, ResourceType } from '@/lib/db/schema/resources';

async function testInsertVsSelect() {
    console.log("=== TESTING INSERT vs SELECT ===");
    
    // Test 1: SELECT query
    console.log("\n1. Testing SELECT query...");
    const selectStart = Date.now();
    const selectResult = await db.select().from(resources).where(eq(resources.url, "https://www.ableton.com/en/manual/synchronizing-with-link-tempo-follower-and-midi/"));
    const selectEnd = Date.now();
    console.log(`SELECT time: ${selectEnd - selectStart}ms`);
    console.log(`SELECT result: ${selectResult.length} rows`);
    
    // Test 2: INSERT query (with a test URL)
    console.log("\n2. Testing INSERT query...");
    const testUrl = "https://test-insert-vs-select.com/test";
    
    try {
        const insertStart = Date.now();
        const insertResult = await db.insert(resources).values({
            url: testUrl,
            type: ResourceType.URL,
            content: "Test content for insert vs select",
            title: "Test Title",
            description: "Test Description",
            source: "test"
        });
        const insertEnd = Date.now();
        console.log(`INSERT time: ${insertEnd - insertStart}ms`);
        console.log(`INSERT successful: ${!!insertResult}`);
        
        // Test 3: SELECT the inserted record
        console.log("\n3. Testing SELECT of inserted record...");
        const selectInsertedStart = Date.now();
        const selectInsertedResult = await db.select().from(resources).where(eq(resources.url, testUrl));
        const selectInsertedEnd = Date.now();
        console.log(`SELECT inserted time: ${selectInsertedEnd - selectInsertedStart}ms`);
        console.log(`SELECT inserted result: ${selectInsertedResult.length} rows`);
        
        // Clean up: Delete the test record
        console.log("\n4. Cleaning up test record...");
        const deleteStart = Date.now();
        await db.delete(resources).where(eq(resources.url, testUrl));
        const deleteEnd = Date.now();
        console.log(`DELETE time: ${deleteEnd - deleteStart}ms`);
        
    } catch (error) {
        console.error("Error during INSERT test:", error);
    }
    
    // Test 4: Multiple SELECT queries to see if timing changes
    console.log("\n5. Testing multiple SELECT queries...");
    for (let i = 0; i < 3; i++) {
        const start = Date.now();
        const result = await db.select().from(resources).limit(1);
        const end = Date.now();
        console.log(`SELECT ${i + 1} time: ${end - start}ms, Result: ${result.length} rows`);
    }
}

testInsertVsSelect().catch(console.error); 