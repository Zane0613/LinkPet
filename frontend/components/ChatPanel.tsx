"use client";

import { useState, useEffect, useRef } from "react";
import api, { getBaseURL } from "@/lib/api";

interface Message {
  role: "user" | "pet";
  content: string;
  reasoning?: string;
}

interface ChatPanelProps {
  petId: number | null;
  petName: string;
  onClose: () => void;
  hideHeader?: boolean;
}

export default function ChatPanel({ petId, petName, onClose, hideHeader }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (petName) {
      setMessages([{ role: "pet", content: `你好！我是 ${petName}。今天想聊点什么？` }]);
    }
  }, [petName]);

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
      setMessages(prev => [...prev, { role: "pet", content: "", reasoning: "" }]);

      const baseURL = getBaseURL();
      const headers: HeadersInit = { "Content-Type": "application/json" };

      if (typeof window !== "undefined") {
        const userId = localStorage.getItem("linkpet_user_id");
        if (userId) headers["X-User-ID"] = userId;
      }

      const response = await fetch(`${baseURL}/chat/send`, {
        method: "POST",
        headers,
        body: JSON.stringify({ pet_id: petId, message: userMsg }),
      });

      if (!response.ok || !response.body) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullContent = "";
      let fullReasoning = "";
      let buffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("data:")) {
            const dataStr = trimmedLine.replace(/^data:\s*/, "");
            if (dataStr === "[DONE]") { done = true; break; }
            try {
              const data = JSON.parse(dataStr);
              if (data.error) throw new Error(data.error);

              let updated = false;
              if (data.reasoning) { fullReasoning += data.reasoning; updated = true; }
              if (data.content) { fullContent += data.content; updated = true; }

              if (updated) {
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  if (lastIdx >= 0 && newMessages[lastIdx].role === "pet") {
                    newMessages[lastIdx] = { ...newMessages[lastIdx], content: fullContent, reasoning: fullReasoning };
                    return newMessages;
                  }
                  return prev;
                });
              }
            } catch (e) {
              console.error("Error parsing JSON chunk", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastIdx = newMessages.length - 1;
        if (lastIdx >= 0 && newMessages[lastIdx].role === "pet" && newMessages[lastIdx].content === "") {
          newMessages[lastIdx] = {
            ...newMessages[lastIdx],
            content: "喵... (网络好像出问题了: " + (error instanceof Error ? error.message : String(error)) + ")",
          };
          return newMessages;
        }
        return prev;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FFF8E7]">
      {!hideHeader && (
        <header className="bg-white p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] border-b-2 border-black flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="text-2xl font-black text-black hover:scale-110 transition-transform"
          >
            ✕
          </button>
          <h1 className="font-black text-lg text-black">与{petName}聊天</h1>
        </header>
      )}

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] p-3 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-sm font-medium min-h-[40px] ${
                msg.role === "user"
                  ? "bg-[#FFB347] text-black rounded-tr-none"
                  : "bg-white text-black rounded-tl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && messages.length > 0 && messages[messages.length - 1].role !== "pet" && (
          <div className="flex justify-start">
            <div className="bg-white border-2 border-black p-3 rounded-2xl rounded-tl-none text-gray-400 text-sm animate-pulse shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              思考中...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t-2 border-black flex gap-2 shrink-0 rounded-b-2xl">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="输入消息..."
          disabled={loading}
          className="flex-1 p-3 border-2 border-black rounded-xl px-4 focus:outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-shadow bg-[#FFF8E7] text-black placeholder-gray-500 font-medium text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-[#FFB347] border-2 border-black text-black p-3 rounded-xl w-11 h-11 flex items-center justify-center hover:translate-y-[-2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[0px] active:shadow-none disabled:opacity-50 transition-all font-black"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
