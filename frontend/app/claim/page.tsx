"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function ClaimPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem("linkpet_user_id");
    if (!userId) {
      router.push("/auth/login");
    }
  }, [router]);

  const handleClaim = async () => {
    setLoading(true);
    try {
      await api.post("/pet/claim", {});
      router.push("/nickname");
    } catch (error) {
      console.error("Failed to claim egg:", error);
      alert("领取失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#FFF8E7]">
      <div className="w-full max-w-md bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 text-center">
        <h1 className="text-3xl font-black text-black mb-4">欢迎来到 LinkPet</h1>
        <p className="text-gray-600 font-medium mb-8">准备好开始你的旅程了吗？</p>
        
        <div className="mb-8 flex justify-center">
           <img 
              src="/images/ui/egg.png" 
              alt="Pet Egg" 
              className="w-48 h-auto object-contain drop-shadow-xl"
              draggable={false}
           />
        </div>

        <button
          onClick={handleClaim}
          disabled={loading}
          className="w-full py-4 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "领取中..." : "领取我的宠物蛋"}
        </button>
      </div>
    </main>
  );
}
