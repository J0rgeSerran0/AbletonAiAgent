import { inArray } from "drizzle-orm";
import { db } from "../db";
import { media } from "../db/schema/media";

export const getMediasDescriptionFromUrl = async (urls: string[]) => {
    // The urls are in the format https://ableton-production.imgix.net/live-manual/12/AutoShiftLFOTabL12.png?auto=&w=909'
    // I need to remove all the query parameters in order to search for them
    const urlsWithoutQueryParams = urls.map(url => url.split('?')[0]);
    const medias = await db.select().from(media).where(inArray(media.url, urlsWithoutQueryParams));
    return medias.map(media => ({ url: media.url, description: media.description }));
}