"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Diary {
  id: number;
  title: string;
  content: string;
  image_url?: string;
  created_at: string;
}

interface DiaryViewerProps {
  diaries: Diary[];
  onClose: () => void;
}

export default function DiaryViewer({ diaries, onClose }: DiaryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < diaries.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentDiary = diaries[currentIndex];
  
  // Format date
  const date = new Date(currentDiary.created_at).toLocaleDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl px-4">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 m-4 z-50 bg-white rounded-full p-2 border-2 border-black hover:bg-gray-100"
        >
          ❌
        </button>

        <div className="flex items-center justify-between">
          {/* Left Arrow */}
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`p-3 bg-white border-2 border-black rounded-full transition-opacity ${
              currentIndex === 0 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100"
            }`}
          >
            ⬅️
          </button>

          {/* Diary Card */}
          <div className="mx-4 flex-1 bg-white border-4 border-black rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative min-h-[400px] flex flex-col">
            <div className="text-center mb-4 border-b-2 border-dashed border-gray-300 pb-2">
               <span className="inline-block bg-orange-100 px-3 py-1 rounded-full text-sm font-bold border border-black mb-2">
                 {date}
               </span>
               <h2 className="text-2xl font-zcool font-bold">{currentDiary.title}</h2>
            </div>

            {/* Diary Image */}
            {currentDiary.image_url && (
              <div className="mb-4 rounded-xl border-2 border-black overflow-hidden shadow-md flex-shrink-0">
                 <img 
                    src={currentDiary.image_url} 
                    alt={currentDiary.title} 
                    className="w-full h-auto max-h-64 object-cover"
                    onError={(e) => e.currentTarget.style.display = 'none'}
                 />
              </div>
            )}
            
            <div className="flex-1 overflow-y-auto mb-4 font-handwriting text-lg leading-relaxed whitespace-pre-wrap">
              {currentDiary.content}
            </div>
            
            <div className="text-center text-gray-400 text-sm">
              {currentIndex + 1} / {diaries.length}
            </div>
          </div>

          {/* Right Arrow */}
          <button 
            onClick={handleNext}
            disabled={currentIndex === diaries.length - 1}
            className={`p-3 bg-white border-2 border-black rounded-full transition-opacity ${
              currentIndex === diaries.length - 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100"
            }`}
          >
            ➡️
          </button>
        </div>
      </div>
    </div>
  );
}
