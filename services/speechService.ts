import { isSpeaking as isSynthSpeaking, stop as stopSynth, speak as synthSpeak } from './synthService';

const cleanTextForSpeech = (text: string): string => {
  // A more comprehensive regex to remove a wide range of emoji and symbol characters.
  // Based on the 'emoji-regex' package for robustness.
  const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26ff]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

  // Remove markdown, emojis, then collapse whitespace
  return text
    .replace(emojiRegex, '')           // remove emojis
    .replace(/\*\*(.*?)\*\*/g, '$1')      // bold
    .replace(/\*(.*?)\*/g, '$1')        // italics
    .replace(/###\s?/g, '')             // headers
    .replace(/^(\s*(\*|-)\s+)/gm, '') // list items (multiline)
    .replace(/---/g, ' ')               // horizontal rules
    .replace(/(\r\n|\n|\r)/gm, " ")      // newlines
    .replace(/\s+/g, ' ')               // collapse multiple spaces
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