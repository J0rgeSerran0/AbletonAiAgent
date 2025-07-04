import { openai } from '@ai-sdk/openai';
import { google } from "@ai-sdk/google";
import { InvalidToolArgumentsError, NoSuchToolError, streamText, ToolExecutionError } from 'ai';
import { findRelevantContent } from '@/lib/ai/embedding';
import { z } from 'zod';
import { getMediasDescriptionFromUrl } from '@/lib/actions/media';
import { db } from '@/lib/db';
import { chat } from '@/lib/db/schema/chat';
import { eq } from 'drizzle-orm';
import { waitUntil } from '@vercel/functions'

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

const systemPrompt = `You are an AI assistant designed to help users understand and utilize Ableton Live 12. 

# You have one main capability:
1. Help users understand and utilize Ableton Live 12 using the Ableton Live 12 documentation

## For Ableton Live 12 documentation:
- Use the "searchDocs" tool to search Ableton Live 12 documentation
- The relevant information from the documentation contains image urls that are very important to understand the context of the answer
- Use "getMediaDescription" tool for all urls found in docs to understand the image and its context

## When users ask about:
- Ableton Live 12 features/usage -> Use searchDocs tool
- General Ableton Live 12 questions -> Use system prompt info

### General Instructions:
1. Always format responses in markdown.
2. Ableton Live 12 is a very visual tool, so always try to include relevant images on the response.
3. If no relevant information is found, ask for clarification.
4. Remember: Ableton Live Live is fast, fluid and flexible software for music creation and performance. It comes with effects, instruments, sounds and all kinds of creative features—everything you need to make any kind of music.
`

const saveToDbPromise = (sessionId: string, lastUserMessage: any, response: string, modelId: string) => {
  return new Promise((resolve, reject) => {
    db.insert(chat).values({ sessionId, response, modelId, question: lastUserMessage }).returning({ id: chat.id }).then((chat) => {
      console.log("chat inserted", chat);
      resolve(chat[0].id);
    }).catch((error) => {
      console.error("Error saving chat to database", error);
      reject(error);
    })
  });
}

export async function POST(req: Request) {

  try {

    const { messages, modelProvider = 'openai', sessionId } = await req.json();
    const model = modelProvider === 'google' ? google("gemini-2.0-flash-001", { structuredOutputs: true }) : openai('gpt-4o-mini');

    const saveChatToDb = (lastUserMessage: any, response: string, modelId: string) => {

      if (process.env.ENVIRONMENT === 'dev') {
        console.log("Skipping chat save for dev session");
        return;
      }

      waitUntil(saveToDbPromise(sessionId, lastUserMessage, response, modelId));

    };

    const result = streamText({
      model,
      system: systemPrompt,
      topP: 0.1,
      messages,
      onFinish: (result) => {

        console.log("onFinish", result.finishReason);

        if (process.env.ENVIRONMENT === 'dev') {
          console.log("Skipping chat save for dev session"); return;
        }

        if (result.finishReason === 'stop') {

          console.log("result.finishReason === 'stop'");

          // Get the answer:
          const response = result.text;
          const modelId = result.response.modelId;

          // Get last message where role = 'user'
          const lastUserMessage = [...messages].reverse().find((message: any) => message.role === 'user').content;

          try {
            saveChatToDb(lastUserMessage, response, modelId);
          } catch (error) {
            console.error("Error saving chat to database", error);
          }
        }
      },
      tools: {
        searchDocs: {
          description: 'Search the Ableton documentation for information',
          parameters: z.object({
            question: z.string().describe('the users question'),
          }),
          execute: async ({ question }) => {
            return findRelevantContent(question, 'ableton_docs_v12')
          },
        },
        getMediaDescription: {
          description: 'Get the description of the image urls from the documentation',
          parameters: z.object({
            urls: z.array(z.string()).describe('the urls of the images'),
          }),
          execute: async ({ urls }) => {
            console.log("Getting medias description from urls");
            return getMediasDescriptionFromUrl(urls)
          },
        },
      },
    });

    return result.toDataStreamResponse({
      getErrorMessage: error => {
        if (NoSuchToolError.isInstance(error)) {
          console.log('The model tried to call a unknown tool.', error)
          return 'The model tried to call a unknown tool.';
        } else if (InvalidToolArgumentsError.isInstance(error)) {
          console.log('The model called a tool with invalid arguments.', error)
          return 'The model called a tool with invalid arguments.';
        } else if (ToolExecutionError.isInstance(error)) {
          console.log('An error occurred during tool execution.', error)
          return 'An error occurred during tool execution.';
        } else {
          console.log('An unknown error occurred.', error)
          return 'An unknown error occurred.';
        }
      },
    })

  } catch (error) {
    console.error('Error processing request:', error); // Log the error for debugging
    return new Response('Internal Server Error', { status: 500 }); // Return a 500 response
  }
}

// I need to create a function that get that receives a chatId and returns the chat history
export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 });
  }
  const chatHistory = await db.select().from(chat).where(eq(chat.sessionId, sessionId));
  return new Response(JSON.stringify(chatHistory), { status: 200 });
}