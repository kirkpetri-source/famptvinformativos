import { useEffect, useState, useCallback } from 'react';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import EstadoVazio from '../components/EstadoVazio.jsx';
import { ListaSkeleton } from '../components/Carregando.jsx';
import { listarAcessos, adicionarAutorizado, alterarAcesso } from '../services/usuarios.js';
import { sincronizarAcesso } from '../services/api.js';
import { dominioPermitido, ehContaDeTeste, DOMINIO_INSTITUCIONAL } from '../utils/dominio.js';
import { formatarDataHora } from '../utils/datas.js';
import { mascararWhatsapp } from '../utils/arquivos.js';

export default function Usuarios() {
  const { acesso } = useAuth();
  const toast = useToast();

  const [acessos, setAcessos] = useState(null);
  const [novo, setNovo] = useState({ email: '', perfil: 'colaborador' });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setAcessos(await listarAcessos());
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível carregar a lista de acessos.');
      setAcessos([]);
    }
  }, [toast]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function adicionar(evento) {
    evento.preventDefault();
    setErro(null);

    if (!dominioPermitido(novo.email)) {
      setErro(
        `O sistema aceita apenas e-mails ${DOMINIO_INSTITUCIONAL}. A regra de segurança também recusa qualquer outro.`
      );
      return;
    }

    setSalvando(true);
    try {
      await adicionarAutorizado(novo.email, novo.perfil, acesso.email);
      try {
        await sincronizarAcesso(novo.email);
      } catch (e) {
        console.error('Sincronização do perfil no token falhou:', e);
      }
      toast.sucesso('Acesso liberado.');
      setNovo({ email: '', perfil: 'colaborador' });
      carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function alterar(item, mudanca) {
    try {
      await alterarAcesso(item.email, mudanca);

      // O perfil precisa chegar ao token: as regras do Storage leem de la, nao
      // do Firestore. Falhar aqui nao desfaz a alteracao — o cron reconcilia.
      try {
        await sincronizarAcesso(item.email);
      } catch (e) {
        console.error('Sincronização do perfil no token falhou:', e);
      }

      toast.sucesso('Acesso atualizado.');
      carregar();
    } catch (e) {
      console.error(e);
      toast.erro('Não foi possível alterar o acesso.');
    }
  }

  return (
    <>
      <div className="cabecalho-secao">
        <h1>Acessos</h1>
        <span className="meta">{acessos?.length ?? 0} pessoas</span>
      </div>

      <form onSubmit={adicionar} className="bloco mb-8">
        <h2 style={{ fontSize: 'var(--tipo-16)' }} className="mb-4">
          Liberar acesso
        </h2>

        <div className="linha linha--quebra" style={{ alignItems: 'flex-end' }}>
          <div className="crescer" style={{ minWidth: 240 }}>
            <label className="rotulo" htmlFor="email">
              E-mail institucional
            </label>
            <input
              id="email"
              type="email"
              value={novo.email}
              placeholder={`nome${DOMINIO_INSTITUCIONAL}`}
              onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              aria-invalid={Boolean(erro)}
            />
          </div>

          <div>
            <label className="rotulo" htmlFor="perfil">
              Perfil
            </label>
            <select
              id="perfil"
              value={novo.perfil}
              onChange={(e) => setNovo({ ...novo, perfil: e.target.value })}
              style={{ width: 'auto' }}
            >
              <option value="colaborador">Colaborador</option>
              <option value="admin">Administração</option>
            </select>
          </div>

          <button type="submit" className="btn btn--primario" disabled={salvando || !novo.email}>
            <UserPlus size={16} />
            Liberar
          </button>
        </div>

        {erro ? <p className="campo__erro mt-2">{erro}</p> : null}

        <p className="secundario mt-4">
          A pessoa completa o cadastro no primeiro acesso. Enquanto isso, o nome aparece
          vazio na lista.
        </p>
      </form>

      {acessos === null ? (
        <ListaSkeleton itens={4} />
      ) : acessos.length === 0 ? (
        <EstadoVazio mensagem="Nenhum acesso liberado ainda." />
      ) : (
        <div className="lista-regua">
          {acessos.map((item) => {
            const euMesmo = item.email === acesso.email;
            return (
              <article key={item.id} className="item">
                <div className="item__corpo">
                  <div className="linha linha--quebra" style={{ gap: 'var(--e-2)' }}>
                    <span className={`badge ${item.perfil === 'admin' ? 'badge--aprovado' : 'badge--neutro'}`}>
                      {item.perfil === 'admin' ? 'Administração' : 'Colaborador'}
                    </span>
                    {!item.ativo ? <span className="badge badge--cancelado">Desativado</span> : null}
                    {/* Conta de teste nao pode passar batida ate a entrega. */}
                    {ehContaDeTeste(item.email) ? (
                      <span className="badge badge--rejeitado">Conta de teste</span>
                    ) : null}
                    {euMesmo ? <span className="meta">você</span> : null}
                  </div>

                  <h3 className="item__titulo">{item.cadastro?.nome || item.email}</h3>

                  <div className="linha linha--quebra">
                    {item.cadastro?.cargo ? (
                      <span className="meta meta--nao-caixa">{item.cadastro.cargo}</span>
                    ) : (
                      <span className="meta">cadastro não concluído</span>
                    )}
                    <span className="meta meta--nao-caixa">{item.email}</span>
                    {item.cadastro?.whatsapp ? (
                      <span className="meta meta--nao-caixa">
                        {mascararWhatsapp(item.cadastro.whatsapp)}
                      </span>
                    ) : null}
                    {item.cadastro?.ultimoLogin ? (
                      <span className="meta">
                        último acesso {formatarDataHora(item.cadastro.ultimoLogin)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="item__acoes">
                  {/* Um admin nao pode se rebaixar nem se desativar — a regra
                      tambem impede, isto aqui so evita o clique inutil. */}
                  <select
                    value={item.perfil}
                    disabled={euMesmo}
                    onChange={(e) => alterar(item, { perfil: e.target.value })}
                    aria-label={`Perfil de ${item.email}`}
                    style={{ width: 'auto', minHeight: 32 }}
                  >
                    <option value="colaborador">Colaborador</option>
                    <option value="admin">Administração</option>
                  </select>

                  <button
                    type="button"
                    className={`btn ${item.ativo ? 'btn--perigo' : 'btn--secundario'}`}
                    disabled={euMesmo}
                    onClick={() => alterar(item, { ativo: !item.ativo })}
                    style={{ minHeight: 32 }}
                  >
                    {item.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="secundario mt-8">
        Acesso é desativado, nunca apagado: o histórico de envios precisa continuar
        rastreável para a auditoria.
      </p>
    </>
  );
}
