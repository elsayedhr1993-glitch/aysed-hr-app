import React, { useEffect, useRef } from 'react';

export type BackgroundTheme = 'FOREST_VIDEO' | 'DIGITAL_NETWORK' | 'FLOWING_GRADIENT' | 'GEOMETRIC_WAVES' | 'STATIC';

interface BackgroundRendererProps {
  theme: BackgroundTheme;
  motionEnabled: boolean;
}

export const BackgroundRenderer: React.FC<BackgroundRendererProps> = ({ theme, motionEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Digital Network Canvas animation
  useEffect(() => {
    if (theme !== 'DIGITAL_NETWORK' || !motionEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{ x: number; y: number; vx: number; vy: number; radius: number }> = [];
    const count = Math.floor((width * height) / 25000);

    for (let i = 0; i < Math.min(count, 60); i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2 + 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(113, 75, 103, 0.15)';
      ctx.strokeStyle = 'rgba(113, 75, 103, 0.08)';
      ctx.lineWidth = 1;

      particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(113, 75, 103, 0.35)';
        ctx.fill();

        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(113, 75, 103, ${0.15 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme, motionEnabled]);

  return (
    <div className="absolute inset-0 z-[-1] pointer-events-none overflow-hidden bg-slate-900">
      {/* 1. Forest Video Theme */}
      {theme === 'FOREST_VIDEO' && (
        <>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2560&auto=format&fit=crop')] bg-cover bg-center opacity-70 md:opacity-0 transition-opacity duration-1000"></div>
          {motionEnabled && (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline 
              className="hidden md:block absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-700"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4" type="video/mp4" />
            </video>)}
        </>)}

      {/* 2. Digital Network Theme */}
      {theme === 'DIGITAL_NETWORK' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#2d1b28] to-slate-950">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-85" />
        </div>)}

      {/* 3. Flowing Gradient Aurora Theme */}
      {theme === 'FLOWING_GRADIENT' && (
        <div className={`absolute inset-0 bg-gradient-to-br from-indigo-950 via-[#45233c] to-slate-900 ${motionEnabled ? 'animate-pulse' : ''} duration-10000`}>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-ping duration-7000"></div>
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-indigo-600/15 rounded-full blur-3xl"></div>
        </div>)}

      {/* 4. Geometric Waves Theme */}
      {theme === 'GEOMETRIC_WAVES' && (
        <div className="absolute inset-0 bg-slate-950 overflow-hidden">
          <svg className={`absolute w-full h-full opacity-30 ${motionEnabled ? 'animate-pulse' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900">
            <path fill="#714B67" fillOpacity="0.4" d="M0,320L48,341.3C96,363,192,405,288,394.7C384,384,480,320,576,293.3C672,267,768,277,864,298.7C960,320,1056,352,1152,341.3C1248,331,1344,277,1392,250.7L1440,224L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
            <path fill="#3b2035" fillOpacity="0.6" d="M0,192L48,208C96,224,192,256,288,245.3C384,235,480,181,576,160C672,139,768,149,864,181.3C960,213,1056,267,1152,272C1248,277,1344,235,1392,213.3L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>)}

      {/* 5. Static Clean Theme */}
      {theme === 'STATIC' && (
        <div className="absolute inset-0 bg-slate-900"></div>)}

      {/* Frosted Soft Overlay for Glassmorphism readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-slate-50/55 backdrop-blur-[3px]"></div>
    </div>);
};
