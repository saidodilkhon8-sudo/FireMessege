import React, { useEffect, useRef } from 'react';
import { Shield, Zap, Video, Radio, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { Language } from '../../types';
import { getTranslation } from '../../i18n';
import { PWAInstallButton } from '../PWA/PWAInstallButton';
import { sound } from '../../utils/sound';

interface LandingPageProps {
  lang: Language;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onSelectLang: (lang: Language) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onOpenAuth,
  onSelectLang,
}) => {
  const t = getTranslation(lang);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Futuristic 3D Geometric Crystal & Particle Network in pure monochrome
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // 3D Nodes of an Icosahedron / Faceted Crystal
    const phi = (1 + Math.sqrt(5)) / 2;
    const baseVertices = [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ];

    // Background floating particles
    const particleCount = 45;
    const particles = Array.from({ length: particleCount }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 600,
      z: Math.random() * 600 - 300,
      size: Math.random() * 2 + 1,
      speedZ: Math.random() * 0.8 + 0.2,
    }));

    let angleX = 0;
    let angleY = 0;
    let targetAngleX = 0;
    let targetAngleY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      targetAngleY = nx * 1.5;
      targetAngleX = -ny * 1.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // Smooth camera interpolation
      angleX += (targetAngleX - angleX) * 0.05 + 0.003;
      angleY += (targetAngleY - angleY) * 0.05 + 0.005;

      const fov = 400;
      const centerX = width / 2;
      const centerY = height / 2;
      const scale = Math.min(width, height) * 0.24;

      // Draw background particles
      ctx.fillStyle = '#8A8A8A';
      particles.forEach((p) => {
        p.z -= p.speedZ;
        if (p.z < -200) p.z = 400;

        const pScale = fov / (fov + p.z + 300);
        const px = centerX + p.x * pScale;
        const py = centerY + p.y * pScale;
        const alpha = Math.max(0, Math.min(1, (p.z + 200) / 400)) * 0.4;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size * pScale, 0, Math.PI * 2);
        ctx.fill();
      });

      // Rotate & project 3D crystal vertices
      const projected = baseVertices.map(([x, y, z]) => {
        // Rotate around Y
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        const x1 = x * cosY - z * sinY;
        const z1 = z * cosY + x * sinY;

        // Rotate around X
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = z1 * cosX + y * sinX;

        const distance = fov + z2 * scale + 400;
        const projScale = fov / Math.max(distance, 10);
        return {
          x: centerX + x1 * scale * projScale,
          y: centerY + y2 * scale * projScale,
          z: z2,
        };
      });

      // Draw connecting edges
      ctx.lineWidth = 1.2;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = baseVertices[i][0] - baseVertices[j][0];
          const dy = baseVertices[i][1] - baseVertices[j][1];
          const dz = baseVertices[i][2] - baseVertices[j][2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // Standard icosahedron edge distance is 2
          if (dist < 2.1) {
            const avgZ = (projected[i].z + projected[j].z) / 2;
            const alpha = Math.max(0.12, Math.min(0.85, (avgZ + 1.5) / 3));

            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw vertices
      projected.forEach((p) => {
        const alpha = Math.max(0.2, Math.min(1, (p.z + 1.5) / 3));
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-black text-white flex flex-col selection:bg-white selection:text-black">
      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full border-b border-[#292929]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-black text-lg shadow-[0_0_20px_rgba(255,255,255,0.4)]">
            ⚡
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-wider text-white">FIREMESSAGE</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-[#181818] border border-[#292929] text-[#8A8A8A]">
              v2.0 PWA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="flex items-center rounded-lg bg-[#111111] border border-[#292929] p-0.5 text-xs font-mono">
            {(['ru', 'en', 'uz'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => {
                  sound.playClick();
                  onSelectLang(l);
                }}
                className={`px-2.5 py-1 rounded-md transition ${
                  lang === l
                    ? 'bg-white text-black font-bold'
                    : 'text-[#8A8A8A] hover:text-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <PWAInstallButton lang={lang} />

          <button
            onClick={() => {
              sound.playClick();
              onOpenAuth('signin');
            }}
            className="px-4 py-2 rounded-lg bg-[#181818] border border-[#292929] text-xs font-semibold text-white hover:border-white transition"
          >
            {t.signIn}
          </button>
        </div>
      </header>

      {/* Hero Section with 3D Canvas */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-12 pb-20 max-w-5xl mx-auto w-full">
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-70">
          <canvas ref={canvasRef} className="w-full h-full max-h-[640px]" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 max-w-3xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-[#292929] text-xs font-medium text-[#D0D0D0] mb-8 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Futuristic Glassmorphic PWA Messenger</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] mb-6 text-white drop-shadow-2xl">
            Общение без шума.
            <br />
            <span className="text-[#8A8A8A]">Абсолютный монохром.</span>
          </h1>

          <p className="text-base sm:text-lg text-[#8A8A8A] leading-relaxed max-w-2xl mb-10">
            {t.heroDesc}
          </p>

          {/* Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => {
                sound.playClick();
                onOpenAuth('signup');
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white text-black font-bold text-sm tracking-wide uppercase transition hover:opacity-90 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2.5"
            >
              <span>{t.getStarted}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onOpenAuth('signin');
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#111111] border border-[#292929] hover:border-white text-white font-semibold text-sm tracking-wide uppercase transition active:scale-95"
            >
              {t.signIn}
            </button>
          </div>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="relative z-20 px-6 py-16 border-t border-[#292929] bg-[#080808]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] hover:border-white/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-center text-white mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Supabase Realtime</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Мгновенная доставка сообщений, индикация набора текста и статусы прочтения без задержек.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] hover:border-white/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-center text-white mb-4">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">WebRTC Звонки</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Высококачественные 1-on-1 аудио- и видеозвонки со STUN-серверами, переключением камеры и отключением микрофона.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] hover:border-white/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-center text-white mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Row Level Security</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Защита на уровне PostgreSQL: пользователи видят и редактируют исключительно свои разрешённые данные.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] hover:border-white/40 transition">
            <div className="w-12 h-12 rounded-xl bg-[#181818] border border-[#292929] flex items-center justify-center text-white mb-4">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">PWA Автономность</h3>
            <p className="text-xs text-[#8A8A8A] leading-relaxed">
              Установка на рабочий стол Windows, Android и iOS с поддержкой автономного режима и Service Worker.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 px-6 py-8 border-t border-[#292929] text-center text-xs text-[#8A8A8A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-white" />
            <span>FireMessage — Zero-Telemetry Monochrome Messenger</span>
          </div>
          <div>© {new Date().getFullYear()} FireMessage Architecture. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
