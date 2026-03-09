"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

type PetStatus = "reading" | "eating" | "sleeping" | "traveling" | string;

interface Position {
  left: string;
  bottom: string;
}

const STATUS_POSITIONS: Record<string, Position> = {
  reading:  { left: "18%", bottom: "12%" },
  eating:   { left: "55%", bottom: "32%" },
  sleeping: { left: "38%", bottom: "60%" },
};

const DEFAULT_POSITION: Position = { left: "50%", bottom: "20%" };

function getPosition(status: string): Position {
  return STATUS_POSITIONS[status] || DEFAULT_POSITION;
}

function getWalkingGif(from: Position, to: Position): string {
  const dx = parseFloat(to.left) - parseFloat(from.left);
  const dy = parseFloat(to.bottom) - parseFloat(from.bottom);

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "right_walking" : "left_walking";
  }
  return dy > 0 ? "back_walking" : "front_walking";
}

interface PetSpriteProps {
  status: PetStatus;
  petName: string;
  templateId?: string;
  onClick?: () => void;
}

const WALK_DURATION = 2;
const FADE_DURATION = 400;

export default function PetSprite({ status, petName, templateId = "red_panda", onClick }: PetSpriteProps) {
  const prevStatusRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "walking" | "fade-in">("idle");
  const [sceneStatus, setSceneStatus] = useState(status);
  const [walkFrom, setWalkFrom] = useState<Position>(getPosition(status));
  const [walkTo, setWalkTo] = useState<Position>(getPosition(status));
  const [walkingGif, setWalkingGif] = useState("");

  // Preload all images on mount
  useEffect(() => {
    const statuses = ["reading", "eating", "sleeping"];
    const walks = ["back_walking", "front_walking", "left_walking", "right_walking"];
    [...statuses, ...walks].forEach(s => {
      const img = new Image();
      img.src = `/images/pets/${templateId}_${s}.gif`;
    });
    const bg = new Image();
    bg.src = "/images/backgrounds/home-bg.gif";
  }, [templateId]);

  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = status;

    if (prev === null || prev === status) {
      setSceneStatus(status);
      return;
    }

    if (status === "traveling") {
      setSceneStatus(status);
      return;
    }

    const fromPos = getPosition(prev === "traveling" ? status : prev);
    const toPos = getPosition(status);
    const walkGif = getWalkingGif(fromPos, toPos);

    setWalkFrom(fromPos);
    setWalkTo(toPos);
    setWalkingGif(walkGif);
    setPhase("walking");

    const walkTimer = setTimeout(() => {
      // Walking done — update scene src while still invisible, then fade in
      setSceneStatus(status);
      setPhase("fade-in");

      const fadeTimer = setTimeout(() => {
        setPhase("idle");
      }, FADE_DURATION);

      return () => clearTimeout(fadeTimer);
    }, WALK_DURATION * 1000);

    return () => clearTimeout(walkTimer);
  }, [status]);

  const emptyRoomBg = "/images/backgrounds/home-bg.gif";
  const sceneGif = `/images/pets/${templateId}_${sceneStatus}.gif`;
  const walkGifSrc = `/images/pets/${templateId}_${walkingGif}.gif`;

  const isWalking = phase === "walking";
  const sceneVisible = phase === "idle" && sceneStatus !== "traveling";

  return (
    <>
      {/* Layer 1: empty room — always in DOM */}
      <img
        src={emptyRoomBg}
        alt="Home Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Layer 2: scene GIF — always in DOM, visibility via opacity */}
      <img
        src={sceneGif}
        alt={`${petName} ${sceneStatus}`}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
        style={{
          opacity: sceneVisible ? 1 : 0,
          transition: `opacity ${FADE_DURATION}ms ease`,
          pointerEvents: sceneVisible ? "auto" : "none",
        }}
        onClick={onClick}
      />

      {/* Layer 3: walking sprite */}
      {isWalking && (
        <motion.img
          key={`walk-${walkingGif}-${status}`}
          src={walkGifSrc}
          alt={`${petName} walking`}
          className="absolute h-[28vh] w-auto object-contain cursor-pointer z-10"
          style={{ transform: "translateX(-50%)" }}
          initial={{ left: walkFrom.left, bottom: walkFrom.bottom }}
          animate={{ left: walkTo.left, bottom: walkTo.bottom }}
          transition={{ duration: WALK_DURATION, ease: "easeInOut" }}
          onClick={onClick}
        />
      )}
    </>
  );
}
