import { Link, useNavigate } from "react-router-dom";
import AuthRequests from "../../fetch/AuthRequests";
import grenaLogo from "../../assets/grena-logo.png";

interface NavegacaoProps {
  cartCount?: number;
}

function Navegacao({ cartCount = 0 }: NavegacaoProps) {
  const navigate = useNavigate();
  const autenticado = AuthRequests.isAuthenticated();
  const role = AuthRequests.getRole();
  const nome = AuthRequests.getNome();

  function sair() {
    AuthRequests.logout(false);
    navigate("/login");
  }

  return (
    <header className="loja-nav">
      <Link to="/loja" className="loja-nav-brand">
        <img src={grenaLogo} alt="Logo GRENÁ" />
        <span>GRENÁ</span>
      </Link>

      <nav className="loja-nav-links">
        <Link to="/loja">Loja</Link>
        <Link to="/carrinho" className="loja-nav-cart">
          Carrinho{cartCount > 0 && <span className="loja-cart-badge">{cartCount}</span>}
        </Link>
        {role === "admin" && <Link to="/admin">Painel admin</Link>}
      </nav>

      <div className="loja-nav-user">
        {autenticado ? (
          <>
            <span className="loja-nav-hello">Olá, {nome.split(" ")[0]}</span>
            <button className="secondary" onClick={sair}>Sair</button>
          </>
        ) : (
          <Link className="primary" to="/login">Entrar</Link>
        )}
      </div>
    </header>
  );
}

export default Navegacao;
