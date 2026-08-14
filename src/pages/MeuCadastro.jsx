import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import { atualizarCadastro } from '../services/auth.js';
import { mascararWhatsapp, whatsappValido, apenasDigitos } from '../utils/arquivos.js';
import { formatarDataHora } from '../utils/datas.js';

export default function MeuCadastro() {
  const { user, cadastro, acesso, isAdmin, recarregarCadastro } = useAuth();
  const toast = useToast();

  const [nome, setNome] = useState(cadastro?.nome || '');
  const [cargo, setCargo] = useState(cadastro?.cargo || '');
  const [whatsapp, setWhatsapp] = useState(mascararWhatsapp(cadastro?.whatsapp || ''));
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento) {
    evento.preventDefault();

    const novos = {};
    if (nome.trim().length < 5) novos.nome = 'Informe seu nome completo.';
    if (!cargo.trim()) novos.cargo = 'Informe seu cargo ou função.';
    if (!whatsappValido(whatsapp)) novos.whatsapp = 'Informe um número com DDD.';
    setErros(novos);
    if (Object.keys(novos).length) return;

    setSalvando(true);
    try {
      await atualizarCadastro(user.uid, { nome, cargo, whatsapp: apenasDigitos(whatsapp) });
      await recarregarCadastro();
      toast.sucesso('Cadastro atualizado.');
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={salvar} className="container--estreito">
      <div className="cabecalho-secao">
        <h1>Meu cadastro</h1>
        <span className="badge badge--neutro">
          {isAdmin ? 'Administração' : 'Colaborador'}
        </span>
      </div>

      <div className="bloco">
        <div className="linha mb-6">
          {cadastro?.foto ? (
            <img src={cadastro.foto} alt="" style={{ width: 48, height: 48, borderRadius: 999 }} />
          ) : null}
          <div>
            <p className="meta meta--nao-caixa">{acesso?.email}</p>
            {cadastro?.primeiroLogin ? (
              <p className="meta">desde {formatarDataHora(cadastro.primeiroLogin)}</p>
            ) : null}
          </div>
        </div>

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
            maxLength={60}
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            aria-invalid={Boolean(erros.cargo)}
          />
          {erros.cargo ? <p className="campo__erro">{erros.cargo}</p> : null}
        </div>

        <div className="campo" style={{ marginBottom: 0 }}>
          <label className="rotulo" htmlFor="whatsapp">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            type="tel"
            inputMode="numeric"
            value={whatsapp}
            onChange={(e) => setWhatsapp(mascararWhatsapp(e.target.value))}
            aria-invalid={Boolean(erros.whatsapp)}
          />
          {erros.whatsapp ? <p className="campo__erro">{erros.whatsapp}</p> : null}
        </div>
      </div>

      <p className="secundario mt-4">
        A alteração vale para os próximos envios. Cada informativo já enviado guarda uma
        cópia dos seus dados no momento do envio — é isso que dá validade à auditoria.
      </p>

      <div className="linha mt-6">
        <button type="submit" className="btn btn--primario" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar alterações'}
        </button>
        <Link to="/privacidade" className="btn--texto">
          Como meus dados são tratados
        </Link>
      </div>
    </form>
  );
}
