"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useParams } from "next/navigation";

interface Message {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
}

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = params.chatId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    // Get current user ID from local storage or API
    const storedId = localStorage.getItem("linkpet_user_id");
    if (storedId) setCurrentUserId(parseInt(storedId));

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll for new messages
    return () => clearInterval(interval);
  }, [chatId]);

  const fetchMessages = () => {
    api.get(`/social/chats/${chatId}/messages`)
      .then(res => {
        setMessages(res.data);
        setLoading(false);
      })
      .catch(err => console.error(err));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    try {
      await api.post(`/social/chats/${chatId}/messages`, { content: input });
      setInput("");
      fetchMessages();
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex flex-col">
      <header className="bg-white p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] border-b-2 border-black flex items-center gap-4 sticky top-0 z-10">
        <Link href="/social" className="text-2xl font-black text-black hover:scale-110 transition-transform">←</Link>
        <h1 className="font-black text-xl text-black">聊天</h1>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm md:text-base font-medium min-h-[40px] ${
                  isMe
                    ? "bg-[#FFB347] text-black rounded-tr-none"
                    : "bg-white text-black rounded-tl-none"
                }`}
              >
                {!isMe && <div className="text-xs text-gray-500 mb-1">{msg.sender_name}</div>}
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t-2 border-black sticky bottom-0 shadow-[0px_-4px_0px_0px_rgba(0,0,0,0.1)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="输入消息..."
            className="flex-1 border-2 border-black rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFB347] bg-[#FFF8E7]"
          />
          <button
            onClick={sendMessage}
            className="bg-black text-white px-6 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[2px]"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
