"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/register", { 
        email, 
        password,
        full_name: name 
      });
      localStorage.setItem("linkpet_user_id", res.data.id);
      router.push("/claim");
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || "注册失败，请检查网络或重试。";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-[#FFF8E7]">
      <div className="w-full max-w-md bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-black mb-2 transform -rotate-2">创建账号</h1>
          <p className="text-gray-600 font-medium">开启你与LinkPet的旅程</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-black mb-2 ml-1">
              昵称
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[2px] transition-all outline-none bg-[#FAFAFA]"
              placeholder="你的名字"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2 ml-1">
              邮箱
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[2px] transition-all outline-none bg-[#FAFAFA]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2 ml-1">
              密码
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[2px] transition-all outline-none bg-[#FAFAFA]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "创建中..." : "注册"}
          </button>
        </form>

        <div className="mt-8 text-center text-sm font-bold text-gray-600">
          已有账号？{" "}
          <Link href="/auth/login" className="text-[#FFB347] hover:text-orange-600 hover:underline decoration-2 underline-offset-2">
            去登录
          </Link>
        </div>
      </div>
    </main>
  );
}
