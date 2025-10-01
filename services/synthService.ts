// This service directly interacts with the browser's SpeechSynthesis API.
// It's kept separate to encapsulate the browser-specific logic.

const synth = window.speechSynthesis;
let currentUtterance: SpeechSynthesisUtterance | null = null;

export const speak = (text: string, onEnd: () => void): void => {
  if (synth.speaking) {
    // Cancel existing speech to prevent overlap and ensure the new utterance plays.
    synth.cancel();
  }
  
  if (text && text.trim() !== '') {
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onend = () => {
      if (currentUtterance === utterance) {
        currentUtterance = null;
        onEnd();
      }
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror', event.error); // Log the specific error
      if (currentUtterance === utterance) {
        currentUtterance = null;
        onEnd(); // Still call onEnd to unblock UI state
      }
    };

    currentUtterance = utterance;
    try {
        synth.speak(utterance);
    } catch(e) {
        console.error("Error speaking utterance:", e);
        onEnd();
    }
  } else {
    // If there's nothing to say, call onEnd immediately.
    onEnd();
  }
};

export const stop = (): void => {
  if (synth.speaking) {
    synth.cancel();
  }
};

export const isSpeaking = (): boolean => {
    return synth.speaking;
}