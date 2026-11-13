import { useEffect, useState } from "react";

/**
 * Efeitos globais do site (montado uma vez no App):
 * - revela cards e blocos com animação quando entram na tela ao rolar;
 * - "onda" (ripple) ao clicar nos botões;
 * - inclinação 3D + brilho que segue o mouse nos cards de produto;
 * - menu compacto ao rolar e botão "voltar ao topo" com anel de progresso.
 */
const REVELAR = [
  ".produto-card:not(.skeleton-card)", ".produto-informacoes", ".produto-relacionados", ".avaliacoes-lista li",
  ".carrinho-item", ".carrinho-resumo", ".loja-rodape", ".rodape-coluna", ".panel", ".stat", ".perfil-page", "[data-revelar]",
].join(",");
const RIPPLE = ".primary, .secondary, .danger-btn, .loja-categorias button, .opcoes-botoes button, nav button, .nav-burger, .topo-btn";

function Efeitos() {
  const [mostrarTopo, setMostrarTopo] = useState(false);

  useEffect(() => {
    const raiz = document.documentElement;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---------- revelar ao rolar ----------
    let io: IntersectionObserver | null = null;
    let mo: MutationObserver | null = null;
    if (!reduzido && "IntersectionObserver" in window) {
      io = new IntersectionObserver((entradas) => {
        let n = 0;
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty("--rv-d", `${Math.min(n++, 8) * 70}ms`);
          el.classList.add("rv-in");
          io!.unobserve(el);
        }
      }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
      const marcar = (el: Element) => { if (el.classList.contains("rv-in")) return; el.classList.add("rv"); io!.observe(el); };
      const varrer = (no: ParentNode) => no.querySelectorAll(REVELAR).forEach(marcar);
      varrer(document);
      mo = new MutationObserver((muts) => {
        for (const m of muts) m.addedNodes.forEach((no) => {
          if (!(no instanceof HTMLElement)) return;
          if (no.matches(REVELAR)) marcar(no);
          varrer(no);
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }

    // ---------- ripple ----------
    const onda = (ev: PointerEvent) => {
      const alvo = (ev.target as HTMLElement | null)?.closest<HTMLElement>(RIPPLE);
      if (!alvo || reduzido) return;
      const r = alvo.getBoundingClientRect();
      const tam = Math.max(r.width, r.height) * 2;
      const s = document.createElement("span");
      s.className = "ripple";
      s.style.cssText = `width:${tam}px;height:${tam}px;left:${ev.clientX - r.left - tam / 2}px;top:${ev.clientY - r.top - tam / 2}px`;
      alvo.classList.add("tem-ripple");
      alvo.appendChild(s);
      window.setTimeout(() => s.remove(), 650);
    };

    // ---------- card 3D + brilho ----------
    let cardAtual: HTMLElement | null = null;
    const mover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || reduzido) return;
      const card = (ev.target as HTMLElement | null)?.closest<HTMLElement>(".produto-card:not(.skeleton-card)");
      if (cardAtual && cardAtual !== card) { cardAtual.style.removeProperty("--rx"); cardAtual.style.removeProperty("--ry"); }
      cardAtual = card ?? null;
      if (!card) return;
      const r = card.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      card.style.setProperty("--mx", `${x * 100}%`);
      card.style.setProperty("--my", `${y * 100}%`);
      card.style.setProperty("--rx", `${(0.5 - y) * 7}deg`);
      card.style.setProperty("--ry", `${(x - 0.5) * 9}deg`);
    };

    // ---------- rolagem ----------
    let raf = 0;
    const rolar = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = Math.max(1, raiz.scrollHeight - window.innerHeight);
        raiz.classList.toggle("rolou", y > 24);
        raiz.style.setProperty("--rolagem", String(Math.min(1, y / max)));
        setMostrarTopo(y > 700);
      });
    };

    document.addEventListener("pointerdown", onda);
    document.addEventListener("pointermove", mover, { passive: true });
    window.addEventListener("scroll", rolar, { passive: true });
    rolar();
    return () => {
      io?.disconnect(); mo?.disconnect();
      document.removeEventListener("pointerdown", onda);
      document.removeEventListener("pointermove", mover);
      window.removeEventListener("scroll", rolar);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <button
      type="button"
      className={`topo-btn ${mostrarTopo ? "visivel" : ""}`}
      aria-label="Voltar ao topo"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle className="topo-trilho" cx="24" cy="24" r="21" />
        <circle className="topo-anel" cx="24" cy="24" r="21" pathLength={100} />
      </svg>
      <span>↑</span>
    </button>
  );
}

export default Efeitos;
