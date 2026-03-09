"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import HandDrawnModal from "@/components/HandDrawnModal";
import DiaryViewer from "@/components/DiaryViewer";
import ChatPanel from "@/components/ChatPanel";
import PetSprite from "@/components/PetSprite";
import { Drawer } from "vaul";
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
  const [showPetGif, setShowPetGif] = useState(false);

  useEffect(() => {
    if (showChat) {
      const timer = setTimeout(() => setShowPetGif(true), 1200);
      return () => clearTimeout(timer);
    } else {
      setShowPetGif(false);
    }
  }, [showChat]);

  const petRef = useRef<Pet | null>(null);
  const isViewingDiaryRef = useRef(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);

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
          console.log(`[Home] Status changed: ${oldStatus} → ${newStatus}`);
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

  const currentStatus = pet.status || 'sleeping';
  const isTraveling = currentStatus === 'traveling';
  const backgroundImage = '/images/backgrounds/home-bg.gif';

  return (
    <div className="h-screen w-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Game container — locked to 800:1422 aspect ratio */}
      <div
        ref={gameContainerRef}
        className="relative h-full overflow-hidden"
        style={{ aspectRatio: "800 / 1422", maxWidth: "100vw" }}
      >
        {/* Scene layer */}
        <div className="absolute inset-0 z-0">
          {isTraveling ? (
            <>
              <img
                src={backgroundImage}
                alt="Home Background"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative z-10 bg-white/90 p-6 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center transform rotate-2">
                  <p className="text-2xl font-black mb-2">✈️ 旅行中</p>
                  <p className="text-gray-600 font-bold">我会给你带礼物回来的！</p>
                </div>
              </div>
            </>
          ) : (
            <PetSprite
              status={currentStatus}
              petName={pet.name}
              templateId="red_panda"
              onClick={() => setShowChat(true)}
            />
          )}
        </div>

        {/* UI overlay */}
        <motion.div
          className="relative z-10 h-full flex flex-col justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
        >
          <header className="p-4 flex justify-end items-center">

            <div className="flex gap-4">
              <Link href="/diary" className="group relative hover:scale-105 transition-transform duration-300">
                <img 
                  src="/images/ui/diary_btn.png" 
                  alt="旅行日记" 
                  className="h-16 md:h-20 w-auto object-contain drop-shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('px-5', 'py-2', 'bg-white', 'border-2', 'border-black', 'rounded-xl', 'font-bold', 'text-black', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
                    e.currentTarget.parentElement!.innerText = '📖 旅行日记';
                  }}
                />
              </Link>
              
              <button onClick={() => setShowChat(true)} className="group relative hover:scale-105 transition-transform duration-300">
                <img 
                  src="/images/ui/chat_btn.png" 
                  alt="聊天" 
                  className="h-16 md:h-20 w-auto object-contain drop-shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('px-5', 'py-2', 'bg-white', 'border-2', 'border-black', 'rounded-xl', 'font-bold', 'text-black', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
                    e.currentTarget.parentElement!.innerText = '💬 聊天';
                  }}
                />
              </button>

              <Link href="/social" className="group relative hover:scale-105 transition-transform duration-300">
                <img 
                  src="/images/ui/friend_btn.png" 
                  alt="好友" 
                  className="h-16 md:h-20 w-auto object-contain drop-shadow-md"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('px-5', 'py-2', 'bg-white', 'border-2', 'border-black', 'rounded-xl', 'font-bold', 'text-black', 'shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]');
                    e.currentTarget.parentElement!.innerText = '👥 好友';
                  }}
                />
              </Link>
            </div>
          </header>

          <div className="h-20" />
        </motion.div>

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
      </div>

      {/* Chat Bottom Sheet */}
      <Drawer.Root open={showChat} onOpenChange={(open) => {
        setShowChat(open);
        if (!open) setShowPetGif(false);
      }}>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
        {showPetGif && (
          <motion.img
            src="/images/pets/red_panda_happy.gif"
            alt={pet.name}
            className="fixed z-[45] h-[25vh] w-auto object-contain drop-shadow-lg pointer-events-none"
            style={{ left: '50%', bottom: '65vh', x: '-50%' }}
            initial={{ y: '150%' }}
            animate={{
              y: ['150%', '50%', '50%', '-10%', '0%'],
              rotate: [0, 0, 0, -8, 0],
              scale: [1, 1, 1, 1.1, 1],
            }}
            transition={{
              duration: 2.2,
              ease: 'easeOut',
              times: [0, 0.15, 0.6, 0.85, 1],
            }}
          />
        )}
        <Drawer.Portal>
          <Drawer.Content
            className="fixed left-0 right-0 mx-auto z-50 flex flex-col bg-[#FFF8E7] border-t-2 border-x-2 border-black rounded-t-2xl shadow-[0px_-4px_20px_rgba(0,0,0,0.15)] outline-none"
            style={{
              width: `min(calc(100vw - 16px), calc(100vh * 800 / 1422 - 16px))`,
              height: '65vh',
              bottom: '-2px',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <Drawer.Handle className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-black/30" />
            <Drawer.Title className="px-4 py-2 font-black text-lg text-black border-b-2 border-black bg-white shrink-0 rounded-t-xl">
              与{pet.name}聊天
            </Drawer.Title>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatPanel
                petId={pet.id}
                petName={pet.name}
                onClose={() => setShowChat(false)}
                hideHeader
              />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
