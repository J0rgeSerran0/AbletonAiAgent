import { z } from 'zod';
import { findRelevantContent } from '@/lib/ai/embedding';
import { getMediasDescriptionFromUrl } from '@/lib/actions/media';

export const systemPrompt = `You are an AI assistant designed to help users understand and utilize Ableton Live 12. 

# You have one main capability:
1. Help users understand and utilize Ableton Live 12 using the Ableton Live 12 documentation

## For Ableton Live 12 documentation:
- Use the "searchDocs" tool to search Ableton Live 12 documentation
- The relevant information from the documentation contains image urls that are very important to understand the context of the answer
- Use "getMediaDescription" tool ONLY for urls that are returned by the searchDocs tool
- NEVER invent or create URLs - only use URLs that exist in the documentation database

## When users ask about:
- Ableton Live 12 features/usage -> Use searchDocs tool
- General Ableton Live 12 questions -> Use system prompt info

### General Instructions:
1. Always format responses in markdown.
2. Ableton Live 12 is a very visual tool, so include relevant images when available from the documentation.
3. IMPORTANT: Only use image URLs that are returned by the "getMediaDescription" tool. Never invent or create URLs.
4. If no relevant information is found, ask for clarification.
5. Remember: Ableton Live Live is fast, fluid and flexible software for music creation and performance. It comes with effects, instruments, sounds and all kinds of creative features—everything you need to make any kind of music.
`
export const freeTools = {
  searchDocs: {
    description: 'Search the Ableton documentation for information. This will return content that may contain image URLs. Only use those URLs with getMediaDescription tool.',
    parameters: z.object({
      question: z.string().describe('the users question'),
    }),
    execute: async ({ question }: { question: string }) => {
      return findRelevantContent(question, 'ableton_docs_v12')
    },
  },
  getMediaDescription: {
    description: 'Get the description of the image urls from the documentation. Only use URLs that are returned by searchDocs tool.',
    parameters: z.object({
      urls: z.array(z.string()).describe('the urls of the images'),
    }),
    execute: async ({ urls }: { urls: string[] }) => {
      console.log("Getting medias description from urls");
      return getMediasDescriptionFromUrl(urls)
    },
  },
}