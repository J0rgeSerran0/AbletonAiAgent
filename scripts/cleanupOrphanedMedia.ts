import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema/media';
import { resources } from '@/lib/db/schema/resources';

async function cleanupOrphanedMedia() {
    console.log('🧹 Starting orphaned media cleanup...\n');

    try {
        // Get all media items and resources
        const allMedia = await db.select().from(media);
        const allResources = await db.select().from(resources);
        
        console.log(`📊 Total media items: ${allMedia.length}`);
        console.log(`📊 Total resources: ${allResources.length}`);

        // Create a set of valid resource IDs for fast lookup
        const validResourceIds = new Set(allResources.map(resource => resource.id));
        
        // Find orphaned media (media with resourceId that doesn't exist in resources)
        const orphanedMedia = allMedia.filter(mediaItem => {
            return mediaItem.resourceId && !validResourceIds.has(mediaItem.resourceId);
        });

        console.log(`🔍 Found ${orphanedMedia.length} orphaned media items`);

        if (orphanedMedia.length === 0) {
            console.log('✅ No orphaned media found!');
            return;
        }

        // Show some examples of orphaned media
        console.log('\n📋 Examples of orphaned media:');
        orphanedMedia.slice(0, 10).forEach((mediaItem, index) => {
            console.log(`   ${index + 1}. ID: ${mediaItem.id}`);
            console.log(`      ResourceId: ${mediaItem.resourceId}`);
            console.log(`      URL: ${mediaItem.url.substring(0, 60)}...`);
            console.log(`      Created: ${mediaItem.createdAt}`);
            console.log(`      ---`);
        });

        if (orphanedMedia.length > 10) {
            console.log(`   ... and ${orphanedMedia.length - 10} more orphaned items`);
        }

        // Group orphaned media by resourceId to see patterns
        const orphanedByResourceId = new Map<string, typeof orphanedMedia>();
        orphanedMedia.forEach(mediaItem => {
            const resourceId = mediaItem.resourceId || 'null';
            if (!orphanedByResourceId.has(resourceId)) {
                orphanedByResourceId.set(resourceId, []);
            }
            orphanedByResourceId.get(resourceId)!.push(mediaItem);
        });

        console.log(`\n📊 Orphaned media grouped by resourceId:`);
        console.log(`   Unique orphaned resourceIds: ${orphanedByResourceId.size}`);
        
        // Show the resourceIds with the most orphaned media
        const sortedOrphanedGroups = Array.from(orphanedByResourceId.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5);
        
        sortedOrphanedGroups.forEach(([resourceId, items]) => {
            console.log(`   ResourceId ${resourceId}: ${items.length} orphaned media items`);
        });

        // Ask for confirmation
        console.log(`\n⚠️  This will delete ${orphanedMedia.length} orphaned media items.`);
        console.log('   These items reference resources that no longer exist.');
        
        // Show what will be deleted
        console.log('\n🗑️  Items that will be deleted:');
        const itemsToDelete = orphanedMedia.map(item => item.id);
        
        orphanedMedia.slice(0, 10).forEach((item, index) => {
            console.log(`   ${index + 1}. ID: ${item.id}, ResourceId: ${item.resourceId}, URL: ${item.url.substring(0, 50)}...`);
        });

        if (orphanedMedia.length > 10) {
            console.log(`   ... and ${orphanedMedia.length - 10} more items`);
        }

        // Perform the deletion
        console.log(`\n🗑️  Deleting ${itemsToDelete.length} orphaned items...`);
        
        if (itemsToDelete.length > 0) {
            // Delete in batches to avoid overwhelming the database
            const batchSize = 100;
            let deletedCount = 0;
            
            for (let i = 0; i < itemsToDelete.length; i += batchSize) {
                const batch = itemsToDelete.slice(i, i + batchSize);
                await db.delete(media).where(inArray(media.id, batch));
                deletedCount += batch.length;
                console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} items`);
            }
            
            console.log(`✅ Successfully deleted ${deletedCount} orphaned items`);
        }

        // Verify the cleanup
        console.log('\n🔍 Verifying cleanup...');
        const remainingMedia = await db.select().from(media);
        console.log(`📊 Remaining media items: ${remainingMedia.length}`);
        
        // Check for any remaining orphaned media
        const remainingOrphanedMedia = remainingMedia.filter(mediaItem => {
            return mediaItem.resourceId && !validResourceIds.has(mediaItem.resourceId);
        });
        
        console.log(`🔍 Remaining orphaned media: ${remainingOrphanedMedia.length}`);
        
        if (remainingOrphanedMedia.length === 0) {
            console.log('✅ Cleanup successful! No orphaned media remain.');
        } else {
            console.log('⚠️  Some orphaned media may still exist. Check manually if needed.');
        }

        // Also check for media with null/undefined resourceId
        const mediaWithNullResourceId = remainingMedia.filter(mediaItem => !mediaItem.resourceId);
        console.log(`🔍 Media with null/undefined resourceId: ${mediaWithNullResourceId.length}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Run the cleanup
cleanupOrphanedMedia().catch(console.error); 