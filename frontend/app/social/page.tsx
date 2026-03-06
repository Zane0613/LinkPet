"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface UserChat {
  id: number;
  other_user_name: string;
  other_user_email: string;
  created_at: string;
}

export default function SocialPage() {
  const [chats, setChats] = useState<UserChat[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get("/social/chats")
      .then(res => {
        setChats(res.data);
      })
      .catch(err => {
        console.error("Failed to fetch chats", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex flex-col">
      <header className="bg-white p-4 shadow-[0px_4px_0px_0px_rgba(0,0,0,0.1)] border-b-2 border-black flex items-center gap-4 sticky top-0 z-10">
        <Link href="/home" className="text-2xl font-black text-black hover:scale-110 transition-transform">←</Link>
        <h1 className="text-xl font-black text-black">我的好友</h1>
      </header>

      <div className="flex-1 p-4 overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500 mt-10">加载中...</div>
        ) : chats.length === 0 ? (
          <div className="text-center text-gray-500 mt-20 px-4">
            <div className="text-4xl mb-4">🐾</div>
            <p className="text-xl font-bold mb-2 text-black">暂无好友</p>
            <p className="text-sm">当你的宠物与其他宠物相遇超过2次时，<br/>你们将自动成为好友！</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chats.map(chat => (
              <Link 
                href={`/social/${chat.id}`} 
                key={chat.id}
                className="block bg-white p-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFB347] border-2 border-black flex items-center justify-center font-bold text-lg">
                    {chat.other_user_name ? chat.other_user_name[0].toUpperCase() : "?"}
                  </div>
                  <div>
                    <div className="font-bold text-lg text-black">{chat.other_user_name || "未知用户"}</div>
                    <div className="text-xs text-gray-500">{chat.other_user_email}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
