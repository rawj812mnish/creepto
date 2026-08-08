import { useEffect, useRef } from "react";

const CHARS = "01アイウエオカキクケコサシスセソ$#@&*+-<>[]{}";

export default function MatrixRain({ opacity = 0.06 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops = Array.from({ length: columns }, () => Math.random() * height);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, () => Math.random() * height);
    };
    window.addEventListener("resize", handleResize);

    let animationId;
    function draw() {
      ctx.fillStyle = "rgba(10, 14, 20, 0.08)";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#22d3ee";
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        ctx.fillText(char, i * fontSize, drops[i]);
        if (drops[i] > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += fontSize;
      }
      animationId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity }}
    />
  );
}
