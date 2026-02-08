"use client";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface HandDrawnModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  type?: "info" | "confirm";
}

export default function HandDrawnModal({ 
  isOpen, 
  onClose, 
  title, 
  message, 
  children, 
  confirmText = "好的", 
  cancelText = "取消",
  onConfirm,
  type = "info" 
}: HandDrawnModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with blur - keeping it for the modal itself as it helps focus, but user asked to remove blur from HEADER only */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, rotate: -2, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.9, rotate: 2, opacity: 0 }}
            className="relative bg-white p-8 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full"
          >
            {/* Close Button (X) */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center border-2 border-black rounded-full hover:bg-gray-100 transition-colors"
            >
              <span className="font-bold text-lg leading-none mb-1">x</span>
            </button>

            <h2 className="text-2xl font-black mb-4 text-center transform -rotate-1">{title}</h2>
            
            <div className="mb-8 text-lg font-medium text-gray-800 text-center leading-relaxed">
              {message || children}
            </div>

            <div className="flex justify-center gap-6">
              {type === "confirm" && (
                <button 
                  onClick={onClose}
                  className="px-6 py-2 bg-white border-2 border-black rounded-xl font-bold hover:bg-gray-50 active:translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
                >
                  {cancelText}
                </button>
              )}
              
              <button 
                onClick={onConfirm || onClose}
                className="px-6 py-2 bg-[#FFD700] border-2 border-black rounded-xl font-bold hover:brightness-105 active:translate-y-1 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
