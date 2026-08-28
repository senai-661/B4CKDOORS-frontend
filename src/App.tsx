import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CarrinhoProvider } from "./context/CarrinhoContext";
import ProtectedRoute from "./components/Rotas/ProtectedRoute";
import PLogin from "./pages/PLogin/PLogin";
import PLoja from "./pages/PLoja/PLoja";
import PCarrinho from "./pages/PCarrinho/PCarrinho";
import PAdmin from "./pages/PAdmin/PAdmin";

function App() {
  return (
    <CarrinhoProvider>
      <BrowserRouter>
        <Routes>
          {/* Loja pública: pode ser navegada sem login, como uma vitrine normal de e-commerce */}
          <Route path="/" element={<Navigate to="/loja" replace />} />
          <Route path="/loja" element={<PLoja />} />
          <Route path="/login" element={<PLogin />} />

          {/* Carrinho/checkout exige login (qualquer role autenticada) */}
          <Route path="/carrinho" element={<ProtectedRoute element={<PCarrinho />} />} />

          {/* Painel administrativo exige login com role "admin" */}
          <Route path="/admin" element={<ProtectedRoute element={<PAdmin />} allowedRoles={["admin"]} />} />

          <Route path="*" element={<Navigate to="/loja" replace />} />
        </Routes>
      </BrowserRouter>
    </CarrinhoProvider>
  );
}

export default App;
