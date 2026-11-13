import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation, useNavigationType, type Location } from "react-router-dom";
import grenaLogo from "../../assets/grena-logo.png";

/**
 * Transição entre páginas com "cortina" GRENÁ:
 * 1) faixas grená/dourado cruzam a tela e cobrem a página atual;
 * 2) a nova página é trocada por baixo (e a rolagem volta ao topo);
 * 3) as faixas saem pela direita revelando a nova página.
 * - ao VOLTAR (botão voltar do navegador) a cortina anda no sentido contrário;
 * - quem desativou animações no sistema (prefers-reduced-motion) vê só um fade suave, sem movimento;
 * - redirecionamentos automáticos (replace) trocam sem cortina.
 */
type Fase = "parado" | "cobrindo" | "revelando";
const COBRIR = 420;
const REVELAR = 620;
const COBRIR_SUAVE = 160;   // modo "movimento reduzido"
const REVELAR_SUAVE = 260;

const mesmaPagina = (a: Location, b: Location) => a.pathname === b.pathname && a.search === b.search;

function Transicao({ children }: { children: (location: Location) => ReactNode }) {
  const location = useLocation();
  const tipo = useNavigationType();
  const [atual, setAtual] = useState(location);
  const [fase, setFase] = useState<Fase>("parado");
  const alvo = useRef(location);
  const faseRef = useRef<Fase>("parado");
  const timers = useRef<number[]>([]);
  const [voltando, setVoltando] = useState(false);

  const mudarFase = (f: Fase) => { faseRef.current = f; setFase(f); };
  const limpar = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const topo = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

  useEffect(() => {
    alvo.current = location;
    if (mesmaPagina(location, atual) && faseRef.current === "parado") { setAtual(location); return; }
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (tipo === "REPLACE") { limpar(); setAtual(location); mudarFase("parado"); topo(); return; }
    if (faseRef.current === "cobrindo") return; // a troca pendente já vai usar o alvo mais recente
    limpar();
    setVoltando(tipo === "POP");
    const tCobrir = reduzido ? COBRIR_SUAVE : COBRIR;
    const tRevelar = reduzido ? REVELAR_SUAVE : REVELAR;
    mudarFase("cobrindo");
    timers.current.push(window.setTimeout(() => {
      setAtual(alvo.current);
      topo();
      mudarFase("revelando");
      timers.current.push(window.setTimeout(() => mudarFase("parado"), tRevelar));
    }, tCobrir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  useEffect(() => limpar, []);

  return (
    <>
      <div className={`rota-progresso ${fase}`} aria-hidden="true" />
      <div className={`cortina ${fase}${voltando ? " voltando" : ""}`} aria-hidden="true">
        <span className="cortina-faixa f1" />
        <span className="cortina-faixa f2" />
        <span className="cortina-faixa f3" />
        <div className="cortina-logo"><img src={grenaLogo} alt="" /><strong>GRENÁ</strong></div>
      </div>
      <div className={`page-transition fase-${fase}`} key={atual.pathname}>{children(atual)}</div>
    </>
  );
}

export default Transicao;
