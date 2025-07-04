import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { resources, ResourceType } from '@/lib/db/schema/resources';
import { media } from '@/lib/db/schema/media';
import fs from 'fs';
import path from 'path';
import FirecrawlApp, { ScrapeResponse } from '@mendable/firecrawl-js';
import { createResource } from '@/lib/actions/resources';
import { describeImageFromUrl } from '@/lib/google/describeImages';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

export async function scrap() {

    const currentFilePath = import.meta.url;
    const currentDirectory = path.dirname(currentFilePath);

    const urlsFile = path.join(currentDirectory, './urls.md');
    const urlsFileWithoutFilePrefix = urlsFile.replace('file:', '')
    
    const data = await fs.promises.readFile(urlsFileWithoutFilePrefix, 'utf8');
    const urlsArray = data.split('\n').filter(url => !url.startsWith('#') && url.length > 0);

    const allResources = await db.select().from(resources);
    if(allResources.length === 0) {
        console.log("No resources found in the database");
        throw new Error("No resources found in the database");
    }

    for (var url of urlsArray) {
        
        // Trim the URL to remove any whitespace
        const normalizedUrl = url.trim()
        
        const resource = await db.select().from(resources).where(eq(resources.url, normalizedUrl));
        if(resource.length === 0) {
            console.log("Couldnt find resource with url using where clause: ", normalizedUrl);
            // Try to find the resource using the allResources array
            const resourceFromArray = allResources.find(resource => resource.url === normalizedUrl);
            if(resourceFromArray) {
                console.log("Found resource with url using allResources array: ", normalizedUrl);
                throw new Error("Found resource on the database but not in the where clause");
            }
        }

        if (resource.length > 0) {
            console.log("Resource already exists: ", url);
            console.log(`🔍 Resource ID: ${resource[0].id}`);
            
            // Get the url of the images from the resource
            // The images url start with https://ableton-production.imgix.net/
            const extractedUrls = resource[0].content.match(/\bhttps?:\/\/ableton-production\.imgix\.net\/\S+\.png\b/g);
            console.log(`🔍 Extracted URLs count: ${extractedUrls ? extractedUrls.length : 0}`);
            
            if (extractedUrls && extractedUrls.length > 0) {
                // Get all media from the resource - using a more explicit approach
                console.log(`🔍 Querying media for resourceId: ${resource[0].id}`);
                let allResourceMedia = await db.select().from(media).where(eq(media.resourceId, resource[0].id));
                console.log(`🔍 Media query result: ${allResourceMedia.length} items`);
                
                // If the query returns 0 but we expect media, try a fallback approach
                if (allResourceMedia.length === 0) {
                    console.log(`⚠️ Media query returned 0, trying fallback approach...`);
                    // Try getting all media and filtering in memory
                    const allMedia = await db.select().from(media);
                    allResourceMedia = allMedia.filter(m => m.resourceId === resource[0].id);
                    console.log(`🔍 Fallback approach found: ${allResourceMedia.length} items`);
                }

                if(extractedUrls.length === allResourceMedia.length) {
                    console.log("All images and gifs already exist for the resource: ", url);
                    continue;
                }
                for (var imageUrl of extractedUrls) {
                    const resourceMedia = allResourceMedia.find(media => media.url === imageUrl);
                    if (resourceMedia) continue;
                    try {
                        const { description, mimeType } = await describeImageFromUrl(imageUrl, resource[0].title, resource[0].description);
                        await db.insert(media).values({
                            url: imageUrl,
                            mimeType: mimeType,
                            description: description,
                            resourceId: resource[0].id,
                        });
                        console.log("Media created: ", imageUrl, description, mimeType);
                    } catch(error) {
                        if (error instanceof Error && error.message === "SVG not supported") {
                            // This is fine, we can ignore it
                            console.error("Caught an unsupported SVG error:", error.message);
                        } else if(error instanceof Error && error.message === "File too large") {
                            // This is fine, we can ignore it
                            console.error("Caught a file too large error:", error.message);
                        } else if(error instanceof Error && error.message === "GIF not supported") {
                            // This is fine, we can ignore it
                            console.error("Caught a GIF not supported error:", error.message);
                        } else if (error instanceof Error && error.message == "Failed to fetch image or gif") {
                            // This is fine, we can ignore it
                            console.error("Caught a failed to fetch image or gif error:", error.message);
                        } else {
                            console.error("An error occurred:", error);
                            // This is not fine, we need to throw an error
                            throw error;
                        }
                    }
                }

                console.log("Finished adding images and gifs for the resource: ", url);
            } 

            continue;
        } else {
            const scrapeResult = await app.scrapeUrl(url, { formats: ['markdown', 'html'] }) as ScrapeResponse;

            if (!scrapeResult.success) {
                throw new Error(`Failed to crawl: ${scrapeResult.error}`)
            }

            if (scrapeResult.markdown) {

                // Use the createResource function
                const title = scrapeResult.title || scrapeResult.metadata?.title || '';
                const description = scrapeResult.description || scrapeResult.metadata?.description || '';

                try {
                    await createResource({
                        url: url,
                        type: ResourceType.URL,
                        content: scrapeResult.markdown,
                        title: title,
                        description: description,
                        source: 'ableton_docs_v12',
                    });

                    console.log("Resource created: ", title, description);
                } catch (error) {
                    console.error("Error creating resource: ", title, error);
                    break;
                }

                // I need to wait some random time between 0.7 and 1.5 seconds
                const waitTime = Math.floor(Math.random() * 800) + 700;
                await new Promise(resolve => setTimeout(resolve, waitTime));

            }
        }
    }

    console.log("Scrapping finished");
}

scrap().catch(console.error);