import { useEffect, useState } from "react";
import { getPerfil, atualizarPerfil } from "../../fetch/perfil";
import type { UserProfile } from "../../types";
import Navegacao from "../../components/Navegacao/Navegacao";
import Rodape from "../../components/Rodape/Rodape";
import { useCarrinho } from "../../context/CarrinhoContext";
import "./Perfil.css";

export default function Perfil() {
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserProfile | null>(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const { quantidadeTotal } = useCarrinho();

  useEffect(() => {
    async function carregarPerfil() {
      try {
        setErro("");

        const data = await getPerfil();

        setPerfil(data);
        setForm(data);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar seu perfil.");
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, []);

  function handleChange(campo: keyof UserProfile, valor: string) {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            [campo]: valor,
          }
        : prev
    );
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();

    if (!form) return;

    try {
      setSalvando(true);
      setErro("");
      setSucesso("");

      const atualizado = await atualizarPerfil(form);

      setPerfil(atualizado);
      setForm(atualizado);

      setEditando(false);
      setSucesso("Perfil atualizado com sucesso.");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSalvando(false);
    }
  }

  function cancelarEdicao() {
    setForm(perfil);
    setEditando(false);
    setErro("");
  }

  if (carregando) {
    return (
      <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />
      <div className="perfil-page">
        <p className="perfil-hint">Carregando perfil...</p>
      </div>
      </div>
    );
  }

  if (erro && !perfil) {
    return (
      <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />
      <div className="perfil-page">
        <p className="perfil-erro">{erro}</p>
      </div>
      </div>
    );
  }

  if (!perfil || !form) return null;

  return (
    <div className="loja-page">
      <Navegacao cartCount={quantidadeTotal} />
      <div className="perfil-page">

      <div className="perfil-container">

        <div className="perfil-header">
          <div className="perfil-avatar">
            {perfil.nome.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1>Meu Perfil</h1>
            <p>Gerencie suas informações pessoais</p>
          </div>
        </div>

        {erro && (
          <p className="perfil-erro">
            {erro}
          </p>
        )}

        {sucesso && <p className="perfil-sucesso">{sucesso}</p>}

        {!editando ? (

          <div className="perfil-view">

            <div className="perfil-info">
              <span>Nome</span>
              <p>{perfil.nome}</p>
            </div>

            <div className="perfil-info">
              <span>E-mail</span>
              <p>{perfil.email}</p>
            </div>

            {perfil.cpf && (
              <div className="perfil-info">
                <span>CPF</span>
                <p>{perfil.cpf}</p>
              </div>
            )}

            <div className="perfil-info">
              <span>Tipo de conta</span>
              <p>{perfil.role === "admin" ? "Administrador" : "Cliente"}</p>
            </div>

            <button
              className="btn-editar"
              onClick={() => { setEditando(true); setSucesso(""); }}
            >
              Editar perfil
            </button>

          </div>

        ) : (

          <form
            className="perfil-form"
            onSubmit={handleSalvar}
          >

            <label>
              Nome

              <input
                value={form.nome}
                onChange={(e) =>
                  handleChange("nome", e.target.value)
                }
                required
              />
            </label>

            <label>
              E-mail

              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  handleChange("email", e.target.value)
                }
                required
              />
            </label>

            <label>
              CPF

              <input
                value={form.cpf ?? ""}
                onChange={(e) =>
                  handleChange("cpf", e.target.value)
                }
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </label>

            <div className="perfil-acoes">

              <button
                className="btn-salvar"
                type="submit"
                disabled={salvando}
              >
                {salvando
                  ? "Salvando..."
                  : "Salvar alterações"}
              </button>

              <button
                className="btn-cancelar"
                type="button"
                onClick={cancelarEdicao}
                disabled={salvando}
              >
                Cancelar
              </button>

            </div>

          </form>

        )}

      </div>

    </div>
      <Rodape />
    </div>
  );
}