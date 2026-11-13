import { Link } from "react-router-dom";

function Rodape() {
  const ano = new Date().getFullYear();
  return (
    <footer className="loja-rodape">
      <div className="rodape-marca-gigante" aria-hidden="true">GRENÁ</div>
      <div className="rodape-grade">
        <div className="rodape-coluna rodape-sobre">
          <strong>GRENÁ</strong>
          <p>Artigos esportivos para quem não para. Camisas de time, chuteiras, tênis e tudo para o seu treino.</p>
        </div>
        <div className="rodape-coluna">
          <h4>Loja</h4>
          <Link to="/loja">Camisas de time</Link>
          <Link to="/loja">Chuteiras e tênis</Link>
          <Link to="/loja">Roupas e acessórios</Link>
          <Link to="/carrinho">Meu carrinho</Link>
        </div>
        <div className="rodape-coluna">
          <h4>Vantagens</h4>
          <span>Frete grátis acima de R$ 199</span>
          <span>Troca grátis em 30 dias</span>
          <span>Até 6x sem juros</span>
        </div>
        <div className="rodape-coluna">
          <h4>Pagamento</h4>
          <div className="rodape-pagamentos"><span>Pix</span><span>Cartão</span><span>Boleto</span></div>
        </div>
      </div>
      <div className="rodape-base">
        <span className="loja-rodape-copy">© {ano} GRENÁ — Grupo B4ckdoors</span>
        <span className="loja-rodape-copy">Feito com garra ⚽</span>
      </div>
    </footer>
  );
}

export default Rodape;
