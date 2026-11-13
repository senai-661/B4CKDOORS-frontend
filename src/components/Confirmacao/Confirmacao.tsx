import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Caixa de confirmação própria do site.
 * Substitui o window.confirm() do navegador, que mostrava "localhost:5173 diz..." no topo da tela.
 */
interface OpcoesConfirmacao {
  titulo?: string;
  mensagem: string;
  confirmar?: string;
  cancelar?: string;
  perigo?: boolean;
}

type Confirmar = (opcoes: OpcoesConfirmacao | string) => Promise<boolean>;

const ConfirmacaoContext = createContext<Confirmar | null>(null);

export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao | null>(null);
  const [saindo, setSaindo] = useState(false);
  const resolver = useRef<(valor: boolean) => void>(() => {});
  const botaoConfirmar = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback<Confirmar>(entrada => {
    setSaindo(false);
    setOpcoes(typeof entrada === "string" ? { mensagem: entrada } : entrada);
    return new Promise<boolean>(resolve => { resolver.current = resolve; });
  }, []);

  function fechar(valor: boolean) {
    setSaindo(true);
    window.setTimeout(() => { setOpcoes(null); resolver.current(valor); }, 180);
  }

  useEffect(() => {
    if (!opcoes) return;
    botaoConfirmar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(false); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [opcoes]);

  return (
    <ConfirmacaoContext.Provider value={confirmar}>
      {children}
      {opcoes && (
        <div className={`confirm-overlay ${saindo ? "saindo" : ""}`} onClick={() => fechar(false)}>
          <div className="confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-titulo" onClick={e => e.stopPropagation()}>
            <div className={`confirm-icone ${opcoes.perigo ? "perigo" : ""}`}>{opcoes.perigo ? "!" : "?"}</div>
            <h3 id="confirm-titulo">{opcoes.titulo || "Confirmar ação"}</h3>
            <p>{opcoes.mensagem}</p>
            <div className="confirm-acoes">
              <button type="button" className="secondary" onClick={() => fechar(false)}>{opcoes.cancelar || "Cancelar"}</button>
              <button type="button" ref={botaoConfirmar} className={opcoes.perigo ? "danger-btn" : "primary"} onClick={() => fechar(true)}>{opcoes.confirmar || "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}
    </ConfirmacaoContext.Provider>
  );
}

export function useConfirmacao(): Confirmar {
  const ctx = useContext(ConfirmacaoContext);
  if (!ctx) throw new Error("useConfirmacao precisa estar dentro de <ConfirmacaoProvider>");
  return ctx;
}
