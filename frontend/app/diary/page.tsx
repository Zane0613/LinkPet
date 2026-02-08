"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

interface Diary {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

export default function DiaryPage() {
  const router = useRouter();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [petId, setPetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pet/my/all").then(res => {
      if (res.data && res.data.length > 0) {
        setPetId(res.data[0].id);
        fetchDiaries(res.data[0].id);
      } else {
        router.push("/hatch");
      }
    });
  }, [router]);

  const fetchDiaries = async (pid: number) => {
    try {
      const res = await api.get(`/trip/diaries?pet_id=${pid}`);
      setDiaries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF8E7] flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse">加载回忆中...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-8">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
        <Link 
            href="/home" 
            className="px-6 py-3 bg-white border-2 border-black rounded-xl font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all"
        >
          ← 返回首页
        </Link>
        <h1 className="text-4xl font-black text-black transform -rotate-2 bg-[#FFB347] px-6 py-2 border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            旅行日记
        </h1>
        <div className="w-[120px]"></div> {/* Spacer for centering */}
      </header>

      <div className="grid gap-8 max-w-4xl mx-auto">
        {diaries.length === 0 ? (
            <div className="text-center py-20 bg-white border-2 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-2xl font-bold mb-4">还没有旅行记录哦！</p>
                <p className="text-lg text-gray-600">你的宠物还没出去探险过呢。</p>
                <p className="text-sm text-gray-500 mt-2">等它去探索世界吧！</p>
            </div>
        ) : (
            diaries.map((diary, index) => (
              <article 
                key={diary.id} 
                className={`bg-white p-6 rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform hover:-translate-y-1 transition-all duration-300 ${index % 2 === 0 ? 'rotate-1' : '-rotate-1'}`}
              >
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Image Section */}
                    <div className="w-full md:w-1/2 flex-shrink-0">
                        <div className="relative aspect-video w-full border-2 border-black rounded-xl overflow-hidden bg-gray-100">
                            {diary.image_url ? (
                                <img 
                                    src={diary.image_url} 
                                    alt={diary.title} 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 font-bold border-2 border-dashed border-gray-400 m-2 rounded-lg w-[calc(100%-16px)] h-[calc(100%-16px)]">
                                    暂无照片
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="flex flex-col flex-grow">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-black text-black">{diary.title}</h2>
                            <span className="px-3 py-1 bg-[#FFB347] border-2 border-black rounded-full text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                {new Date(diary.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        <div className="flex-grow">
                            <p className="text-lg font-medium text-gray-800 leading-relaxed font-serif">
                                "{diary.content}"
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 flex justify-end">
                             <span className="text-sm font-bold text-gray-400">LinkPet 拍摄</span>
                        </div>
                    </div>
                </div>
              </article>
            ))
        )}
      </div>
    </div>
  );
}
