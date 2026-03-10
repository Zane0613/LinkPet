"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

type PetStatus = "reading" | "eating" | "sleeping" | "traveling" | string;

interface WalkPath {
  gifs: string[];
  lefts: string[];
  bottoms: string[];
  widths: string[];
  times: number[];
}

const DEFAULT_PATH: WalkPath = {
  gifs: ["front_walking"],
  lefts: ["50%", "50%"],
  bottoms: ["50%", "20%"],
  widths: ["26%", "26%"],
  times: [0, 1],
};

interface PetSpriteProps {
  status: PetStatus;
  petName: string;
  templateId?: string;
  onClick?: () => void;
}

const WALK_DURATION = 3;
const FADE_DURATION = 400;

export default function PetSprite({ status, petName, templateId = "red_panda", onClick }: PetSpriteProps) {
  const prevStatusRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "walking" | "fade-in">("idle");
  const [sceneStatus, setSceneStatus] = useState(status);
  const [walkPath, setWalkPath] = useState<WalkPath | null>(null);
  const [walkGifIdx, setWalkGifIdx] = useState(0);
  const walkPathsRef = useRef<Record<string, WalkPath>>({});

  useEffect(() => {
    fetch("/walk-paths.json")
      .then(r => r.json())
      .then(data => { walkPathsRef.current = data; })
      .catch(() => {});

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

    const prevStatus = prev === "traveling" ? status : prev;
    const key = `${prevStatus}→${status}`;
    const path = walkPathsRef.current[key] || DEFAULT_PATH;

    setWalkPath(path);
    setWalkGifIdx(0);
    setPhase("walking");

    const gifTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < path.gifs.length; i++) {
      const switchAt = path.times[i] * WALK_DURATION * 1000;
      gifTimers.push(setTimeout(() => setWalkGifIdx(i), switchAt));
    }

    const walkTimer = setTimeout(() => {
      setSceneStatus(status);
      setPhase("fade-in");

      const fadeTimer = setTimeout(() => {
        setPhase("idle");
      }, FADE_DURATION);

      return () => clearTimeout(fadeTimer);
    }, WALK_DURATION * 1000);

    return () => {
      clearTimeout(walkTimer);
      gifTimers.forEach(clearTimeout);
    };
  }, [status]);

  const emptyRoomBg = "/images/backgrounds/home-bg.gif";
  const sceneGif = `/images/pets/${templateId}_${sceneStatus}.gif`;
  const currentWalkGif = walkPath ? walkPath.gifs[walkGifIdx] || walkPath.gifs[0] : "front_walking";
  const walkGifSrc = `/images/pets/${templateId}_${currentWalkGif}.gif`;

  const isWalking = phase === "walking";
  const sceneVisible = phase === "idle" && sceneStatus !== "traveling";

  return (
    <>
      <img
        src={emptyRoomBg}
        alt="Home Background"
        className="absolute inset-0 w-full h-full object-cover"
      />

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

      {isWalking && walkPath && (
        <motion.img
          key={`walk-${status}`}
          src={walkGifSrc}
          alt={`${petName} walking`}
          className="absolute h-auto object-contain cursor-pointer z-10"
          style={{ transform: "translate(-50%, 50%)" }}
          initial={{
            left: walkPath.lefts[0],
            bottom: walkPath.bottoms[0],
            width: walkPath.widths[0],
          }}
          animate={{
            left: walkPath.lefts,
            bottom: walkPath.bottoms,
            width: walkPath.widths,
          }}
          transition={{
            duration: WALK_DURATION,
            ease: "linear",
            times: walkPath.times,
          }}
          onClick={onClick}
        />
      )}
    </>
  );
}
