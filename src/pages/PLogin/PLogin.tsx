import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthRequests from "../../fetch/AuthRequests";
import { api } from "../../api";
import grenaLogo from "../../assets/grena-logo.png";
import grenaMascote from "../../assets/grena-mascote.png";

// ─── Máscara de CPF (CORRIGIDO) ──────────────────────────────
function formatarCPF(valor: string): string {
  return valor
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function validarCPF(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, "");
  return numeros.length === 11;
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function PLogin() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "cadastro">("login");

  // login
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // cadastro
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [senhaCadastro, setSenhaCadastro] = useState("");

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (!validarEmail(email)) {
      setErro("Informe um e-mail válido.");
      return;
    }

    setCarregando(true);
    try {
      const usuario = await AuthRequests.login(email, senha);
      navigate(usuario.role === "admin" ? "/admin" : "/loja", { replace: true });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao fazer login.");
    } finally {
      setCarregando(false);
    }
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (!nome.trim()) { setErro("Informe seu nome completo."); return; }
    if (!validarEmail(emailCadastro)) { setErro("Informe um e-mail válido."); return; }
    if (!validarCPF(cpf)) { setErro("CPF inválido. Use o formato 000.000.000-00."); return; }
    if (senhaCadastro.length < 6) { setErro("A senha deve ter pelo menos 6 caracteres."); return; }

    setCarregando(true);
    try {
      await api.criar("usuarios", {
        nome: nome.trim(),
        email: emailCadastro.trim(),
        cpf: cpf.trim(),
        senha: senhaCadastro
      });
      const usuario = await AuthRequests.login(emailCadastro.trim(), senhaCadastro);
      navigate(usuario.role === "admin" ? "/admin" : "/loja", { replace: true });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao cadastrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={grenaLogo} alt="Logo GRENÁ" />
          <strong>GRENÁ</strong>
        </div>

        <div className="login-tabs">
          <button className={modo === "login" ? "active" : ""} onClick={() => { setModo("login"); setErro(""); }}>Entrar</button>
          <button className={modo === "cadastro" ? "active" : ""} onClick={() => { setModo("cadastro"); setErro(""); }}>Criar conta</button>
        </div>

        {modo === "login" ? (
          <>
            <h1>Bem-vindo de volta</h1>
            <p className="login-subtitle">Clientes vão direto para a loja. Administradores acessam o painel de gestão.</p>
            <form onSubmit={entrar}>
              <label className="field">
                <span>E-mail</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" required />
              </label>
              <label className="field">
                <span>Senha</span>
                <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Sua senha" required />
              </label>
              {erro && <p className="login-erro">{erro}</p>}
              <button className="primary login-submit" type="submit" disabled={carregando}>
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1>Criar conta de cliente</h1>
            <p className="login-subtitle">Cadastre-se para comprar na loja GRENÁ.</p>
            <form onSubmit={cadastrar}>
              <label className="field">
                <span>Nome completo</span>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" required />
              </label>
              <label className="field">
                <span>E-mail</span>
                <input type="email" value={emailCadastro} onChange={e => setEmailCadastro(e.target.value)} placeholder="voce@email.com" required />
              </label>
              <label className="field">
                <span>CPF</span>
                <input
                  value={cpf}
                  onChange={e => setCpf(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
              </label>
              <label className="field">
                <span>Senha</span>
                <input type="password" value={senhaCadastro} onChange={e => setSenhaCadastro(e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </label>
              {erro && <p className="login-erro">{erro}</p>}
              <button className="primary login-submit" type="submit" disabled={carregando}>
                {carregando ? "Cadastrando..." : "Criar conta e entrar"}
              </button>
            </form>
          </>
        )}

        <p className="login-footer-link">
          <Link to="/loja">← Voltar para a loja</Link>
        </p>
      </div>

      <div className="login-visual">
        <img src={grenaMascote} alt="Mascote GRENÁ" />
      </div>
    </div>
  );
}

export default PLogin;
