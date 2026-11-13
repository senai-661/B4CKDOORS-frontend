import { useMemo, useState } from "react";

interface ImagemProdutoProps {
  nome: string;
  imagem?: string | null;
}

function ImagemProduto({ nome, imagem }: ImagemProdutoProps) {
  const imagemBanco = imagem?.trim() || "";

  // Se o banco ainda aponta para /produtos/*.webp e o arquivo não existe,
  // usamos uma busca por nome como fallback sem precisar de chave de API.
  const imagemBusca = useMemo(() => {
    const termo = encodeURIComponent(nome.trim());
    return `https://tse1.mm.bing.net/th?q=${termo}&w=600&h=600&c=7&rs=1&p=0`;
  }, [nome]);

  const [tentativa, setTentativa] = useState(0);

  const src = tentativa === 0 && imagemBanco ? imagemBanco : imagemBusca;

  return (
    <div className="produto-card-imagem">
      <img
        key={`${nome}-${tentativa}`}
        src={src}
        alt={nome}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(event) => {
          if (tentativa === 0 && imagemBanco) {
            setTentativa(1);
            return;
          }

          event.currentTarget.style.display = "none";

          const container = event.currentTarget.parentElement;
          if (container && !container.querySelector("span")) {
            const aviso = document.createElement("span");
            aviso.textContent = "Imagem indisponível";
            container.appendChild(aviso);
          }
        }}
      />
    </div>
  );
}

export default ImagemProduto;
