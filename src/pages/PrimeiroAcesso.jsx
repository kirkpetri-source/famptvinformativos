import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { criarCadastro } from '../services/auth.js';
import { useToast } from '../hooks/useToast.jsx';
import { mascararWhatsapp, whatsappValido, apenasDigitos } from '../utils/arquivos.js';
import Carregando from '../components/Carregando.jsx';
import Porta from '../components/Porta.jsx';

export default function PrimeiroAcesso() {
  const { carregando, user, acesso, cadastro, isAdmin, recarregarCadastro } = useAuth();
  const navegar = useNavigate();
  const toast = useToast();

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [aceites, setAceites] = useState({ lgpd: false, politica: false });
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  if (carregando) return <Carregando />;
  if (!user) return <Navigate to="/entrar" replace />;
  if (acesso?.recusa) return <Navigate to="/acesso-negado" replace />;
  if (cadastro) return <Navigate to={isAdmin ? '/programacao' : '/enviar'} replace />;

  // Nome do Google como ponto de partida, editavel.
  if (!iniciado) {
    setNome(user.displayName || '');
    setIniciado(true);
  }

  function validar() {
    const novos = {};
    if (nome.trim().length < 5) novos.nome = 'Informe seu nome completo.';
    if (!cargo.trim()) novos.cargo = 'Informe seu cargo ou função.';
    else if (cargo.trim().length > 60) novos.cargo = 'Máximo de 60 caracteres.';
    if (!whatsappValido(whatsapp)) novos.whatsapp = 'Informe um número com DDD.';
    if (!aceites.lgpd) novos.lgpd = 'É necessário aceitar para continuar.';
    if (!aceites.politica) novos.politica = 'É necessário aceitar para continuar.';
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (!validar()) return;

    setSalvando(true);
    try {
      await criarCadastro(user, {
        nome,
        cargo,
        whatsapp: apenasDigitos(whatsapp),
      });
      await recarregarCadastro();
      navegar(isAdmin ? '/programacao' : '/enviar', { replace: true });
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível salvar o cadastro. Tente de novo.');
      setSalvando(false);
    }
  }

  return (
    <Porta>
      <div className="linha mb-6">
        {user.photoURL ? (
          <img src={user.photoURL} alt="" style={{ width: 44, height: 44, borderRadius: 999 }} />
        ) : null}
        <div>
          <h1 className="porta__titulo">
            Olá, {(user.displayName || '').split(' ')[0]}
          </h1>
          <p className="meta meta--nao-caixa">{acesso.email}</p>
        </div>
      </div>

      <p className="porta__nota mb-8">
        Complete seu cadastro para enviar informativos. Estes dados identificam quem enviou
        cada material.
      </p>

      <form onSubmit={enviar} noValidate>
          <div className="campo">
            <label className="rotulo" htmlFor="nome">
              Nome completo
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={Boolean(erros.nome)}
              autoComplete="name"
            />
            {erros.nome ? <p className="campo__erro">{erros.nome}</p> : null}
          </div>

          <div className="campo">
            <label className="rotulo" htmlFor="cargo">
              Cargo ou função
            </label>
            <input
              id="cargo"
              type="text"
              value={cargo}
              maxLength={60}
              placeholder="Coordenadora de Enfermagem"
              onChange={(e) => setCargo(e.target.value)}
              aria-invalid={Boolean(erros.cargo)}
            />
            {erros.cargo ? <p className="campo__erro">{erros.cargo}</p> : null}
          </div>

          <div className="campo">
            <label className="rotulo" htmlFor="whatsapp">
              WhatsApp
            </label>
            <input
              id="whatsapp"
              type="tel"
              inputMode="numeric"
              value={whatsapp}
              placeholder="(64) 99999-9999"
              onChange={(e) => setWhatsapp(mascararWhatsapp(e.target.value))}
              aria-invalid={Boolean(erros.whatsapp)}
              autoComplete="tel"
            />
            {erros.whatsapp ? <p className="campo__erro">{erros.whatsapp}</p> : null}
          </div>

          <div className="coluna mb-6">
            <label className={`declaracao ${aceites.lgpd ? 'declaracao--marcada' : ''}`}>
              <input
                type="checkbox"
                checked={aceites.lgpd}
                onChange={(e) => setAceites({ ...aceites, lgpd: e.target.checked })}
              />
              <span>
                Li e aceito o tratamento dos meus dados conforme a{' '}
                <Link to="/privacidade" target="_blank" className="btn--texto">
                  política de privacidade
                </Link>
                .
              </span>
            </label>
            {erros.lgpd ? <p className="campo__erro">{erros.lgpd}</p> : null}

            <label className={`declaracao ${aceites.politica ? 'declaracao--marcada' : ''}`}>
              <input
                type="checkbox"
                checked={aceites.politica}
                onChange={(e) => setAceites({ ...aceites, politica: e.target.checked })}
              />
              <span>
                Li e aceito a{' '}
                <Link to="/politica" target="_blank" className="btn--texto">
                  política de conteúdo
                </Link>{' '}
                das TVs do campus.
              </span>
            </label>
            {erros.politica ? <p className="campo__erro">{erros.politica}</p> : null}
          </div>

        <button
          type="submit"
          className="btn btn--primario btn--grande btn--bloco"
          disabled={salvando}
        >
          {salvando ? 'Salvando…' : 'Continuar'}
        </button>
      </form>
    </Porta>
  );
}
