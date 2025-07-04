import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources } from '@/lib/db/schema/resources';
import { media } from '@/lib/db/schema/media';

async function debugMediaResourceId() {
    console.log('🔍 Debugging Media ResourceId mismatch issue...\n');

    // Get all resources and media from database
    const allResources = await db.select().from(resources);
    const allMedia = await db.select().from(media);
    
    console.log(`🗄️  Found ${allResources.length} resources in database`);
    console.log(`🖼️  Found ${allMedia.length} media items in database\n`);

    // Test a few resources to see if their media queries work
    for (let i = 0; i < Math.min(5, allResources.length); i++) {
        const resource = allResources[i];
        console.log(`\n--- Testing Resource ${i + 1} ---`);
        console.log(`Resource ID: ${resource.id}`);
        console.log(`Resource URL: ${resource.url}`);
        console.log(`Resource Title: ${resource.title.substring(0, 50)}...`);
        
        // Try to find media with this resourceId using Drizzle query
        const resourceMedia = await db.select().from(media).where(eq(media.resourceId, resource.id));
        console.log(`🔍 Drizzle query result length: ${resourceMedia.length}`);
        
        // Also check using array filter to compare
        const mediaForThisResource = allMedia.filter(m => m.resourceId === resource.id);
        console.log(`🔍 Array filter result length: ${mediaForThisResource.length}`);
        
        if (resourceMedia.length === 0 && mediaForThisResource.length > 0) {
            console.log(`❌ MISMATCH: Drizzle query found 0, but array filter found ${mediaForThisResource.length}`);
            console.log(`   This indicates a Drizzle query issue!`);
            
            // Show the media that should be found
            mediaForThisResource.forEach(m => {
                console.log(`   - Media ID: ${m.id}, ResourceId: ${m.resourceId}, URL: ${m.url}`);
            });
        } else if (resourceMedia.length > 0) {
            console.log(`✅ Drizzle query found ${resourceMedia.length} media items`);
            resourceMedia.forEach(m => {
                console.log(`   - Media ID: ${m.id}, URL: ${m.url}`);
            });
        } else {
            console.log(`ℹ️  No media found for this resource (both methods agree)`);
        }
    }

    // Show some sample data to understand the data types
    console.log(`\n📋 Sample Resources:`);
    allResources.slice(0, 3).forEach(resource => {
        console.log(`   ID: "${resource.id}" (type: ${typeof resource.id})`);
        console.log(`   URL: "${resource.url}"`);
        console.log(`   ---`);
    });

    console.log(`\n📋 Sample Media:`);
    allMedia.slice(0, 3).forEach(mediaItem => {
        console.log(`   ID: "${mediaItem.id}" (type: ${typeof mediaItem.id})`);
        console.log(`   ResourceId: "${mediaItem.resourceId}" (type: ${typeof mediaItem.resourceId})`);
        console.log(`   URL: "${mediaItem.url}"`);
        console.log(`   ---`);
    });

    // Check for any data type mismatches
    console.log(`\n🔍 Data Type Analysis:`);
    const resourceIds = allResources.map(r => r.id);
    const mediaResourceIds = allMedia.map(m => m.resourceId).filter(Boolean);
    
    console.log(`Resource ID types: ${[...new Set(resourceIds.map(id => typeof id))].join(', ')}`);
    console.log(`Media ResourceId types: ${[...new Set(mediaResourceIds.map(id => typeof id))].join(', ')}`);
    
    // Check for any null/undefined resourceIds in media
    const nullResourceIds = allMedia.filter(m => !m.resourceId);
    console.log(`Media with null/undefined resourceId: ${nullResourceIds.length}`);
    
    // Check for orphaned media (media with resourceId that doesn't exist in resources)
    const orphanedMedia = allMedia.filter(m => m.resourceId && !resourceIds.includes(m.resourceId));
    console.log(`Orphaned media (resourceId not in resources): ${orphanedMedia.length}`);
}

debugMediaResourceId().catch(console.error); 