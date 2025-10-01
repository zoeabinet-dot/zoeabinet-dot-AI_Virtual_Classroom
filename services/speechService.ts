import { isSpeaking as isSynthSpeaking, stop as stopSynth, speak as synthSpeak } from './synthService';

const cleanTextForSpeech = (text: string): string => {
  // Remove markdown, then collapse whitespace
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')   // italics
    .replace(/###\s?/g, '')        // headers
    .replace(/---/g, ' ')          // horizontal rules
    .replace(/(\r\n|\n|\r)/gm, " ") // newlines
    .replace(/\s+/g, ' ')          // collapse multiple spaces
    .trim();
};


export const speak = (text: string, onEnd: () => void): void => {
  const cleanText = cleanTextForSpeech(text);
  synthSpeak(cleanText, onEnd);
};

export const stopSpeaking = (): void => {
  stopSynth();
};

export const isSpeaking = (): boolean => {
    return isSynthSpeaking();
}
