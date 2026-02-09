"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import HandDrawnModal from "@/components/HandDrawnModal";
import { motion } from "framer-motion";

interface Pet {
  id: number;
  name: string;
  status: string;
  hatch_progress_seconds: number;
  heat_buffer_seconds: number;
  hatch_answers: any[];
  frozen_since?: number;
}

const QUESTIONS = [
  { q: "你会把蛋放在哪里孵化？", options: ["舒适的床边小窝", "阳光充足的落地窗边", "通风的阳台或门口"] },
  { q: "你每天如何与蛋互动？", options: ["轻声讲故事或哼唱", "播放电子音乐", "给它看外面的风景"] },
  { q: "选一个礼物放在蛋旁边：", options: ["柔软的棉球", "微型厨具", "闪亮的机械零件", "一袋多彩的坚果"] },
  { q: "为最后阶段选择一种环境音：", options: ["森林里的雨声", "熙熙攘攘的街道", "电子嗡嗡声"] },
  { q: "你希望它有什么特长？", options: ["跑得非常快", "超级聪明", "运气特别好"] },
  { q: "你会带它去哪里玩？", options: ["热闹的游乐园", "安静的图书馆", "神秘的森林"] },
];

const TARGET_HATCH_SECONDS = 90; // 90 seconds total
const MAX_QUESTIONS = 6;

export default function HatchPage() {
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQuestion, setShowQuestion] = useState(false);
  const [answering, setAnswering] = useState(false);

  // Derived state for local countdown
  const [localHatchProgress, setLocalHatchProgress] = useState(0);
  const [localHeatBuffer, setLocalHeatBuffer] = useState(0);
  const [hasAnsweredThisSession, setHasAnsweredThisSession] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false); // Add transition state
  const [showUI, setShowUI] = useState(false); // Controls UI fade in after background

  useEffect(() => {
    // Start UI fade in after background animation
    const timer = setTimeout(() => {
      setShowUI(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if user has already answered in this session
    const answered = sessionStorage.getItem('hatch_answered_this_session');
    if (answered === 'true') {
      setHasAnsweredThisSession(true);
    }
  }, []);

  const fetchPet = async () => {
    try {
      const res = await api.get("/pet/my/all");
      const pets = res.data;
      if (Array.isArray(pets) && pets.length > 0) {
        const currentPet = pets[0];
        setPet(currentPet);
        setLocalHatchProgress(currentPet.hatch_progress_seconds);
        setLocalHeatBuffer(currentPet.heat_buffer_seconds);
      } else {
        // No pet found, redirect to claim
        router.push("/claim");
      }
    } catch (error) {
      console.error("Failed to fetch pet:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();
    const interval = setInterval(fetchPet, 10000); // Sync every 10s
    return () => clearInterval(interval);
  }, []);

  // Local timer for smooth countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (localHeatBuffer > 0 && localHatchProgress < TARGET_HATCH_SECONDS) {
        setLocalHeatBuffer((prev) => Math.max(0, prev - 1));
        setLocalHatchProgress((prev) => Math.min(TARGET_HATCH_SECONDS, prev + 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [localHeatBuffer, localHatchProgress]);

  // Status checks
  const isFrozen = pet?.status === "egg_frozen";
  const isDead = pet?.status === "egg_dead";
  const isHatched = pet?.status === "egg_hatched" || pet?.status === "sleeping" || pet?.status === "eating" || pet?.status === "traveling";
  const isHeating = localHeatBuffer > 0;
  
  // Logic to handle death
  useEffect(() => {
    if (isDead) {
      // Show death modal or UI
    }
  }, [isDead]);

  // Logic to handle hatch success
  useEffect(() => {
    if (isHatched && !isTransitioning) {
       setIsTransitioning(true);
    }
  }, [isHatched, isTransitioning]);

  // Handle transition completion
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        router.push("/naming");
      }, 6500); // Wait for animation to finish
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, router]);

  const handleAnswer = async (optionIndex: number) => {
    if (!pet) return;
    setAnswering(true);
    try {
      const questionIndex = pet.hatch_answers.length;
      await api.post("/pet/heat", {
        question_index: questionIndex,
        answer_index: optionIndex
      });
      
      // Mark as answered for this session
      // sessionStorage.setItem('hatch_answered_this_session', 'true');
      // setHasAnsweredThisSession(true);

      setShowQuestion(false);
      fetchPet(); // Refresh immediately
    } catch (error) {
      console.error("Answer failed:", error);
      alert("提交失败");
    } finally {
      setAnswering(false);
    }
  };

  const handleRestart = () => {
    router.push("/claim");
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FFF8E7]">加载中...</div>;

  if (isDead) {
    return (
      <main 
        className="flex min-h-screen flex-col items-center justify-center p-8 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/backgrounds/hatch-bg.png)' }}
      >
        <div className="text-center p-8 bg-white/90 rounded-3xl border-4 border-black shadow-lg backdrop-blur-sm">
          <h1 className="text-4xl mb-4">💀</h1>
          <h2 className="text-2xl font-bold mb-4">孵化失败</h2>
          <p className="mb-8">蛋因为长时间没有加热冻死了...</p>
          <button 
            onClick={handleRestart}
            className="px-8 py-3 bg-red-400 border-2 border-black rounded-xl font-bold hover:bg-red-500 transition-colors"
          >
            重新领取
          </button>
        </div>
      </main>
    );
  }

  const remainingTime = Math.max(0, TARGET_HATCH_SECONDS - localHatchProgress);
  const questionsAnswered = pet?.hatch_answers.length || 0;
  const currentQuestion = QUESTIONS[questionsAnswered];

  return (
    <motion.main 
      className="relative min-h-screen flex flex-col justify-between p-4 bg-cover bg-center bg-no-repeat overflow-hidden"
      style={{ backgroundImage: 'url(/images/backgrounds/hatch-bg.png)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Top: Progress & Status */}
      <motion.div 
        className="w-full max-w-md mx-auto pt-0 z-10 space-y-2"
        initial={{ opacity: 0, y: -20 }}
        animate={{ 
          opacity: (showUI && !isTransitioning) ? 1 : 0,
          y: (showUI && !isTransitioning) ? 0 : -20
        }}
        transition={{ duration: 1 }}
      >
          <div className="text-center mb-2">
              <h1 className="text-2xl font-black text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,0.8)] transform -rotate-2">
                {isFrozen ? "🥶 蛋冻僵了！" : isHeating ? "🔥 正在加热..." : "❄️ 等待加热"}
              </h1>
          </div>
          
          <div className="bg-white/90 p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
             <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">孵化进度</span>
                <span className="font-mono font-black text-orange-500">
                  {Math.floor((localHatchProgress / TARGET_HATCH_SECONDS) * 100)}%
                </span>
             </div>
             <div className="w-full bg-gray-200 h-4 rounded-full border-2 border-black overflow-hidden">
                <div 
                  className="bg-orange-400 h-full transition-all duration-1000"
                  style={{ width: `${(localHatchProgress / TARGET_HATCH_SECONDS) * 100}%` }}
                />
             </div>
          </div>

          <div className="bg-white/90 p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex justify-between items-center">
             <div>
                 <p className="font-bold text-sm">剩余热量</p>
                 <p className="text-xs text-gray-500">保持加热才能孵化哦</p>
             </div>
             <span className={`font-mono text-2xl font-black ${localHeatBuffer > 0 ? "text-red-500 animate-pulse" : "text-gray-400"}`}>
               {formatTime(localHeatBuffer)}
             </span>
          </div>
      </motion.div>

      {/* Center: Interactive Egg */}
      <div className="flex-grow flex items-end justify-center z-0 pb-28">
          <motion.div
              whileTap={{ 
                  rotate: [0, -2, 2, -2, 2, 0],
                  scale: 0.98,
                  transition: { duration: 0.3 }
              }}
              animate={
                isTransitioning 
                ? {
                    x: [-2, 2, -2, 2],
                    rotate: [-1, 1, -1, 1],
                    filter: ["brightness(1)", "brightness(2)", "brightness(5)"],
                    transition: { 
                      x: { repeat: Infinity, duration: 1.0, repeatType: "mirror" },
                      rotate: { repeat: Infinity, duration: 1.0, repeatType: "mirror" },
                      filter: { duration: 6, ease: "easeIn" }
                    }
                  }
                : isHeating ? { 
                  // y: [0, -3, 0], // Removed breathing movement
                  filter: [
                    "brightness(1) sepia(0) saturate(1)",
                    "brightness(1.1) sepia(0.3) saturate(1.2)",
                    "brightness(1) sepia(0) saturate(1)"
                  ],
                  transition: { 
                      // y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                      filter: { repeat: Infinity, duration: 1.5, ease: "easeInOut", repeatType: "reverse" }
                  }
              } : {}}
              className="cursor-pointer relative"
          >
              <img 
                  src={isFrozen ? "/images/ui/egg-cold.png" : isHeating ? "/images/ui/egg-warm.png" : "/images/ui/egg.png"} 
                  alt="Pet Egg" 
                  className="w-48 h-auto md:w-60 drop-shadow-2xl"
                  draggable={false}
              />
          </motion.div>
      </div>

      {/* Bottom: Controls */}
      <motion.div 
        className="w-full max-w-md mx-auto pb-8 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: (showUI && !isTransitioning) ? 1 : 0,
          y: (showUI && !isTransitioning) ? 0 : 20
        }}
        transition={{ duration: 1 }}
      >
          {questionsAnswered < MAX_QUESTIONS ? (
              hasAnsweredThisSession ? (
                <div className="text-center bg-white/80 p-4 rounded-xl border-2 border-black">
                  <p className="font-bold text-gray-800">本次上线已回答过问题</p>
                  <p className="text-sm text-gray-600 mt-1">请稍后回来再试！</p>
                </div>
              ) : (
                <button
                    onClick={() => setShowQuestion(true)}
                    className="w-full py-4 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all"
                >
                    回答问题 (+15秒孵化时间)
                </button>
              )
          ) : (
              <div className="text-center text-gray-500 font-bold bg-white/50 p-4 rounded-xl">
                  已完成所有问答，等待孵化...
              </div>
          )}
      </motion.div>

      {/* Full screen white overlay for transition */}
      {isTransitioning && (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2, ease: "easeIn" }}
            className="fixed inset-0 bg-white z-50 pointer-events-none"
        />
      )}

      {/* Question Modal */}
      {showQuestion && currentQuestion && (
        <HandDrawnModal
          isOpen={showQuestion}
          onClose={() => setShowQuestion(false)}
          title={`问题 ${questionsAnswered + 1}/${MAX_QUESTIONS}`}
        >
          <div className="space-y-4">
            <p className="text-lg font-bold mb-4">{currentQuestion.q}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answering}
                  className="w-full p-3 text-left border-2 border-black rounded-xl hover:bg-orange-100 transition-colors font-medium"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </HandDrawnModal>
      )}
    </motion.main>
  );
}
