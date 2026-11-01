import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Lightbulb,
  Copy,
  Check,
  RotateCcw,
  ArrowDown,
  CheckCircle2,
  Database
} from 'lucide-react';
import { api } from '../services/api';
import { ChatMessage } from '../types';
import { MarkdownContent } from '../components/chat/MarkdownContent';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      'Hello! I am **NutriAI**, your AI Indian Food & Clinical Nutrition Assistant.\n\n' +
      'I am powered by **Retrieval-Augmented Generation (RAG)** on 20 verified clinical nutrition documents and integrated with the **Anuvaad Indian Food Composition Database** (1,014 laboratory-analyzed foods).\n\n' +
      '### What I can help you with:\n' +
      '- **Macro & Micronutrient Analysis**: Inquire about protein, dietary fiber, iron, zinc, or vitamins in traditional Indian dishes.\n' +
      '- **Clinical Nutrition Guidance**: Understand dietary strategies for hypertension (DASH), Type-2 diabetes (low GI), cardiovascular health, and renal nutrition.\n' +
      '- **Traditional Food Science**: Learn how fermentation, germination, and soaking enhance bioavailability in foods like *idli*, *dosa*, and *sprouts*.\n' +
      '- **Meal Logging**: Describe your meals (e.g., *"2 rotis with dal tadka and cucumber salad"*) for nutritional breakdown.\n\n' +
      'How can I help you optimize your nutrition today?',
    sources: [
      { document_id: 'macronutrients_001', title: 'Macronutrients in Human Nutrition' },
      { document_id: 'indian_food_habits_001', title: 'Traditional and Contemporary Indian Dietary Habits' }
    ],
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
];

export const NutritionChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelProvider, setModelProvider] = useState<'lora' | 'groq'>('lora');
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottom(isUp);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleClearChat = () => {
    if (messages.length > 1) {
      setMessages([
        {
          ...INITIAL_MESSAGES[0],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setExpandedSources({});
    }
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
          'I encountered a communication issue while contacting the backend service.\n\n' +
          'Please ensure the FastAPI backend is running on `http://localhost:8000` with the `/api/chat` route active.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      // Refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestedQuestions = [
    { label: 'Vegetarian Protein', query: 'What are the best vegetarian protein sources in an Indian diet?' },
    { label: 'Dal Tadka Macros', query: 'What is the nutrition composition of 150g dal tadka?' },
    { label: 'Bioavailability', query: 'How does South Indian fermentation improve idli and dosa bioavailability?' },
    { label: 'Energy Macronutrients', query: 'What are the primary energy macronutrients and their caloric densities?' },
    { label: 'Meal Breakdown', query: 'I had 2 rotis with dal tadka for lunch' }
  ];

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto h-[calc(100vh-4rem)] flex flex-col animate-fade-in relative">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <span>AI Nutrition Assistant</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/60 shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              RAG + LangGraph
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>Grounded in 20 clinical nutrition documents</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
            <span className="flex items-center gap-1 text-slate-600 font-medium">
              <Database className="w-3 h-3 text-emerald-600" />
              1,014 Anuvaad Indian food records
            </span>
          </p>
        </div>

        {/* Model Selector & Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Provider Toggle */}
          <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl text-xs font-semibold border border-slate-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => setModelProvider('lora')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                modelProvider === 'lora'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>LoRA PEFT (Local)</span>
            </button>
            <button
              type="button"
              onClick={() => setModelProvider('groq')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                modelProvider === 'groq'
                  ? 'bg-white text-emerald-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Groq Cloud API</span>
            </button>
          </div>

          {/* Reset / Clear Chat Button */}
          <button
            type="button"
            onClick={handleClearChat}
            title="Clear chat and restart"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200/80 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-5 pr-2 pb-4 scroll-smooth"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 sm:gap-3.5 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {/* Assistant Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                <Bot className="w-4.5 h-4.5" />
              </div>
            )}

            {/* Bubble Container */}
            <div
              className={`group relative max-w-[88%] sm:max-w-[82%] rounded-2xl p-4 shadow-xs text-sm leading-relaxed transition-all ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-xs shadow-emerald-600/10'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-slate-200/50'
              }`}
            >
              {/* Header Badges inside Assistant Bubble */}
              {msg.role === 'assistant' && (
                <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      NutriAI Assistant
                    </span>
                    {msg.intent && (
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          msg.intent.toLowerCase().includes('unrelated') || msg.intent.toLowerCase().includes('out of domain')
                            ? 'bg-amber-100 text-amber-800 border border-amber-200/70 font-bold'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {msg.intent.replace(/_/g, ' ')}
                      </span>
                    )}
                    {msg.requires_clarification && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 border border-amber-200/60">
                        <HelpCircle className="w-3 h-3" /> Clarification Needed
                      </span>
                    )}
                  </div>

                  {/* Copy Response Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    className="opacity-70 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
                    title="Copy response to clipboard"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span className="hidden sm:inline">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Parsed Markdown Body */}
              <MarkdownContent content={msg.content} isUser={msg.role === 'user'} />

              {/* Retrieved Sources Drawer */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs">
                  <button
                    type="button"
                    onClick={() => toggleSources(msg.id)}
                    className="flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Retrieved Knowledge Sources ({msg.sources.length})</span>
                    {expandedSources[msg.id] ? (
                      <ChevronUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-emerald-600" />
                    )}
                  </button>

                  {expandedSources[msg.id] && (
                    <div className="mt-2.5 space-y-2 animate-fade-in">
                      {msg.sources.map((s, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 text-slate-600 text-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>{s.title}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                            <span>Doc ID:</span>
                            <span className="bg-white px-1.5 py-0.2 rounded border border-slate-200/60 font-semibold text-slate-500">
                              {s.document_id}
                            </span>
                          </div>
                          {s.snippet && (
                            <p className="mt-1.5 text-[11px] text-slate-600 italic bg-white p-2 rounded-lg border border-slate-100 leading-relaxed">
                              "{s.snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div
                className={`text-[10px] mt-2 text-right select-none ${
                  msg.role === 'user' ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {/* User Avatar */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <User className="w-4.5 h-4.5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3.5 items-center animate-fade-in">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Bot className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="p-3.5 px-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-xs text-slate-600 font-medium">
                Searching Qdrant vector knowledge & formulating clinical guidance...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll-to-Bottom Button */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-28 right-10 p-2 rounded-full bg-white text-slate-700 shadow-md border border-slate-200 hover:bg-slate-50 hover:text-emerald-600 transition-all z-10 cursor-pointer animate-fade-in flex items-center gap-1 text-xs px-3"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>
      )}

      {/* Suggested Questions Carousel / Chips */}
      <div className="shrink-0 mb-3 overflow-x-auto py-1">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 text-amber-600 font-semibold text-xs shrink-0 pl-1">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Suggested:</span>
          </div>
          {suggestedQuestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(item.query)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full bg-white hover:bg-emerald-50/80 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 text-xs shrink-0 transition-all text-left shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="font-semibold text-emerald-600 text-[11px]">{item.label}:</span>
              <span className="truncate max-w-[200px] sm:max-w-none">{item.query}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Form with Multi-line Textarea and Enter key */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="shrink-0 relative flex items-end gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask any nutrition, macro, clinical condition, or Indian food question... (Press Enter to send)"
          disabled={loading}
          className="flex-1 max-h-32 min-h-[42px] px-3.5 py-2.5 bg-transparent border-0 text-sm focus:outline-hidden text-slate-800 placeholder-slate-400 resize-none leading-relaxed"
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all shadow-xs cursor-pointer shrink-0 disabled:cursor-not-allowed mb-0.5"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
