"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("linkpet_user_id", res.data.id);
      router.push("/home");
    } catch (error) {
      console.error(error);
      alert("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md border-4 border-black transform rotate-1">
        <h1 className="text-4xl font-black mb-8 text-center text-black transform -rotate-2">
          欢迎回来
        </h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="transform hover:-rotate-1 transition-transform">
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wider">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-black rounded-xl focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FFF8E7] font-medium"
              required
            />
          </div>
          <div className="transform hover:rotate-1 transition-transform">
            <label className="block text-sm font-black text-black mb-2 uppercase tracking-wider">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border-2 border-black rounded-xl focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all bg-[#FFF8E7] font-medium"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#FFB347] text-black py-4 rounded-xl font-black text-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-wide"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <div className="mt-8 text-center border-t-2 border-dashed border-gray-300 pt-6">
          <p className="text-black font-medium">
            还没有账号？{" "}
            <Link href="/auth/register" className="text-blue-600 font-black hover:underline decoration-2 decoration-wavy">
              去注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
