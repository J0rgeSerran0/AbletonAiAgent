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
import { freeTools, systemPrompt } from './freeModel';

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

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
      tools: freeTools,
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