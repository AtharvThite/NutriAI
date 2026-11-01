import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage, ChatSource } from '../types';

export const NutritionChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am **NutriAI**, your AI Indian Food & Clinical Nutrition Assistant.\n\n' +
        'I am powered by **Retrieval-Augmented Generation (RAG)** on 20 verified nutrition documents, and integrated with the **Anuvaad Indian Food Composition Database** (1,014 laboratory-analyzed foods).\n\n' +
        'How can I help you optimize your nutrition today?',
      sources: [
        { document_id: 'macronutrients_001', title: 'Macronutrients in Human Nutrition' },
        { document_id: 'indian_food_habits_001', title: 'Traditional and Contemporary Indian Dietary Habits' }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelProvider, setModelProvider] = useState<'lora' | 'groq'>('lora');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsgId = `user_${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(text, modelProvider);
      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        requires_clarification: response.requires_clarification,
        intent: response.intent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content:
          'I encountered a communication issue while contacting the backend service. ' +
          'Please ensure the FastAPI backend is running on `http://localhost:8000`.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedQuestions = [
    'What are the best vegetarian protein sources in an Indian diet?',
    'What is the nutrition composition of 150g dal tadka?',
    'How does South Indian fermentation improve idli and dosa bioavailability?',
    'What are the primary energy macronutrients and their caloric densities?',
    'I had 2 rotis with dal tadka for lunch'
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <span>AI Nutrition Assistant</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              RAG + LangGraph
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Grounded in 20 clinical nutrition documents & 1,014 Anuvaad Indian food records.
          </p>
        </div>

        {/* Model Provider Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setModelProvider('lora')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              modelProvider === 'lora'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fine-Tuned LoRA (Local)</span>
          </button>
          <button
            type="button"
            onClick={() => setModelProvider('groq')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              modelProvider === 'groq'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Groq Cloud API</span>
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs'
                  : 'bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs'
              }`}
            >
              {/* Intent / Clarification badge */}
              {msg.role === 'assistant' && msg.intent && (
                <div className="mb-2 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                    {msg.intent}
                  </span>
                  {msg.requires_clarification && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> Clarification Needed
                    </span>
                  )}
                </div>
              )}

              {/* Message Content (Formatted lines) */}
              <div className="space-y-2 whitespace-pre-line">
                {msg.content.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) {
                    return (
                      <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 border-b border-slate-100 pb-1">
                        {line.replace('### ', '')}
                      </h4>
                    );
                  }
                  if (line.startsWith('• ') || line.startsWith('- ')) {
                    return (
                      <div key={idx} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-emerald-500">
                        {line.replace(/^[•-]\s*/, '')}
                      </div>
                    );
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>

              {/* Retrieved Sources Accordion */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-xs">
                  <button
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Retrieved Knowledge Sources ({msg.sources.length})</span>
                    {expandedSources[msg.id] ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {expandedSources[msg.id] && (
                    <div className="mt-2 space-y-2 animate-fade-in">
                      {msg.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-600 text-xs"
                        >
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-teal-600" />
                            {s.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Doc ID: {s.document_id}
                          </div>
                          {s.snippet && (
                            <p className="mt-1 text-[11px] text-slate-500 italic bg-white p-2 rounded border border-slate-100">
                              "{s.snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`text-[10px] mt-2 text-right ${
                  msg.role === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3.5 items-center">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs text-slate-500 font-medium">
                Searching knowledge base and formulating response...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="shrink-0 mb-3 overflow-x-auto py-1">
        <div className="flex items-center gap-2 text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-slate-400 text-[11px] shrink-0 font-medium">Suggested:</span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200/80 text-slate-600 text-xs shrink-0 transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 relative flex items-center"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask any nutrition, macro, or Indian food question..."
          disabled={loading}
          className="w-full pl-5 pr-14 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="absolute right-2 p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
