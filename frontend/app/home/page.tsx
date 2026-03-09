"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import HandDrawnModal from "@/components/HandDrawnModal";
import DiaryViewer from "@/components/DiaryViewer";
import ChatPanel from "@/components/ChatPanel";
import { AnimatePresence, motion } from "framer-motion";

interface Pet {
  id: number;
  name: string;
  template_id: string;
  personality_prompt: string;
  status?: string;
  last_read_diary_id?: number;
}

interface Diary {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}



export default function HomePage() {
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const prevStatusRef = useRef<string | undefined>(undefined);
  const [bgVersion, setBgVersion] = useState(Date.now());
  
  // New Diary State
  const [newDiaries, setNewDiaries] = useState<Diary[]>([]);
  const [showDiaryPrompt, setShowDiaryPrompt] = useState(false);
  const [showDiaryViewer, setShowDiaryViewer] = useState(false);
  
  // Chat Panel State
  const [showChat, setShowChat] = useState(false);
  
  const petRef = useRef<Pet | null>(null);
  const isViewingDiaryRef = useRef(false);
  
  // Update ref whenever pet state changes
  useEffect(() => {
    petRef.current = pet;
  }, [pet]);
  
  // Update viewing ref
  useEffect(() => {
    isViewingDiaryRef.current = showDiaryViewer || showDiaryPrompt;
  }, [showDiaryViewer, showDiaryPrompt]);

  // Polling for autonomous updates
  useEffect(() => {
    fetchPetAndCheckDiaries();
    const interval = setInterval(fetchPetAndCheckDiaries, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const checkNewDiaries = async (currentPet: Pet) => {
    if (isViewingDiaryRef.current) return; // Don't check if already viewing
    
    try {
      const res = await api.get(`/trip/diaries?pet_id=${currentPet.id}`);
      const allDiaries: Diary[] = res.data;
      const lastReadId = currentPet.last_read_diary_id || 0;
      
      const unread = allDiaries.filter(d => d.id > lastReadId);
      
      if (unread.length > 0) {
        setNewDiaries(unread);
        setShowDiaryPrompt(true);
      }
    } catch (error) {
      console.error("Failed to fetch diaries:", error);
    }
  };

  const fetchPetAndCheckDiaries = async () => {
    try {
      // Fetch user's pets
      const res = await api.get("/pet/my/all");
      if (res.data && res.data.length > 0) {
        const pets = res.data;
        const currentPet = pets[pets.length - 1];
        const newStatus = currentPet.status;
        
        const existingPet = petRef.current;

        // Initial Load
        if (!existingPet) {
             setPet(currentPet);
             prevStatusRef.current = newStatus;
             setLoading(false);
             // Check for new diaries on initial load
             checkNewDiaries(currentPet);
             return;
        }

        // Status Change
        if (prevStatusRef.current && prevStatusRef.current !== newStatus) {
            const oldStatus = prevStatusRef.current;
            // Just update pet and bg
            setPet(currentPet);
            prevStatusRef.current = newStatus;
            setBgVersion(Date.now());
            
            // If returning from trip, check diaries immediately
            if (oldStatus === 'traveling') {
                checkNewDiaries(currentPet);
            }
        } else {
            // No status change, check important fields
            if (
                existingPet.name !== currentPet.name || 
                existingPet.template_id !== currentPet.template_id ||
                existingPet.last_read_diary_id !== currentPet.last_read_diary_id
            ) {
                setPet(currentPet);
            }
            
            // Periodically check diaries if not traveling
            if (newStatus !== 'traveling') {
                 // We can optimize this to not run every 5s, but for MVP it's fine.
                 // To avoid spamming, we only check if we don't have unread diaries pending
                 if (newDiaries.length === 0) {
                     checkNewDiaries(currentPet);
                 }
            }
        }
      }
    } catch (error) {
      console.error("Failed to fetch pets", error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  // Redirect if pet is still an egg
   useEffect(() => {
     if (pet) {
       if (pet.status === 'egg_frozen' || pet.status === 'egg_heating' || pet.status === 'egg' || pet.status === 'egg_dead') {
         router.push('/hatch');
       } else if (pet.status === 'egg_hatched') {
         router.push('/naming');
       }
     }
   }, [pet, router]);

  const handleOpenDiary = () => {
    setShowDiaryPrompt(false);
    setShowDiaryViewer(true);
  };

  const handleCloseDiaryViewer = async () => {
    setShowDiaryViewer(false);
    // Update last read ID
    if (pet && newDiaries.length > 0) {
      const maxId = Math.max(...newDiaries.map(d => d.id));
      try {
        await api.post("/pet/read_diary", { last_read_diary_id: maxId });
        // Optimistically update local state
        setPet({ ...pet, last_read_diary_id: maxId });
        setNewDiaries([]);
      } catch (error) {
        console.error("Failed to update read diary:", error);
      }
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;

  if (!pet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-bold mb-4">未找到宠物</h1>
        <p className="mb-8 text-gray-600">你还没有孵化宠物哦！</p>
        <Link href="/hatch" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
          去孵化屋
        </Link>
      </div>
    );
  }

  // Redirect if egg
   if (pet.status === 'egg_frozen' || pet.status === 'egg_heating' || pet.status === 'egg' || pet.status === 'egg_dead') {
      return <div className="min-h-screen flex items-center justify-center bg-[#FFF8E7]">正在前往孵化屋...</div>;
   }
   if (pet.status === 'egg_hatched') {
      return <div className="min-h-screen flex items-center justify-center bg-[#FFF8E7]">正在前往起名页面...</div>;
   }

  // Handle template ID
  const displayTemplateId = pet.template_id;
  const currentStatus = pet.status || 'sleeping';
  const isTraveling = currentStatus === 'traveling';
  
  // Image Source Logic
  // 1. Background is always home-bg.gif (Empty room)
  // 2. Pet is an overlay GIF (red_panda for now)
  const backgroundImage = '/images/backgrounds/home-bg.gif';
  
  // Force use red_panda for now
  const displayTemplateIdOverride = 'red_panda';
  const petImage = `/images/pets/${displayTemplateIdOverride}_${currentStatus}.gif`;

  return (
    <div className="min-h-screen relative bg-[#f0f9ff] overflow-hidden">
      {/* Main Content Container */}
      <motion.div 
        className="relative z-10 min-h-screen flex flex-col justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
      >
        {/* ... Header ... */}
        <header className="p-6 flex justify-between items-center z-20">
          {/* Custom Image Title with Font */}
          <div className="relative transform -rotate-2 hover:scale-105 transition-transform duration-300">
            {/* Background Image for Title */}
            <img 
              src="/images/ui/title_bg.png" 
              alt="Title Background" 
              className="h-12 md:h-14 w-auto object-contain drop-shadow-md"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-white', 'border-4', 'border-black', 'rounded-2xl', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
              }}
            />
            {/* Text Overlay */}
            <h1 className="absolute inset-0 flex items-center justify-center text-lg md:text-xl font-zcool text-black pb-1">
              {pet.name}的家
            </h1>
          </div>

          <div className="flex gap-4">
            <Link href="/diary" className="group relative hover:scale-105 transition-transform duration-300">
              <img 
                src="/images/ui/diary_btn.png" 
                alt="旅行日记" 
                className="h-12 md:h-14 w-auto object-contain drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('px-5', 'py-2', 'bg-white', 'border-2', 'border-black', 'rounded-xl', 'font-bold', 'text-black', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
                  e.currentTarget.parentElement!.innerText = '📖 旅行日记';
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-zcool text-black text-lg md:text-xl pointer-events-none pb-1">
                日记
              </span>
            </Link>
            
            <button onClick={() => setShowChat(true)} className="group relative hover:scale-105 transition-transform duration-300">
              <img 
                src="/images/ui/chat_btn.png" 
                alt="聊天" 
                className="h-12 md:h-14 w-auto object-contain drop-shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('px-5', 'py-2', 'bg-white', 'border-2', 'border-black', 'rounded-xl', 'font-bold', 'text-black', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
                  e.currentTarget.parentElement!.innerText = '💬 聊天';
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-zcool text-black text-lg md:text-xl pointer-events-none pb-1">
                聊天
              </span>
            </button>

            <Link href="/social" className="group relative hover:scale-105 transition-transform duration-300">
              <div className="px-5 py-2 bg-white border-2 border-black rounded-xl font-bold text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center h-12 md:h-14">
                👥 好友
              </div>
            </Link>
          </div>
        </header>

        {/* Central Display Area */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
            {/* 1. Background Layer */}
            <img 
                src={backgroundImage}
                alt="Home Background"
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* 2. Content Layer */}
            {isTraveling ? (
                // Traveling: Status Card only
                <div className="relative z-10 bg-white/90 p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center transform rotate-2">
                    <p className="text-2xl font-black mb-2">✈️ 旅行中</p>
                    <p className="text-gray-600 font-bold">我会给你带礼物回来的！</p>
                </div>
            ) : (
                // At Home: Pet Sprite Overlay
                <motion.img 
                    key={petImage}
                    src={petImage}
                    alt={pet.name}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    // Adjust sizing to be a sprite on the floor
                    className="absolute bottom-20 left-1/2 transform -translate-x-1/2 h-[35vh] w-auto object-contain cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setShowChat(true)}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        console.error(`Failed to load pet image: ${petImage}`);
                    }}
                />
            )}
        </div>

        {/* Empty Footer Spacer */}
        <div className="h-20"></div>

        {/* Diary Prompt Modal */}
        <HandDrawnModal 
          isOpen={showDiaryPrompt}
          onClose={() => setShowDiaryPrompt(false)}
          onConfirm={handleOpenDiary}
          title="新的旅行日记"
          confirmText="查看日记"
          cancelText="稍后再看"
          type="confirm"
        >
            <div className="flex flex-col items-center">
                <p>你的宠物 {pet.name} 给你带回了新的日记！</p>
                <p className="text-sm text-gray-500 mt-2">是否现在查看？</p>
            </div>
        </HandDrawnModal>

        {/* Diary Viewer Overlay */}
        {showDiaryViewer && (
            <DiaryViewer 
                diaries={newDiaries} 
                onClose={handleCloseDiaryViewer} 
            />
        )}
      </motion.div>

      {/* Chat Slide-in Panel */}
      <AnimatePresence>
        {showChat && (
          <>
            {/* Backdrop / Mask */}
            <motion.div
              className="fixed inset-0 z-40 flex items-center justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setShowChat(false)}
            >
              <div className="absolute inset-0 bg-black/40" />
              {/* Pet GIF on the left side, vertically centered */}
              <motion.img
                src="/images/pets/red_panda_happy.gif"
                alt={pet.name}
                className="relative z-10 h-[40vh] w-auto object-contain ml-4 pointer-events-none"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              />
            </motion.div>

            {/* Chat Panel (right side, with padding and rounded corners) */}
            <motion.div
              className="fixed top-4 right-4 bottom-4 z-50 w-[62%] max-w-[400px]"
              initial={{ x: "110%" }}
              animate={{ x: 0 }}
              exit={{ x: "110%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-full rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                <ChatPanel
                  petId={pet.id}
                  petName={pet.name}
                  onClose={() => setShowChat(false)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
