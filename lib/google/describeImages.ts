import { GoogleGenAI } from '@google/genai';

export const describeImageFromUrl = async (fileURL: string, resourceTitle: string, resourceDescription: string) => {


    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
    }

    const { mimeType, buffer } = await fetch(fileURL, { cache: 'no-store' }).then((response) => {
        if (!response.ok) {
            console.error("Failed to fetch image or gif", fileURL);
            throw new Error("Failed to fetch image or gif");
        }
        return response.arrayBuffer().then((buffer) => {
            const mimeType = response.headers.get('Content-Type');
            // If the file has more than 20971520 bytes I can't upload it to google
            if (mimeType === 'image/svg+xml') throw new Error("SVG not supported");
            if (mimeType === 'image/gif') throw new Error("GIF not supported");
            if (buffer.byteLength > 17000000) throw new Error("File too large");
            return { mimeType, buffer };
        })
    });

    if (!mimeType || !buffer) throw new Error("Failed to fetch image or gif");
    console.log("mimeType", mimeType, "url", fileURL)

    const prompt = `You are a helpful assistant that can describe images.
    You are given a resource title and description, and an image.
    The file you are analyzing was extracted from the Ableton Live 12 documentation. Ableton Live is a music production software.
    The section of the Ableton Live 12 documentation has the title "${resourceTitle}" and the description "${resourceDescription}".
    You need to describe the image in a way that is helpful to the user.
    The resource title is ${resourceTitle} and the resource description is ${resourceDescription}.
    Answer with just the description, no other text.`

    const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }); //new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    const base64Data = Buffer.from(buffer).toString("base64");
    const contents = [
        {
            inlineData: {
                mimeType,
                data: base64Data,
            },
        },
        { text: prompt },
    ];

    const response = await genAI.models.generateContent({
        model: "gemini-2.0-flash",
        contents,
    });

    // const result = await model.generateContent([
    //     {
    //         inlineData: {
    //             data: Buffer.from(buffer).toString("base64"),
    //             mimeType
    //         },
    //     },
    //     prompt
    // ]);

    // Handle the response of generated text
    console.log(response.text)
    if (!response.text) throw new Error("Failed to generate description");

    return { mimeType, description: response.text };
}