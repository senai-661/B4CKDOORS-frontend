import { useEffect, useRef } from "react";

/** Fogos de artifício em canvas, usados na tela de compra concluída. */
const CORES = ["#f4d9a0", "#d5a24a", "#ef6f92", "#b52b4a", "#66e3ad", "#ffffff", "#ffb36b"];

interface Particula { x: number; y: number; vx: number; vy: number; vida: number; max: number; cor: string; tam: number; }
interface Foguete { x: number; y: number; vy: number; alvo: number; cor: string; }

function Fogos({ duracao = 6500 }: { duracao?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let largura = 0, altura = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function redimensionar() {
      largura = canvas!.clientWidth; altura = canvas!.clientHeight;
      canvas!.width = largura * dpr; canvas!.height = altura * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    redimensionar();
    window.addEventListener("resize", redimensionar);

    const particulas: Particula[] = [];
    const foguetes: Foguete[] = [];
    const inicio = performance.now();
    let ultimoLancamento = 0;
    let quadro = 0;

    function explodir(x: number, y: number, cor: string) {
      const qtd = reduzir ? 30 : 70;
      for (let i = 0; i < qtd; i++) {
        const angulo = (Math.PI * 2 * i) / qtd + Math.random() * 0.2;
        const vel = 1.5 + Math.random() * 3.6;
        particulas.push({ x, y, vx: Math.cos(angulo) * vel, vy: Math.sin(angulo) * vel, vida: 0, max: 55 + Math.random() * 35, cor: Math.random() < 0.25 ? "#ffffff" : cor, tam: 1.4 + Math.random() * 1.8 });
      }
    }

    function lancar() {
      foguetes.push({ x: largura * (0.15 + Math.random() * 0.7), y: altura, vy: -(7 + Math.random() * 3.5), alvo: altura * (0.15 + Math.random() * 0.3), cor: CORES[Math.floor(Math.random() * CORES.length)] });
    }

    function animar(agora: number) {
      const passou = agora - inicio;
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = "rgba(0,0,0,0.22)";
      ctx!.fillRect(0, 0, largura, altura);
      ctx!.globalCompositeOperation = "lighter";

      if (passou < duracao && agora - ultimoLancamento > (reduzir ? 900 : 380)) {
        lancar(); if (Math.random() < 0.4) lancar();
        ultimoLancamento = agora;
      }

      for (let i = foguetes.length - 1; i >= 0; i--) {
        const f = foguetes[i];
        f.y += f.vy; f.vy += 0.06;
        ctx!.fillStyle = f.cor;
        ctx!.beginPath(); ctx!.arc(f.x, f.y, 2.4, 0, Math.PI * 2); ctx!.fill();
        if (f.y <= f.alvo || f.vy >= 0) { explodir(f.x, f.y, f.cor); foguetes.splice(i, 1); }
      }

      for (let i = particulas.length - 1; i >= 0; i--) {
        const p = particulas[i];
        p.vida++; p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.985;
        const alpha = 1 - p.vida / p.max;
        if (alpha <= 0) { particulas.splice(i, 1); continue; }
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.cor;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.tam, 0, Math.PI * 2); ctx!.fill();
        ctx!.globalAlpha = 1;
      }

      if (passou < duracao + 2500 || particulas.length || foguetes.length) quadro = requestAnimationFrame(animar);
    }
    quadro = requestAnimationFrame(animar);

    return () => { cancelAnimationFrame(quadro); window.removeEventListener("resize", redimensionar); };
  }, [duracao]);

  return <canvas ref={canvasRef} className="fogos-canvas" aria-hidden="true" />;
}

export default Fogos;
