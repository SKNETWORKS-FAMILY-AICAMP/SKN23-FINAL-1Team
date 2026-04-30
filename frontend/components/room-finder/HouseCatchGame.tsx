"use client";

import { useEffect, useRef, useState } from "react";

interface HouseCatchGameProps {
  isGenerating: boolean;
  onClose: () => void;
}

export function HouseCatchGame({ isGenerating, onClose }: HouseCatchGameProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const scoreRef = useRef(0);
  const housesRef = useRef<{ el: HTMLDivElement; speed: number; y: number }[]>([]);
  const rafRef = useRef<number | null>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const HOUSE_SVG = `<svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 18L18 6L32 18" fill="#5C8A62" stroke="#3B6D11" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="8" y="18" width="20" height="13" rx="1" fill="#c8b89a" stroke="#9a8a72" stroke-width="1"/>
    <rect x="14" y="22" width="8" height="9" rx="1" fill="#7a9070" stroke="#4a6050" stroke-width="0.8"/>
    <rect x="10" y="20" width="5" height="5" rx="0.5" fill="#d4e8d4" stroke="#7a9070" stroke-width="0.8"/>
  </svg>`;

  const showFlash = (x: number, y: number, text: string, isHit: boolean) => {
    const area = areaRef.current;
    if (!area) return;
    const flash = document.createElement("div");
    flash.textContent = text;
    flash.style.cssText = `
      position: absolute; left: ${x}px; top: ${y}px;
      font-size: 12px; font-weight: 500; pointer-events: none;
      color: ${isHit ? "#0F6E56" : "#E24B4A"};
      animation: fadeUp 0.6s forwards; z-index: 10;
    `;
    area.appendChild(flash);
    setTimeout(() => flash.remove(), 600);
  };

  const createHouse = () => {
    const area = areaRef.current;
    if (!area) return;
    const el = document.createElement("div");
    const x = Math.random() * (area.clientWidth - 50) + 5;
    const speed = 1.2 + Math.random() * 1.2 + scoreRef.current * 0.02;
    let y = -50;

    el.style.cssText = `
      position: absolute; left: ${x}px; top: ${y}px;
      width: 40px; height: 40px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    `;
    el.innerHTML = HOUSE_SVG;

    el.addEventListener("click", (e) => {
      e.stopPropagation();
      scoreRef.current += 1;
      setScore(scoreRef.current);
      showFlash(x, y, "+1", true);
      el.remove();
      housesRef.current = housesRef.current.filter((h) => h.el !== el);
    });

    area.appendChild(el);
    housesRef.current.push({ el, speed, y });
  };

  const tick = () => {
    const area = areaRef.current;
    if (!area) return;

    housesRef.current = housesRef.current.filter((h) => {
      h.y += h.speed;
      h.el.style.top = h.y + "px";
      if (h.y > area.clientHeight) {
        showFlash(parseFloat(h.el.style.left), area.clientHeight - 40, "-1", false);
        scoreRef.current = Math.max(0, scoreRef.current - 1);
        setScore(scoreRef.current);
        h.el.remove();
        return false;
      }
      return true;
    });

    rafRef.current = requestAnimationFrame(tick);
  };

  const startGame = () => {
    setGameStarted(true);
    scoreRef.current = 0;
    setScore(0);
    housesRef.current = [];
    spawnRef.current = setInterval(createHouse, 900);
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopGame = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (spawnRef.current) clearInterval(spawnRef.current);
    housesRef.current.forEach((h) => h.el.remove());
    housesRef.current = [];
  };

  // 이미지 생성 완료 시 자동 종료
  useEffect(() => {
    if (!isGenerating && gameStarted) {
      stopGame();
      setTimeout(onClose, 600);
    }
  }, [isGenerating]);

  useEffect(() => {
    return () => stopGame();
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "var(--color-background-primary)",
      borderRadius: "inherit", display: "flex", flexDirection: "column",
      padding: "16px", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          AI 이미지 생성 중... 집을 잡아요!
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
            점수: {score}
          </span>
          <button
            onClick={() => { stopGame(); onClose(); }}
            style={{
              border: "none", background: "none", cursor: "pointer",
              fontSize: "12px", color: "var(--color-text-secondary)",
              padding: "2px 6px", borderRadius: "6px",
            }}
          >
            건너뛰기
          </button>
        </div>
      </div>

      {/* 게임 영역 */}
      <div
        ref={areaRef}
        style={{
          flex: 1, background: "var(--color-background-secondary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: "12px", position: "relative", overflow: "hidden",
        }}
      >
        {!gameStarted && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px",
          }}>
            <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
              <path d="M4 18L18 6L32 18" fill="#5C8A62" stroke="#3B6D11" strokeWidth="1.5" strokeLinejoin="round"/>
              <rect x="8" y="18" width="20" height="13" rx="1" fill="#c8b89a" stroke="#9a8a72" strokeWidth="1"/>
              <rect x="14" y="22" width="8" height="9" rx="1" fill="#7a9070" stroke="#4a6050" strokeWidth="0.8"/>
            </svg>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" }}>집 잡기 게임</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6 }}>
              떨어지는 집을 클릭해서 잡으세요!<br/>놓치면 감점돼요
            </p>
            <button
              onClick={startGame}
              style={{
                padding: "8px 24px", borderRadius: "8px", cursor: "pointer",
                border: "0.5px solid var(--color-border-secondary)",
                background: "var(--color-background-primary)",
                color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 500,
              }}
            >
              시작하기
            </button>
          </div>
        )}

        {!isGenerating && gameStarted && (
          <div style={{
            position: "absolute", inset: 0, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px",
            background: "var(--color-background-primary)", borderRadius: "12px",
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="15" fill="#E1F5EE" stroke="#0F6E56" strokeWidth="1.5"/>
              <path d="M9 16l5 5 9-9" stroke="#0F6E56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span style={{ fontSize: "13px", color: "#0F6E56", fontWeight: 500 }}>이미지 완성!</span>
          </div>
        )}
      </div>
    </div>
  );
}
