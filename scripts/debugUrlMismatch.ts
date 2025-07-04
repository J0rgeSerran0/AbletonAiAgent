#!/usr/bin/env ts-node

import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import fs from 'fs';
import path from 'path';

async function debugUrlMismatch() {
    console.log('🔍 Debugging URL mismatch issue...\n');

    // Read URLs from file
    const currentFilePath = import.meta.url;
    const currentDirectory = path.dirname(currentFilePath);
    const urlsFile = path.join(currentDirectory, '../app/api/ableton/urls.md');
    const urlsFileWithoutFilePrefix = urlsFile.replace('file:', '');
    
    const data = await fs.promises.readFile(urlsFileWithoutFilePrefix, 'utf8');
    const urlsArray = data.split('\n').filter(url => !url.startsWith('#') && url.length > 0);

    console.log(`📄 Found ${urlsArray.length} URLs in urls.md file\n`);

    // Get all resources from database
    const allResources = await db.select().from(resources);
    console.log(`🗄️  Found ${allResources.length} resources in database\n`);

    // Check each URL
    let foundCount = 0;
    let notFoundCount = 0;

    for (const url of urlsArray) {
        const normalizedUrl = url.trim();
        
        // Try exact match
        const resource = await db.select().from(resources).where(eq(resources.url, normalizedUrl));
        
        if (resource.length > 0) {
            foundCount++;
            console.log(`✅ Found: ${normalizedUrl}`);
        } else {
            notFoundCount++;
            console.log(`❌ Not found: ${normalizedUrl}`);
            
            // Try to find similar URLs in the database
            const similarUrls = allResources.filter(resource => 
                resource.url && (
                    resource.url.includes(normalizedUrl.replace('https://www.ableton.com/en/manual/', '')) ||
                    normalizedUrl.includes(resource.url.replace('https://www.ableton.com/en/manual/', '')) ||
                    resource.url === normalizedUrl.replace('https://', 'http://') ||
                    resource.url === normalizedUrl.replace('http://', 'https://')
                )
            );
            
            if (similarUrls.length > 0) {
                console.log(`   🔍 Similar URLs found in DB:`);
                similarUrls.forEach(similar => {
                    console.log(`      - ${similar.url}`);
                });
            }
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Found: ${foundCount}`);
    console.log(`   Not found: ${notFoundCount}`);
    console.log(`   Total URLs checked: ${urlsArray.length}`);

    // Show some examples of URLs in the database
    console.log(`\n📋 Sample URLs from database:`);
    allResources.slice(0, 5).forEach(resource => {
        console.log(`   - ${resource.url}`);
    });

    if (allResources.length > 5) {
        console.log(`   ... and ${allResources.length - 5} more`);
    }
}

debugUrlMismatch().catch(console.error); 