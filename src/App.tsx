import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom";
import {CarrinhoProvider} from "./context/CarrinhoContext";
import ProtectedRoute from "./components/Rotas/ProtectedRoute";
import { ConfirmacaoProvider } from "./components/Confirmacao/Confirmacao";
import Transicao from "./components/Transicao/Transicao";
import Efeitos from "./components/Efeitos/Efeitos";
import PLogin from "./pages/PLogin/PLogin";import PLoja from "./pages/PLoja/PLoja";import PCarrinho from "./pages/PCarrinho/PCarrinho";import PAdmin from "./pages/PAdmin/PAdmin";import PPagamento from "./pages/PPagamento/PPagamento";import PPerfil from "./pages/PPerfil/PPerfil";import PProduto from "./pages/PProduto/PProduto";
function App(){return <CarrinhoProvider><ConfirmacaoProvider><BrowserRouter><Efeitos/><Transicao>{(location)=><Routes location={location}><Route path="/" element={<Navigate to="/loja" replace/>}/><Route path="/loja" element={<PLoja/>}/><Route path="/produto/:idProduto" element={<PProduto/>}/><Route path="/login" element={<PLogin/>}/><Route path="/perfil" element={<ProtectedRoute element={<PPerfil/>}/>}/><Route path="/carrinho" element={<ProtectedRoute element={<PCarrinho/>}/>}/><Route path="/pagamento" element={<ProtectedRoute element={<PPagamento/>}/>}/><Route path="/admin" element={<ProtectedRoute element={<PAdmin/>} allowedRoles={["admin"]}/>}/><Route path="*" element={<Navigate to="/loja" replace/>}/></Routes>}</Transicao></BrowserRouter></ConfirmacaoProvider></CarrinhoProvider>}
export default App;
