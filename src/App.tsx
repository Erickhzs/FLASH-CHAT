import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Send, Bot, User, Zap, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Olá! Eu sou o **Flash Chat**, seu assistente virtual super rápido. Como posso te ajudar hoje?',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // We need to keep the chat session in a ref to persist across renders
  const chatSessionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize chat session
    chatSessionRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: 'Você é um assistente virtual prestativo, claro e conciso chamado Flash Chat. Responda sempre em português, a menos que solicitado o contrário.',
      }
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !chatSessionRef.current || isLoading) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    const modelMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: modelMsgId, role: 'model', text: '' }]);

    try {
      const responseStream = await chatSessionRef.current.sendMessageStream({ message: userText });
      
      let fullText = '';
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        fullText += c.text || '';
        setMessages(prev => 
          prev.map(msg => msg.id === modelMsgId ? { ...msg, text: fullText } : msg)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => 
        prev.map(msg => msg.id === modelMsgId ? { ...msg, text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.' } : msg)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-zinc-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-md">
            <Zap size={24} className="fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900">Flash Chat</h1>
            <p className="text-xs font-medium text-zinc-500">Powered by Gemini</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg, index) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              key={msg.id}
              className={cn(
                "flex gap-4",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full mt-1",
                msg.role === 'user' ? "bg-zinc-800 text-white" : "bg-amber-100 text-amber-600"
              )}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              
              <div className={cn(
                "px-5 py-3.5 rounded-2xl max-w-[85%] shadow-sm",
                msg.role === 'user' 
                  ? "bg-zinc-900 text-white rounded-tr-sm" 
                  : "bg-white border border-zinc-200 text-zinc-800 rounded-tl-sm"
              )}>
                {msg.role === 'model' && !msg.text && isLoading && index === messages.length - 1 ? (
                  <div className="flex items-center gap-1 h-6">
                    <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div className={cn(
                    "prose prose-sm sm:prose-base max-w-none break-words",
                    msg.role === 'user' ? "prose-invert" : "prose-zinc"
                  )}>
                    <Markdown remarkPlugins={[remarkGfm]}>
                      {msg.text}
                    </Markdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-zinc-200 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto relative">
          <form 
            onSubmit={handleSend}
            className="flex items-end gap-2 bg-zinc-100 rounded-2xl p-2 border border-zinc-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all shadow-sm"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:outline-none resize-none py-2.5 px-3 text-zinc-900 placeholder:text-zinc-500"
              rows={1}
              style={{ height: 'auto' }}
              // Auto-resize textarea
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 transition-colors"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} className="ml-0.5" />}
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-zinc-400">Flash Chat pode cometer erros. Considere verificar informações importantes.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
