"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "pet";
  content: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [petId, setPetId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Get user's pet ID
    // TODO: Store petId in context/localstorage to avoid refetching
    api.get("/pet/my/all").then(res => {
      if (res.data && res.data.length > 0) {
        setPetId(res.data[0].id);
        // Initial greeting
        setMessages([{ role: "pet", content: `你好！我是 ${res.data[0].name}。今天想聊点什么？` }]);
      } else {
        router.push("/hatch");
      }
    });
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !petId || loading) return;

    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await api.post("/chat/send", {
        pet_id: petId,
        message: userMsg
      });
      
      setMessages(prev => [...prev, { role: "pet", content: res.data.reply }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: "pet", content: "..." }]); // Error state
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex flex-col">
      <header className="bg-white p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] border-b-2 border-black flex items-center gap-4 sticky top-0 z-10">
        <Link href="/home" className="text-2xl font-black text-black hover:scale-110 transition-transform">←</Link>
        <h1 className="font-black text-xl text-black">与宠物聊天</h1>
      </header>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm md:text-base font-medium ${
                msg.role === "user"
                  ? "bg-[#FFB347] text-black rounded-tr-none"
                  : "bg-white text-black rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white border-2 border-black p-3 rounded-2xl rounded-tl-none text-gray-400 text-sm animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
               思考中...
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t-2 border-black flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="输入消息..."
          disabled={loading}
          className="flex-1 p-3 border-2 border-black rounded-xl px-4 focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow bg-[#FFF8E7] text-black placeholder-gray-500 font-medium"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-[#FFB347] border-2 border-black text-black p-3 rounded-xl w-12 h-12 flex items-center justify-center hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[0px] active:shadow-none disabled:opacity-50 transition-all font-black"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
