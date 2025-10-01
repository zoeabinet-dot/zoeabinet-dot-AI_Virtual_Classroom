import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { getChatResponse } from '../services/geminiService';
import { Send, MessageSquare, Loader2, User, Hand, Mic, Paperclip, X, Sparkles } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  lessonContext: string;
  onRaiseHand: () => void;
  onSuggestionAction?: (action: 'regenerate') => void;
  onAiToolCall: (toolCall: { name: string; args: any }) => void;
  getWhiteboardState: () => { json: any; image: string } | null;
}

const formatChatMessage = (text: string) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    return { __html: html };
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


const ChatPanel: React.FC<ChatPanelProps> = ({ messages, setMessages, lessonContext, onRaiseHand, onSuggestionAction, onAiToolCall, getWhiteboardState }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechRecognitionSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          else interimTranscript += event.results[i][0].transcript;
        }
        setInput(finalTranscript + interimTranscript);
      };
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setInput('');
      recognitionRef.current?.start();
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if(imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (input.trim() === '' && !imageFile) return;
    if(isListening) recognitionRef.current?.stop();

    const newUserMessage: ChatMessage = { sender: 'user', text: input, imageUrl: imagePreviewUrl };
    setMessages(prev => [...prev, newUserMessage]);
    
    let chatImageData: { base64: string; mimeType: string } | undefined = undefined;
    if (imageFile) {
        const base64String = await fileToBase64(imageFile);
        chatImageData = { base64: base64String.split(',')[1], mimeType: imageFile.type };
    }
    
    const whiteboardState = getWhiteboardState();

    setInput('');
    clearImage();
    setIsTyping(true);

    const aiResponse = await getChatResponse(input, lessonContext, chatImageData, whiteboardState?.json, whiteboardState?.image);
    
    if (aiResponse.text) {
        const newAiMessage: ChatMessage = { sender: 'ai', text: aiResponse.text };
        setMessages(prev => [...prev, newAiMessage]);
    }

    if (aiResponse.functionCalls) {
        aiResponse.functionCalls.forEach(onAiToolCall);
    }
    
    setIsTyping(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col h-[524px]">
      <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center space-x-2">
            <MessageSquare className="h-6 w-6 text-indigo-500" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Class Chat</h3>
        </div>
        <button onClick={onRaiseHand} className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold rounded-md bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900">
            <Hand size={14} />
            <span>Raise Hand</span>
        </button>
      </div>

      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.length === 0 && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 h-full flex flex-col justify-center">
                <p>Have a question or want to share something?</p>
                <p>The AI can now see and interact with the whiteboard!</p>
            </div>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'ai' && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">AI</div>
            )}
            <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-sm ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="User upload" className="mb-2 rounded-lg max-w-full h-auto" />
              )}
              {msg.text && <p className="text-sm" dangerouslySetInnerHTML={formatChatMessage(msg.text)}></p>}
              {msg.suggestion && onSuggestionAction && (
                <button
                    onClick={() => onSuggestionAction(msg.suggestion!.action)}
                    className="mt-2 w-full text-left px-3 py-1.5 text-sm font-semibold rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors flex items-center space-x-2"
                >
                    <Sparkles size={16} />
                    <span>{msg.suggestion.label}</span>
                </button>
              )}
            </div>
             {msg.sender === 'user' && (
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 flex items-center justify-center">
                <User size={16}/>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-end gap-2 justify-start">
             <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">AI</div>
            <div className="px-4 py-2 rounded-2xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none">
              <div className="flex items-center space-x-1">
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {imagePreviewUrl && (
        <div className="p-4 border-t dark:border-gray-700">
            <div className="relative inline-block">
              <img src={imagePreviewUrl} alt="Preview" className="h-16 w-16 object-cover rounded-md" />
              <button onClick={clearImage} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5 hover:bg-red-500">
                <X size={14} />
              </button>
            </div>
        </div>
      )}

      <div className="p-4 border-t dark:border-gray-700">
        <div className="relative flex items-center space-x-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*" />
            <button onClick={() => fileInputRef.current?.click()} className='p-2 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors'>
                <Paperclip className="h-5 w-5" />
            </button>
           {isSpeechRecognitionSupported && (
             <button onClick={handleToggleListening} className={`p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
                <Mic className="h-5 w-5" />
             </button>
           )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSend()}
            placeholder={isListening ? "Listening..." : "Ask about the whiteboard..."}
            className="w-full pr-12 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"
            disabled={isTyping}
          />
          <button onClick={handleSend} disabled={isTyping || (!input.trim() && !imageFile)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-400 dark:disabled:bg-indigo-500/50 disabled:cursor-not-allowed">
            {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;