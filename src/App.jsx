import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RotaProtegida from './components/RotaProtegida.jsx';
import { useAuth } from './hooks/useAuth.jsx';

import Login from './pages/Login.jsx';
import PrimeiroAcesso from './pages/PrimeiroAcesso.jsx';
import NaoAutorizado from './pages/NaoAutorizado.jsx';
import EnviarInformativo from './pages/EnviarInformativo.jsx';
import MeusEnvios from './pages/MeusEnvios.jsx';
import MeuCadastro from './pages/MeuCadastro.jsx';
import Programacao from './pages/Programacao.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Informativos from './pages/Informativos.jsx';
import DetalheInformativo from './pages/DetalheInformativo.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Configuracoes from './pages/Configuracoes.jsx';
import Relatorio from './pages/Relatorio.jsx';
import PadroesMidia from './pages/PadroesMidia.jsx';
import Privacidade from './pages/Privacidade.jsx';
import PoliticaConteudo from './pages/PoliticaConteudo.jsx';
import Manutencao from './pages/Manutencao.jsx';
import NaoEncontrado from './pages/NaoEncontrado.jsx';

export default function App() {
  const { isAdmin, autorizado } = useAuth();

  return (
    <Routes>
      {/* Publicas */}
      <Route path="/entrar" element={<Login />} />
      <Route path="/acesso-negado" element={<NaoAutorizado />} />
      <Route path="/primeiro-acesso" element={<PrimeiroAcesso />} />
      <Route path="/manutencao" element={<Manutencao />} />
      <Route path="/padroes" element={<PadroesMidia />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/politica" element={<PoliticaConteudo />} />

      {/* Autenticadas */}
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/enviar" element={<EnviarInformativo />} />
        <Route path="/meus-envios" element={<MeusEnvios />} />
        <Route path="/meu-cadastro" element={<MeuCadastro />} />
        <Route path="/informativos/:id" element={<DetalheInformativo />} />
      </Route>

      {/* Somente admin */}
      <Route
        element={
          <RotaProtegida exigeAdmin>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/programacao" element={<Programacao />} />
        <Route path="/painel" element={<Dashboard />} />
        <Route path="/informativos" element={<Informativos />} />
        <Route path="/relatorio" element={<Relatorio />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      <Route
        path="/"
        element={
          <Navigate to={autorizado ? (isAdmin ? '/programacao' : '/enviar') : '/entrar'} replace />
        }
      />
      <Route path="*" element={<NaoEncontrado />} />
    </Routes>
  );
}
