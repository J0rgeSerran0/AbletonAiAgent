#!/usr/bin/env ts-node

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import fs from 'fs';
import path from 'path';

async function testRoute() {
    console.log("=== TESTING ROUTE CODE WITH TIMING ===");
    
    const currentFilePath = import.meta.url;
    const currentDirectory = path.dirname(currentFilePath);

    const urlsFile = path.join(currentDirectory, '../app/api/ableton/urls.md');
    const urlsFileWithoutFilePrefix = urlsFile.replace('file:', '');

    const data = await fs.promises.readFile(urlsFileWithoutFilePrefix, 'utf8');
    const urlsArray = data.split('\n').filter(url => !url.startsWith('#') && url.length > 0);

    console.log(`Total URLs to process: ${urlsArray.length}`);
    console.log("");

    for (var url of urlsArray) {
        // Trim the URL to remove any whitespace
        const normalizedUrl = url.trim();
        
        console.log(`Testing URL: "${normalizedUrl}"`);
        
        const startTime = Date.now();
        const resource = await db.select().from(resources).where(eq(resources.url, normalizedUrl));
        const endTime = Date.now();
        const queryTime = endTime - startTime;

        console.log(`Query time: ${queryTime}ms`);
        console.log("Resource found: ", resource.length > 0 ? "YES" : "NO");
        console.log(`Result count: ${resource.length}`);
        if (resource.length > 0) {
            console.log(`Resource ID: ${resource[0].id}`);
            console.log(`Resource URL: "${resource[0].url}"`);
        }
        console.log("--------------------------------");
        
        // Only test first 5 to avoid spam
        if (urlsArray.indexOf(url) >= 4) break;
    }
    
    // Test a simple count query to see if DB is responsive
    console.log("\n=== TESTING DB RESPONSIVENESS ===");
    const countStart = Date.now();
    const totalCount = await db.select({ count: resources.id }).from(resources);
    const countEnd = Date.now();
    console.log(`Count query time: ${countEnd - countStart}ms`);
    console.log(`Total resources in DB: ${totalCount.length}`);
}

testRoute().catch(console.error); 