"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function NicknamePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const userId = localStorage.getItem("linkpet_user_id");
    if (!userId) {
      router.push("/auth/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setLoading(true);
    try {
      await api.post("/pet/nickname", { nickname });
      router.push("/hatch");
    } catch (error) {
      console.error("Failed to set nickname:", error);
      alert("设置称呼失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#FFF8E7]">
      <div className="w-full max-w-md bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <h1 className="text-2xl font-black text-black mb-6 text-center">希望能被怎么称呼？</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-black mb-2 ml-1">
              希望宠物称呼我为
            </label>
            <input
              type="text"
              required
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[2px] transition-all outline-none bg-[#FAFAFA]"
              placeholder="例如：主人、姐姐、哥哥..."
            />
          </div>

          <button
            type="submit"
            disabled={loading || !nickname.trim()}
            className="w-full py-4 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "保存中..." : "开始孵化"}
          </button>
        </form>
      </div>
    </main>
  );
}
