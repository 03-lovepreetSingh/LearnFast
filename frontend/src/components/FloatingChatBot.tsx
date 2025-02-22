// components/BookChatBot.tsx
"use client";
import { useState, useRef, useEffect } from "react";
import { BookOpen, X, Send, Bookmark, Loader2 } from "lucide-react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  isTyping?: boolean;
}

export default function BookChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const simulateTypingResponse = async (response: string) => {
    const typingMessage: Message = {
      id: Date.now(),
      text: "",
      isUser: false,
      isTyping: true
    };

    setMessages(prev => [...prev, typingMessage]);
    
    for (let i = 0; i < response.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last.isTyping) {
          return [
            ...prev.slice(0, -1),
            { ...last, text: response.slice(0, i + 1), isTyping: false }
          ];
        }
        return prev;
      });
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: userMessage, isUser: true }
    ]);
    setInputMessage("");

    setIsLoading(true);
    setTimeout(async () => {
      await simulateTypingResponse(`Interesting point about "${userMessage}". Let me check my virtual books...`);
      setIsLoading(false);
    }, 500);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 bg-amber-700 text-white rounded-full shadow-xl hover:bg-amber-800 transition-all
          transform hover:scale-105 hover:rotate-12 duration-300`}
        style={{
          boxShadow: "0 10px 30px rgba(146, 64, 14, 0.3)"
        }}
      >
        {isOpen ? (
          <X size={24} className="animate-pulse" />
        ) : (
          <BookOpen size={24} className="animate-bounce" />
        )}
      </button>

      {isOpen && (
        <div
          className={`mt-4 w-96 h-[600px] bg-amber-50 rounded-lg shadow-2xl flex flex-col
            perspective-1000`}
          style={{
            transform: "rotateX(5deg) rotateY(2deg)",
            boxShadow: `
              0 25px 50px -12px rgba(0, 0, 0, 0.25),
              10px 10px 20px rgba(146, 64, 14, 0.3)
            `
          }}
        >
          <div className="absolute inset-0 border-4 border-amber-800 rounded-lg pointer-events-none" />
          
          <div className="p-4 bg-amber-800 text-white rounded-t-lg flex items-center gap-3">
            <Bookmark className="text-amber-200" />
            <h3 className="font-serif text-lg font-semibold">Virtual Librarian</h3>
          </div>

          <div className="absolute top-12 right-2 w-4 h-[calc(100%-6rem)] bg-amber-200/30 transform -skew-y-12" />

          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 relative ${
                    message.isUser 
                      ? "bg-amber-700 text-white shadow-md" 
                      : "bg-white text-black shadow-md"
                  }`}
                >
                  {message.isTyping ? (
                    <div className="flex items-center gap-2 text-black">
                      <span className="flex gap-1">
                        <span className="animate-typing">.</span>
                        <span className="animate-typing delay-100">.</span>
                        <span className="animate-typing delay-200">.</span>
                      </span>
                    </div>
                  ) : (
                    <p className="font-serif text-sm leading-relaxed">
                      {message.text}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-lg shadow-md">
                  <Loader2 className="animate-spin h-5 w-5 text-amber-700" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form 
            onSubmit={handleSendMessage}
            className="p-4 border-t border-amber-200 bg-amber-100 rounded-b-lg"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about books..."
                className={`flex-1 rounded-lg px-4 py-2 text-sm bg-white text-black
                  focus:outline-none focus:ring-2 focus:ring-amber-700 font-serif
                  placeholder-amber-600/50`}
                disabled={isLoading}
              />
              <button
                type="submit"
                className={`p-2 bg-amber-700 text-white rounded-lg hover:bg-amber-800 
                  disabled:opacity-50 transition-colors`}
                disabled={isLoading}
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}