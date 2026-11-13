import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import AuthRequests from "../../fetch/AuthRequests";
import grenaLogo from "../../assets/grena-logo.png";

interface Props { cartCount?: number; }
type Pos = { x: number; w: number };

// guarda a posição do indicador entre as páginas para ele "deslizar" até o novo link
let ultimaPos: Pos | null = null;
const AVISOS = ["Frete grátis acima de R$ 199", "Até 6x sem juros", "Troca grátis em 30 dias", "5% off no Pix", "Camisas oficiais dos maiores clubes"];

function Navegacao({ cartCount = 0 }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const autenticado = AuthRequests.isAuthenticated();
  const role = AuthRequests.getRole();
  const nome = AuthRequests.getNome() || "Cliente";
  const linksRef = useRef<HTMLElement>(null);
  const [ind, setInd] = useState<(Pos & { anim: boolean }) | null>(null);
  const [aberto, setAberto] = useState(false);

  function sair() { AuthRequests.logout(false); navigate("/login"); }

  const ativo = (to: string) => ({ isActive }: { isActive: boolean }) =>
    isActive || (to === "/loja" && location.pathname.startsWith("/produto")) ? "active" : "";

  useLayoutEffect(() => {
    const nav = linksRef.current;
    if (!nav) return;
    const medir = (): Pos | null => {
      const a = nav.querySelector<HTMLElement>("a.active");
      return a ? { x: a.offsetLeft, w: a.offsetWidth } : null;
    };
    const destino = medir();
    if (!destino) { setInd(null); ultimaPos = null; return; }
    let r1 = 0, r2 = 0;
    if (ultimaPos && (ultimaPos.x !== destino.x || ultimaPos.w !== destino.w)) {
      setInd({ ...ultimaPos, anim: false });
      r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setInd({ ...destino, anim: true })); });
    } else setInd({ ...destino, anim: false });
    ultimaPos = destino;
    const ajustar = () => { const p = medir(); if (p) { ultimaPos = p; setInd({ ...p, anim: false }); } };
    window.addEventListener("resize", ajustar);
    document.fonts?.ready.then(ajustar);
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); window.removeEventListener("resize", ajustar); };
  }, [location.pathname, autenticado, role]);

  useEffect(() => { document.body.classList.toggle("menu-aberto", aberto); return () => document.body.classList.remove("menu-aberto"); }, [aberto]);
  useEffect(() => { if (!aberto) return; const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false); window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, [aberto]);

  const links = (
    <>
      <NavLink to="/loja" className={ativo("/loja")} onClick={() => setAberto(false)}>Loja</NavLink>
      <NavLink to="/carrinho" className={(p) => `loja-nav-cart ${ativo("/carrinho")(p)}`} onClick={() => setAberto(false)}>
        Carrinho{cartCount > 0 && <span key={cartCount} className="loja-cart-badge">{cartCount}</span>}
      </NavLink>
      {autenticado && <NavLink to="/perfil" className={ativo("/perfil")} onClick={() => setAberto(false)}>Meu perfil</NavLink>}
      {role === "admin" && <NavLink to="/admin" className={ativo("/admin")} onClick={() => setAberto(false)}>Painel admin</NavLink>}
    </>
  );

  return (
    <>
      <div className="nav-ticker" aria-label="Vantagens GRENÁ">
        <div className="nav-ticker-trilho">
          {[...AVISOS, ...AVISOS].map((a, i) => <span key={i} aria-hidden={i >= AVISOS.length}>{a}</span>)}
        </div>
      </div>
      <header className="loja-nav">
        <Link to="/loja" className="loja-nav-brand"><img src={grenaLogo} alt="Logo GRENÁ" /><span>GRENÁ</span></Link>
        <nav className="loja-nav-links" ref={linksRef}>
          {ind && <span className={`nav-indicador ${ind.anim ? "anim" : ""}`} style={{ transform: `translateX(${ind.x}px)`, width: ind.w }} aria-hidden="true" />}
          {links}
        </nav>
        <div className="loja-nav-user">
          {autenticado
            ? <><span className="loja-nav-hello">Olá, <b>{nome.split(" ")[0]}</b></span><button className="secondary" onClick={sair}>Sair</button></>
            : <Link className="primary" to="/login">Entrar</Link>}
        </div>
        <button type="button" className={`nav-burger ${aberto ? "aberto" : ""}`} aria-label={aberto ? "Fechar menu" : "Abrir menu"} aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
          <span /><span /><span />
          {cartCount > 0 && !aberto && <i className="nav-burger-ponto" />}
        </button>
      </header>
      <div className={`nav-gaveta-fundo ${aberto ? "aberto" : ""}`} onClick={() => setAberto(false)} />
      <aside className={`nav-gaveta ${aberto ? "aberto" : ""}`} aria-hidden={!aberto}>
        <div className="nav-gaveta-topo"><img src={grenaLogo} alt="" /><strong>GRENÁ</strong></div>
        <nav className="nav-gaveta-links">{links}</nav>
        <div className="nav-gaveta-rodape">
          {autenticado
            ? <><span>Olá, <b>{nome.split(" ")[0]}</b></span><button className="secondary full" onClick={sair}>Sair</button></>
            : <Link className="primary full" to="/login" onClick={() => setAberto(false)}>Entrar</Link>}
        </div>
      </aside>
    </>
  );
}

export default Navegacao;
