import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { media } from '@/lib/db/schema/media';
import { resources } from '@/lib/db/schema/resources';

async function cleanupMediaDuplicates() {
    console.log('🧹 Starting duplicate media cleanup...\n');

    try {
        // Get all media items and resources
        const allMedia = await db.select().from(media);
        const allResources = await db.select().from(resources);
        
        console.log(`📊 Total media items: ${allMedia.length}`);
        console.log(`📊 Total resources: ${allResources.length}`);

        // Create a set of valid resource IDs for fast lookup
        const validResourceIds = new Set(allResources.map(resource => resource.id));
        
        // First, check for orphaned media (media with resourceId that doesn't exist)
        const orphanedMedia = allMedia.filter(mediaItem => {
            return mediaItem.resourceId && !validResourceIds.has(mediaItem.resourceId);
        });

        if (orphanedMedia.length > 0) {
            console.log(`⚠️  Found ${orphanedMedia.length} orphaned media items (referencing non-existent resources)`);
            console.log('   These should be cleaned up first. Consider running cleanupOrphanedMedia.ts');
            console.log('   Continuing with duplicate cleanup, but orphaned items may affect results...\n');
        }

        // Filter out orphaned media for duplicate analysis
        const validMedia = allMedia.filter(mediaItem => {
            return !mediaItem.resourceId || validResourceIds.has(mediaItem.resourceId);
        });

        console.log(`📊 Valid media items (with existing resources): ${validMedia.length}`);

        // Group media by URL to find duplicates
        const urlGroups = new Map<string, typeof validMedia>();
        
        validMedia.forEach(mediaItem => {
            const url = mediaItem.url;
            if (!urlGroups.has(url)) {
                urlGroups.set(url, []);
            }
            urlGroups.get(url)!.push(mediaItem);
        });

        // Find URLs with duplicates
        const duplicateUrls = new Map<string, typeof validMedia>();
        let totalDuplicates = 0;
        
        urlGroups.forEach((items, url) => {
            if (items.length > 1) {
                duplicateUrls.set(url, items);
                totalDuplicates += items.length - 1; // -1 because we keep one
            }
        });

        console.log(`🔍 Found ${duplicateUrls.size} URLs with duplicates`);
        console.log(`📈 Total duplicate items to remove: ${totalDuplicates}`);

        if (duplicateUrls.size === 0) {
            console.log('✅ No duplicates found!');
            if (orphanedMedia.length > 0) {
                console.log(`⚠️  But there are ${orphanedMedia.length} orphaned media items to clean up.`);
            }
            return;
        }

        // Show some examples of duplicates
        console.log('\n📋 Examples of duplicates:');
        let exampleCount = 0;
        duplicateUrls.forEach((items, url) => {
            if (exampleCount < 5) {
                console.log(`   URL: ${url.substring(0, 80)}...`);
                console.log(`   Count: ${items.length} items`);
                console.log(`   IDs: ${items.map(item => item.id).join(', ')}`);
                console.log(`   ResourceIds: ${items.map(item => item.resourceId).join(', ')}`);
                console.log(`   ---`);
                exampleCount++;
            }
        });

        if (duplicateUrls.size > 5) {
            console.log(`   ... and ${duplicateUrls.size - 5} more URLs with duplicates`);
        }

        // Ask for confirmation
        console.log(`\n⚠️  This will delete ${totalDuplicates} duplicate media items.`);
        console.log('   Only the first occurrence of each URL will be kept.');
        
        // For safety, let's show what will be deleted
        console.log('\n🗑️  Items that will be deleted:');
        let deleteCount = 0;
        const itemsToDelete: string[] = [];
        
        duplicateUrls.forEach((items, url) => {
            // Keep the first item (oldest by creation time), delete the rest
            const sortedItems = items.sort((a, b) => 
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            // Keep the first one, mark the rest for deletion
            const toDelete = sortedItems.slice(1);
            toDelete.forEach(item => {
                itemsToDelete.push(item.id);
                deleteCount++;
                
                if (deleteCount <= 10) {
                    console.log(`   - ID: ${item.id}, ResourceId: ${item.resourceId}, URL: ${item.url.substring(0, 60)}...`);
                }
            });
        });

        if (deleteCount > 10) {
            console.log(`   ... and ${deleteCount - 10} more items`);
        }

        // Perform the deletion
        console.log(`\n🗑️  Deleting ${itemsToDelete.length} duplicate items...`);
        
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
            
            console.log(`✅ Successfully deleted ${deletedCount} duplicate items`);
        }

        // Verify the cleanup
        console.log('\n🔍 Verifying cleanup...');
        const remainingMedia = await db.select().from(media);
        console.log(`📊 Remaining media items: ${remainingMedia.length}`);
        
        // Check for any remaining duplicates
        const remainingUrlGroups = new Map<string, typeof remainingMedia>();
        remainingMedia.forEach(mediaItem => {
            const url = mediaItem.url;
            if (!remainingUrlGroups.has(url)) {
                remainingUrlGroups.set(url, []);
            }
            remainingUrlGroups.get(url)!.push(mediaItem);
        });
        
        const remainingDuplicates = Array.from(remainingUrlGroups.values()).filter(items => items.length > 1);
        console.log(`🔍 Remaining URLs with duplicates: ${remainingDuplicates.length}`);
        
        if (remainingDuplicates.length === 0) {
            console.log('✅ Cleanup successful! No duplicates remain.');
        } else {
            console.log('⚠️  Some duplicates may still exist. Check manually if needed.');
        }

        // Check for remaining orphaned media
        const remainingOrphanedMedia = remainingMedia.filter(mediaItem => {
            return mediaItem.resourceId && !validResourceIds.has(mediaItem.resourceId);
        });
        console.log(`🔍 Remaining orphaned media: ${remainingOrphanedMedia.length}`);

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

// Run the cleanup
cleanupMediaDuplicates().catch(console.error); 