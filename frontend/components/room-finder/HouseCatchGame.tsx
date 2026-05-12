"use client";

import { useEffect, useRef, useState } from "react";

interface HouseCatchGameProps {
  isGenerating: boolean;
  onClose: () => void;
}

export function HouseCatchGame({ isGenerating, onClose }: HouseCatchGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const gameStateRef = useRef({
    paddle: { x: 120, y: 280 },
    ball: { x: 150, y: 240, vx: 2.5, vy: -3 },
    bricks: [] as { x: number; y: number; alive: boolean; color: string }[],
    score: 0,
    running: false,
    mouseX: -1,
  });
  const rafRef = useRef<number | null>(null);

  const W = 300, H = 320;
  const PADDLE_W = 60, PADDLE_H = 8;
  const BALL_R = 6;
  const BRICK_ROWS = 4, BRICK_COLS = 6;
  const BRICK_W = 42, BRICK_H = 14;
  const BRICK_PAD = 4;
  const BRICK_OFFSET_X = 12, BRICK_OFFSET_Y = 30;
  const COLORS = ["#A8896C", "#c4a882", "#d4b896", "#e8d5c0"];

  const initBricks = () => {
    const bricks = [];
    for (let r = 0; r < BRICK_ROWS; r++) {
      for (let c = 0; c < BRICK_COLS; c++) {
        bricks.push({
          x: BRICK_OFFSET_X + c * (BRICK_W + BRICK_PAD),
          y: BRICK_OFFSET_Y + r * (BRICK_H + BRICK_PAD),
          alive: true,
          color: COLORS[r],
        });
      }
    }
    return bricks;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const gs = gameStateRef.current;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#fdfaf7";
    ctx.fillRect(0, 0, W, H);

    // 벽돌
    gs.bricks.forEach((b) => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.roundRect(b.x + 2, b.y + 2, BRICK_W - 4, 4, 2);
      ctx.fill();
    });

    // 패들
    ctx.fillStyle = "#57534e";
    ctx.beginPath();
    ctx.roundRect(gs.paddle.x, gs.paddle.y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();

    // 공
    ctx.fillStyle = "#A8896C";
    ctx.beginPath();
    ctx.arc(gs.ball.x, gs.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  };

  const update = () => {
    const gs = gameStateRef.current;

    // 마우스로 패들 이동
    if (gs.mouseX >= 0) {
      gs.paddle.x = Math.max(0, Math.min(W - PADDLE_W, gs.mouseX - PADDLE_W / 2));
    }

    gs.ball.x += gs.ball.vx;
    gs.ball.y += gs.ball.vy;

    // 벽 반사
    if (gs.ball.x - BALL_R < 0 || gs.ball.x + BALL_R > W) gs.ball.vx *= -1;
    if (gs.ball.y - BALL_R < 0) gs.ball.vy *= -1;

    // 패들 반사
    if (
      gs.ball.y + BALL_R >= gs.paddle.y &&
      gs.ball.y + BALL_R <= gs.paddle.y + PADDLE_H &&
      gs.ball.x >= gs.paddle.x &&
      gs.ball.x <= gs.paddle.x + PADDLE_W
    ) {
      gs.ball.vy = -Math.abs(gs.ball.vy);
      const hit = (gs.ball.x - gs.paddle.x) / PADDLE_W - 0.5;
      gs.ball.vx = hit * 5;
    }

    // 바닥
    if (gs.ball.y + BALL_R > H) {
      gs.running = false;
      setGameOver(true);
      return;
    }

    // 벽돌 충돌
    gs.bricks.forEach((b) => {
      if (!b.alive) return;
      if (
        gs.ball.x > b.x &&
        gs.ball.x < b.x + BRICK_W &&
        gs.ball.y - BALL_R < b.y + BRICK_H &&
        gs.ball.y + BALL_R > b.y
      ) {
        b.alive = false;
        gs.ball.vy *= -1;
        gs.score += 1;
        setScore(gs.score);
      }
    });

    // 클리어
    if (gs.bricks.every((b) => !b.alive)) {
      gs.running = false;
      setGameOver(true);
    }
  };

  const loop = () => {
    const gs = gameStateRef.current;
    if (!gs.running) return;
    update();
    draw();
    rafRef.current = requestAnimationFrame(loop);
  };

  const startGame = () => {
    const gs = gameStateRef.current;
    gs.paddle = { x: 120, y: 280 };
    gs.ball = { x: 150, y: 240, vx: 2.5, vy: -3 };
    gs.bricks = initBricks();
    gs.score = 0;
    gs.running = true;
    setScore(0);
    setGameOver(false);
    setGameStarted(true);
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopGame = () => {
    gameStateRef.current.running = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    gameStateRef.current.mouseX = e.clientX - rect.left;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const gs = gameStateRef.current;
    if (e.key === "ArrowLeft") gs.paddle.x = Math.max(0, gs.paddle.x - 20);
    if (e.key === "ArrowRight") gs.paddle.x = Math.min(W - PADDLE_W, gs.paddle.x + 20);
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isGenerating && gameStarted) {
      stopGame();
      setTimeout(onClose, 600);
    }
  }, [isGenerating]);

  useEffect(() => {
    return () => stopGame();
  }, []);

  // 초기 화면 그리기
  useEffect(() => {
    if (gameStarted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fdfaf7";
    ctx.fillRect(0, 0, W, H);
    const bricks = initBricks();
    bricks.forEach((b) => {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
      ctx.fill();
    });
  }, [gameStarted]);

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 20,
      background: "var(--color-background-primary)",
      borderRadius: "inherit", display: "flex", flexDirection: "column",
      padding: "16px", overflow: "hidden",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
          AI 이미지 생성 중... 벽돌을 깨요!
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

      {/* 게임 캔버스 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
        <div style={{ position: "relative" }}>
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onMouseMove={handleMouseMove}
            style={{
              borderRadius: "12px",
              border: "0.5px solid var(--color-border-tertiary)",
              display: "block",
              cursor: "none",
            }}
          />

          {/* 시작 전 오버레이 */}
          {!gameStarted && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "12px", borderRadius: "12px",
              background: "rgba(253,250,247,0.92)",
            }}>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>🧱 벽돌깨기</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
                마우스 또는 ← → 키로 패들을 움직여<br />벽돌을 모두 깨세요!
              </p>
              <button
                onClick={startGame}
                style={{
                  padding: "8px 24px", borderRadius: "8px", cursor: "pointer",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "#57534e", color: "white",
                  fontSize: "13px", fontWeight: 500,
                }}
              >
                시작하기
              </button>
            </div>
          )}

          {/* 게임오버 오버레이 */}
          {gameOver && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "12px", borderRadius: "12px",
              background: "rgba(253,250,247,0.92)",
            }}>
              <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>
                {gameStateRef.current.bricks.every(b => !b.alive) ? "🎉 클리어!" : "💔 게임오버"}
              </p>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>점수: {score}</p>
              <button
                onClick={startGame}
                style={{
                  padding: "8px 24px", borderRadius: "8px", cursor: "pointer",
                  border: "0.5px solid var(--color-border-secondary)",
                  background: "#57534e", color: "white",
                  fontSize: "13px", fontWeight: 500,
                }}
              >
                다시하기
              </button>
            </div>
          )}

          {/* 이미지 완성 오버레이 */}
          {!isGenerating && gameStarted && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: "8px", borderRadius: "12px",
              background: "rgba(253,250,247,0.95)",
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
    </div>
  );
}