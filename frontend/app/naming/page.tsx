"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion } from "framer-motion";

const PET_DETAILS: Record<string, { welcome: string; image: string }> = {
  quokka: {
    welcome: "我是快乐的矮袋鼠，很高兴见到你",
    image: "/images/pets/quokka.png",
  },
  red_panda: {
    welcome: "我是热心的小熊猫，我会一直在你身边",
    image: "/images/pets/red_panda.png",
  },
  squirrel: {
    welcome: "我是充满活力的松鼠，我们一起去玩吧",
    image: "/images/pets/squirrel.png",
  },
  white_rabbit: {
    welcome: "我是温柔的小白兔，我会静静地陪伴你",
    image: "/images/pets/white_rabbit.png",
  },
  hedgehog: {
    welcome: "我是睿智的刺猬，有什么心事都可以告诉我",
    image: "/images/pets/hedgehog.png",
  },
  hamster: {
    welcome: "我是勇敢的仓鼠，让我们开始冒险吧",
    image: "/images/pets/hamster.png",
  },
  black_cat: {
    welcome: "我是冷静的黑猫，我不爱说话，但我懂你",
    image: "/images/pets/black_cat.png",
  },
  // Fallback
  unknown: {
    welcome: "你好呀",
    image: "/images/pets/egg.png", // Fallback
  }
};

export default function NamingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pet, setPet] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [petName, setPetName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showContent, setShowContent] = useState(false); // Controls background/pet fade in
  const [showDialog, setShowDialog] = useState(false);   // Controls dialog fade in
  const [isExiting, setIsExiting] = useState(false);     // Controls exit animation

  useEffect(() => {
    const init = async () => {
      try {
        const [userRes, petRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/pet/my/all")
        ]);

        setUser(userRes.data);
        if (petRes.data && petRes.data.length > 0) {
          setPet(petRes.data[0]);
          
          // Start animation sequence after data is loaded
          setTimeout(() => setShowContent(true), 500); 
          setTimeout(() => setShowDialog(true), 2500); // 2s after content starts showing
        } else {
            // No pet?
            router.push("/claim");
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim()) return;
    
    setSubmitting(true);
    try {
      await api.post("/pet/name", { name: petName });
      
      // Start exit animation
      setIsExiting(true);
      
      // Wait for animation then push
      setTimeout(() => {
        router.push("/home");
      }, 1500);
      
    } catch (error) {
      console.error("Failed to set pet name:", error);
      alert("起名失败，请重试");
      setSubmitting(false);
    } 
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#FFF8E7]">加载中...</div>;

  if (!pet || !user) return <div className="flex min-h-screen items-center justify-center bg-[#FFF8E7]">数据加载失败</div>;

  const templateId = pet.template_id || "unknown";
  const details = PET_DETAILS[templateId] || PET_DETAILS["unknown"];
  const ownerName = user.nickname || "主人";

  return (
    <>
      {/* Full screen white overlay for transition in */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: showContent ? 0 : 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
        className="fixed inset-0 bg-white z-50 pointer-events-none"
      />

      <main 
        className="flex min-h-screen flex-col items-center justify-center p-8 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: 'url(/images/backgrounds/home-bg.png)' }}
      >
        <motion.div 
            className="w-full max-w-md space-y-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: isExiting ? 0 : (showContent ? 1 : 0) }}
            transition={{ duration: isExiting ? 1 : 2, ease: "easeInOut" }}
        >
            {/* Welcome Bubble & Input Form - Show later */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isExiting ? 0 : (showDialog ? 1 : 0), y: (isExiting || !showDialog) ? 20 : 0 }}
                transition={{ duration: 0.8 }}
                className="space-y-8"
            >
                {/* Welcome Bubble */}
                <div className="bg-white border-4 border-black rounded-3xl p-6 relative shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <p className="text-xl font-black text-center leading-relaxed">
                    {ownerName}，{details.welcome}，给我取个名字吧！
                    </p>
                </div>

                {/* Pet Image - Actually belongs to the main fade in group, but visual hierarchy implies it appears with bg or slightly after. 
                   User requirement: "背景和宠物形象淡入" (Background and Pet fade in). 
                   So Pet Image should be outside this delayed Dialog motion div?
                   Let's move Pet Image OUTSIDE this container and into the parent container which fades in with background.
                */}
            </motion.div>

            {/* Pet Image - Moved here to fade in with background */}
            <div className="flex justify-center -mt-4 mb-4">
               <img 
                  src={details.image} 
                  alt="Pet" 
                  className="w-48 h-48 object-contain drop-shadow-xl"
               />
            </div>

            {/* Form - Grouped with Dialog */}
            <motion.form 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: isExiting ? 0 : (showDialog ? 1 : 0), y: (isExiting || !showDialog) ? 20 : 0 }}
                transition={{ duration: 0.8, delay: isExiting ? 0 : 0.2 }}
                onSubmit={handleSubmit} 
                className="flex gap-4"
            >
              <input
                type="text"
                required
                value={petName}
                onChange={(e) => setPetName(e.target.value)}
                placeholder="输入名字..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-y-[2px] transition-all outline-none text-lg font-bold"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-[#FFB347] text-black border-2 border-black rounded-xl font-black text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-[4px] transition-all disabled:opacity-50"
              >
                {submitting ? "..." : "确定"}
              </button>
            </motion.form>
        </motion.div>
      </main>
    </>
  );
}
