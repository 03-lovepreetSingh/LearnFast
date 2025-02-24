// components/ScheduleChatBot.tsx code
"use client";
import { useState, useRef, useEffect } from "react";
import * as Icons from "lucide-react";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  isTyping?: boolean;
  isOptions?: boolean;
  options?: string[];
  isVideoList?: boolean;
  videos?: { title: string; id: string }[];
}

interface ChatBotProps {
  schedule?: {
    schedule_data: {
      videos: {
        title: string;
        link: string;
      }[];
    }[];
  };
}

export default function ScheduleChatBot({ schedule }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'video' | 'general' | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          text: "Hello! How can I help you today?",
          isUser: false,
          isOptions: true,
          options: [
            "Ask about specific video",
            "Ask general questions"
          ]
        }
      ]);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleOptionSelect = async (option: string) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: option,
      isUser: true
    }]);

    if (option === "Ask about specific video") {
      setChatMode('video');
      // Get all videos from schedule
      const allVideos = schedule?.schedule_data.flatMap(day => 
        day.videos.map(video => ({
          title: video.title,
          id: video.link
        }))
      ) || [];

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "Please select a video to ask questions about:",
        isUser: false,
        isVideoList: true,
        videos: allVideos
      }]);
    } else {
      setChatMode('general');
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "You can ask me any general question. How can I help?",
        isUser: false
      }]);
    }
  };

  const handleVideoSelect = async (videoTitle: string) => {
    setSelectedVideo(videoTitle);
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        text: `Selected: ${videoTitle}`,
        isUser: true
      },
      {
        id: Date.now() + 1,
        text: `I'll answer questions specifically about "${videoTitle}". What would you like to know?`,
        isUser: false
      }
    ]);
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
    try {
      const response = await fetch('https://python-backend-9i5a.onrender.com/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: userMessage,
          videoTitle: selectedVideo,
          mode: chatMode
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      await simulateTypingResponse(data.response);
    } catch (error) {
      await simulateTypingResponse("I apologize, but I'm having trouble connecting to the server. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 bg-indigo-600 text-white rounded-full shadow-xl 
          hover:bg-indigo-700 transition-all transform hover:scale-105 duration-300`}
      >
        {isOpen ? (
          <Icons.X size={24} />
        ) : (
          <Icons.MessageSquare size={24} />
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 h-[600px] bg-gray-900 
          rounded-lg shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 bg-indigo-600 text-white flex items-center gap-3">
            <Icons.Bot className="text-white" />
            <h3 className="font-semibold">AI Assistant</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.isOptions ? (
                  <div className="space-y-2">
                    <p className="text-white mb-3">{message.text}</p>
                    {message.options?.map((option) => (
                      <button
                        key={option}
                        onClick={() => handleOptionSelect(option)}
                        className="w-full p-3 bg-indigo-600 text-white rounded-lg
                          hover:bg-indigo-700 transition-colors text-left"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : message.isVideoList ? (
                  <div className="space-y-2">
                    <p className="text-white mb-3">{message.text}</p>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {message.videos?.map((video) => (
                        <button
                          key={video.id}
                          onClick={() => handleVideoSelect(video.title)}
                          className="w-full p-3 bg-gray-800 text-white rounded-lg
                            hover:bg-gray-700 transition-colors text-left"
                        >
                          {video.title}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg p-3 ${
                      message.isUser 
                        ? "bg-indigo-600 text-white" 
                        : "bg-gray-800 text-white"
                    }`}>
                      {message.isTyping ? (
                        <div className="flex items-center gap-2">
                          <Icons.Loader2 className="animate-spin" size={16} />
                        </div>
                      ) : (
                        <p className="text-sm">{message.text}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form 
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-800 bg-gray-900"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 rounded-lg px-4 py-2 text-sm bg-gray-800 text-white
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 border-none"
                disabled={isLoading || (!chatMode)}
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 
                  disabled:opacity-50 transition-colors"
                disabled={isLoading || (!chatMode)}
              >
                <Icons.Send size={18} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}