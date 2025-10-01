import { GoogleGenAI, Type } from "@google/genai";
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

export const generateLessonPlan = async (subject: string, grade: string, topic: string): Promise<LessonPlan> => {
  const prompt = `Generate a detailed, engaging, and structured lesson plan for a class of ${grade} students on the topic of "${topic}" in the subject of ${subject}. The lesson should be broken down into clear steps, including a mix of lectures, visual aids (describe what image to generate), interactive quizzes (with 4 options), and simple activities. The total lesson duration should be around 30-45 minutes.`;

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

export const getChatResponse = async (
    userMessage: string, 
    lessonContext: string,
    imageData?: { base64: string; mimeType: string }
): Promise<string> => {
    const systemInstruction = `You are a friendly and encouraging AI teacher. A student has a question or has shared an image. The current lesson context is "${lessonContext}". Please provide a clear, concise, and helpful answer suitable for the student's grade level. If an image was provided with the question, analyze it and incorporate your analysis into the response. Be supportive and positive.`;

    const parts = [];
    if (imageData) {
        parts.push({
            inlineData: {
                data: imageData.base64,
                mimeType: imageData.mimeType,
            },
        });
    }
    if (userMessage) {
        parts.push({ text: userMessage });
    } else {
        parts.push({ text: "Please analyze this image in the context of our lesson."});
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts },
            config: {
              systemInstruction: systemInstruction,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error getting chat response:", error);
        return "I'm sorry, I'm having a little trouble thinking right now. Could you ask me again in a moment?";
    }
};

export const getAdaptiveSuggestion = async (lessonContent: string, engagement: string): Promise<string> => {
    const prompt = `As an AI teacher, you've noticed a student's engagement level is ${engagement}.
    The current topic is: "${lessonContent}".
    
    Suggest a brief, alternative way to engage the student. This could be a fun fact, a quick question, or a different way to explain the concept to recapture their interest. Your response should be directly addressed to the student.`;
    
    try {
        const response = await ai.models.generateContent({
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