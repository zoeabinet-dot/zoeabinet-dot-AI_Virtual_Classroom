// FIX: Removed invalid file marker from the top of the file.
// FIX: Removed erroneous file markers that were causing syntax errors.
// FIX: Removed erroneous file header that was causing a syntax error.
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import type { LessonPlan, LessonStep } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const lessonPlanSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING },
    grade: { type: Type.STRING },
    topic: { type: Type.STRING },
    learningObjectives: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['lecture', 'image', 'quiz', 'activity'] },
          content: { type: Type.STRING, description: "For LECTURE, this is the text. For IMAGE, a detailed prompt. For QUIZ, the question. For ACTIVITY, instructions." },
          duration: { type: Type.INTEGER, description: "Estimated duration in minutes." },
          quizOptions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                option: { type: Type.STRING },
                isCorrect: { type: Type.BOOLEAN },
              },
              required: ['option', 'isCorrect'],
            },
            description: "Only include for 'quiz' type steps. Provide 4 options."
          },
        },
        required: ['title', 'type', 'content', 'duration'],
      },
    },
  },
  required: ['subject', 'grade', 'topic', 'learningObjectives', 'steps'],
};

export const generateLessonPlan = async (subject: string, grade: string, topic: string, duration: string): Promise<LessonPlan> => {
  const prompt = `Generate a detailed, engaging, and visually stunning lesson plan for a digital whiteboard. The target audience is ${grade} students, the subject is ${subject}, and the topic is "${topic}".
The total lesson duration MUST be approximately ${duration} minutes. Adjust the depth, detail, and number of steps accordingly.

Act as a world-class curriculum designer. The content for each step must be rich, descriptive, and highly engaging. The tone should be exciting and inspiring.

**CRITICAL FORMATTING RULES:**
- The 'content' for each step MUST be a single string formatted with markdown.
- You MUST use newlines to separate paragraphs, headings, and list items.
- Every heading (e.g., '### title') and every list item (e.g., '* item' or '1. item') MUST start on its own new line.
- Do NOT output a single compressed block of text. Use whitespace for readability.
- Do NOT include a separate line for the duration within the lesson content itself; the duration is already displayed elsewhere.
- The output format MUST precisely follow the detailed example provided below.

**PERFECT EXAMPLE OF AN INTRODUCTION STEP'S 'content' FIELD:**
"🌌 Welcome to Our Cosmic Neighborhood!

👩‍🚀 Hello, future astronauts and stargazers!
Get ready to blast off on an amazing journey as we explore our very own Solar System!
Have you ever looked up at the night sky and wondered what’s out there? 🌠
Well, today, we’re going to find out!

By the end of this adventure, you’ll be a Solar System expert! 🌍✨

### 🎯 Learning Objectives

By the end of this lesson, you will be able to:

* ☀️ Identify the main components of our Solar System (the Sun, planets, and more!).
* 🌎 Describe key features of the inner (terrestrial) and outer (gas giant) planets.
* 🪐 Recall the correct order of planets from the Sun.
* 🌌 Appreciate the vastness and wonder of space.

### 🗓️ Lesson Agenda

1. **Meet Our Star – The Sun!** ☀️
   Discover the heart of our Solar System.
2. **The Inner, Rocky Planets** 🪨
   Mercury, Venus, Earth, and Mars.
3. **Quiz Time: Inner Planets Check!** ❓
   Test your cosmic knowledge.
4. **The Outer, Gas Giants** 🌌
   Jupiter, Saturn, Uranus, Neptune.
5. **Journey’s End, Knowledge Begins!** 🚀
   Reflect on the wonders we’ve discovered."

- A shorter lesson (~15 mins) should be a concise overview.
- A longer lesson (~45 mins) should include more detailed explanations and more activities/quizzes.
- Ensure the durations of all steps sum up to the total requested duration.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: lessonPlanSchema,
      },
    });
    
    const jsonString = response.text.trim();
    return JSON.parse(jsonString) as LessonPlan;
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    throw new Error("Failed to generate lesson plan. Please check your API key and try again.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A vibrant and clear educational illustration for a classroom whiteboard. Style: simple, clean lines, colorful, easy for children to understand. Subject: ${prompt}`,
            config: {
                numberOfImages: 1,
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating image:", error);
        throw new Error("Failed to generate the visual aid.");
    }
};

const whiteboardTools: FunctionDeclaration[] = [
    {
        name: 'addText',
        description: 'Adds a text box to the smart whiteboard.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                text: { type: Type.STRING, description: 'The content of the text box.' },
                options: { type: Type.OBJECT, description: 'Optional styling like { left: 100, top: 100, color: "#ff0000", fontSize: 24 }' }
            },
            required: ['text']
        }
    },
    {
        name: 'addShape',
        description: 'Adds a shape (rectangle or circle) to the smart whiteboard.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                shapeType: { type: Type.STRING, enum: ['rect', 'circle'], description: 'The type of shape to add.' },
                options: { type: Type.OBJECT, description: 'Optional styling like { left: 100, top: 100, fill: "transparent", stroke: "#000" }' }
            },
            required: ['shapeType']
        }
    },
    {
        name: 'addImage',
        description: 'Generates an image from a text prompt and adds it to the whiteboard.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                prompt: { type: Type.STRING, description: 'A detailed description of the image to generate.' },
                options: { type: Type.OBJECT, description: 'Optional positioning like { left: 100, top: 100 }' }
            },
            required: ['prompt']
        }
    },
    {
        name: 'clearCanvas',
        description: 'Clears all content from the smart whiteboard.',
        parameters: { type: Type.OBJECT, properties: {} }
    }
];

export const getChatResponse = async (
    userMessage: string, 
    lessonContext: string,
    chatImageData?: { base64: string; mimeType: string },
    whiteboardJson?: any,
    whiteboardImage?: string,
): Promise<{ text: string; functionCalls?: any[] }> => {
    const systemInstruction = `You are a friendly, interactive AI teacher. You are conducting a lesson for a student and have a shared smart whiteboard.
- The current lesson context is: "${lessonContext}".
- The student may ask questions about the lesson, their chat uploads, or the contents of the whiteboard.
- The whiteboard's contents are provided as both a JSON object list and a screenshot. Use this context to answer questions.
- You have tools to modify the whiteboard. You can use these tools to add text, shapes, generate and add images, or clear the canvas to better explain concepts.
- Be supportive, concise, and helpful.

**CRITICAL RULE:** When you decide to use a tool (i.e., when you generate a functionCall), you MUST ALSO provide a concurrent, friendly text response confirming the action you are taking.
- **Example:** If the user says "Show me a cat," and you use the 'addImage' tool, your response MUST include BOTH the functionCall AND a text property like: "Of course! I'm adding an image of a cat to the whiteboard for you now."
- **Example:** If the user says "Write 'Hello' on the board," your response MUST include BOTH the functionCall for 'addText' AND a text property like: "You got it! I've written 'Hello' on the board."
- Do NOT respond with just a functionCall and no text. Always confirm your action.`;

    const parts = [];

    // Add user's text message if available
    if (userMessage) {
        parts.push({ text: `Student's question: "${userMessage}"` });
    }

    // Add image uploaded via chat
    if (chatImageData) {
        parts.push({ text: "The student has also uploaded this image in the chat:" });
        parts.push({ inlineData: { data: chatImageData.base64, mimeType: chatImageData.mimeType } });
    }

    // Add whiteboard context
    if (whiteboardJson && whiteboardJson.length > 0 && whiteboardImage) {
        parts.push({ text: `Here is the current state of the shared whiteboard. Use this context for your answer.`});
        parts.push({ text: `Whiteboard objects (JSON): ${JSON.stringify(whiteboardJson)}` });
        parts.push({ inlineData: { data: whiteboardImage, mimeType: 'image/png' } });
    } else {
        parts.push({ text: "The shared whiteboard is currently empty." });
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
              systemInstruction: systemInstruction,
              tools: [{ functionDeclarations: whiteboardTools }],
            }
        });

        return {
            text: response.text,
            functionCalls: response.functionCalls,
        };

    } catch (error) {
        console.error("Error getting chat response:", error);
        return { text: "I'm sorry, I'm having a little trouble thinking right now. Could you ask me again in a moment?" };
    }
};

export const getAdaptiveSuggestion = async (lessonContent: string, engagement: string): Promise<string> => {
    const prompt = `As an AI teacher, you've noticed a student's engagement level is ${engagement}.
    The current topic is: "${lessonContent}".
    
    Suggest a brief, alternative way to engage the student. This could be a fun fact, a quick question, or a different way to explain the concept to recapture their interest. Your response should be directly addressed to the student.`;
    
    try {
        const response = await ai.models.generateContent({
            // FIX: Corrected typo in model name
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error getting adaptive suggestion:", error);
        return "Let's try looking at this from a different angle!";
    }
};

export const regenerateStepContent = async (step: LessonStep, engagement: string): Promise<string> => {
    const prompt = `You are an AI teacher. A student's engagement is currently ${engagement} during the lesson step "${step.title}".
    The current content is: "${step.content}".
    
    Your task is to rewrite or restructure this content to make it more engaging.
    - If it's a lecture, try using a simple analogy, a story, or a direct question-and-answer format.
    - If it's an activity, simplify the instructions or make them more exciting.
    - Keep the core learning objective the same.
    - The output should ONLY be the new content, ready to be displayed on the whiteboard.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error regenerating step content:", error);
        return "I had a great new idea, but it slipped my mind! Let's continue with our current plan for now.";
    }
};