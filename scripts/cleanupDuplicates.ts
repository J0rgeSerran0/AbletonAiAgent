#!/usr/bin/env ts-node

import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import { media } from '@/lib/db/schema/media';

async function cleanupDuplicates() {
    console.log("=== CLEANING UP DUPLICATES ===");
    
    // Get all resources
    const allResources = await db.select().from(resources);
    console.log(`Total resources in database: ${allResources.length}`);
    
    // Group by URL to find duplicates
    const urlGroups = new Map<string, any[]>();
    allResources.forEach(resource => {
        if (resource.url) {
            const normalizedUrl = resource.url.trim();
            if (!urlGroups.has(normalizedUrl)) {
                urlGroups.set(normalizedUrl, []);
            }
            urlGroups.get(normalizedUrl)!.push(resource);
        }
    });
    
    // Find duplicates
    const duplicates = Array.from(urlGroups.entries())
        .filter(([url, resources]) => resources.length > 1)
        .sort((a, b) => b[1].length - a[1].length);
    
    console.log(`Found ${duplicates.length} URLs with duplicates`);
    
    let totalDeleted = 0;
    
    for (const [url, duplicateResources] of duplicates) {
        console.log(`\nProcessing: "${url}" (${duplicateResources.length} duplicates)`);
        
        // Keep the first resource (oldest), delete the rest
        const [keepResource, ...deleteResources] = duplicateResources;
        
        console.log(`  Keeping resource ID: ${keepResource.id}`);
        console.log(`  Deleting ${deleteResources.length} duplicates...`);
        
        for (const deleteResource of deleteResources) {
            // First, delete associated media
            const associatedMedia = await db.select().from(media).where(eq(media.resourceId, deleteResource.id));
            if (associatedMedia.length > 0) {
                console.log(`    Deleting ${associatedMedia.length} associated media records`);
                await db.delete(media).where(eq(media.resourceId, deleteResource.id));
            }
            
            // Then delete the resource
            await db.delete(resources).where(eq(resources.id, deleteResource.id));
            totalDeleted++;
        }
    }
    
    console.log(`\n=== CLEANUP COMPLETE ===`);
    console.log(`Total resources deleted: ${totalDeleted}`);
    
    // Verify cleanup
    const remainingResources = await db.select().from(resources);
    console.log(`Remaining resources: ${remainingResources.length}`);
    
    // Check for remaining duplicates
    const remainingUrlGroups = new Map<string, any[]>();
    remainingResources.forEach(resource => {
        if (resource.url) {
            const normalizedUrl = resource.url.trim();
            if (!remainingUrlGroups.has(normalizedUrl)) {
                remainingUrlGroups.set(normalizedUrl, []);
            }
            remainingUrlGroups.get(normalizedUrl)!.push(resource);
        }
    });
    
    const remainingDuplicates = Array.from(remainingUrlGroups.entries())
        .filter(([url, resourceList]) => resourceList.length > 1);
    
    if (remainingDuplicates.length === 0) {
        console.log("✅ No duplicates remaining!");
    } else {
        console.log(`❌ Still have ${remainingDuplicates.length} URLs with duplicates`);
        remainingDuplicates.forEach(([url, resourceList]) => {
            console.log(`  "${url}" - ${resourceList.length} times`);
        });
    }
}

cleanupDuplicates().catch(console.error); 