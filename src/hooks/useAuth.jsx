import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  observarSessao,
  resultadoDoRedirect,
  resolverAcesso,
  buscarCadastro,
  registrarUltimoLogin,
  sair as sairDaConta,
} from '../services/auth.js';

const ContextoAuth = createContext(null);

/**
 * Sessao do usuario.
 *
 * O perfil NUNCA vem da colecao `usuarios` — vem de `usuarios_autorizados`,
 * que so o admin escreve. E o que impede um colaborador de se promover.
 */
export function ProvedorAuth({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [user, setUser] = useState(null);
  const [acesso, setAcesso] = useState(null); // { recusa, email, perfil }
  const [cadastro, setCadastro] = useState(null);
  const [falhaInfra, setFalhaInfra] = useState(false);
  const [erroLogin, setErroLogin] = useState(null);

  const recarregarCadastro = useCallback(async () => {
    if (!user) return;
    setCadastro(await buscarCadastro(user.uid));
  }, [user]);

  // Conclui o login por redirect (celular). Sem isto, um redirect que falhou do
  // lado do Google devolve o usuario para a tela de entrar sem dizer por que.
  useEffect(() => {
    resultadoDoRedirect().catch((erro) => {
      console.error('Falha ao concluir o login por redirect:', erro?.code, erro);
      setErroLogin(erro);
    });
  }, []);

  useEffect(() => {
    return observarSessao(async (usuarioFirebase) => {
      setUser(usuarioFirebase);

      if (!usuarioFirebase) {
        setAcesso(null);
        setCadastro(null);
        setCarregando(false);
        return;
      }

      try {
        // Forca a renovacao do token para trazer o perfil atualizado.
        // As regras do Storage leem o perfil do token, nao do Firestore: sem
        // isto, quem acabou de ser promovido a admin nao conseguiria abrir a
        // midia dos outros ate o token expirar sozinho.
        try {
          await usuarioFirebase.getIdToken(true);
        } catch {
          // Token revogado (rebaixamento): o SDK encerra a sessao sozinho.
        }

        const resultado = await resolverAcesso(usuarioFirebase);
        setAcesso(resultado);

        if (!resultado.recusa) {
          const doc = await buscarCadastro(usuarioFirebase.uid);
          setCadastro(doc);
          if (doc) registrarUltimoLogin(usuarioFirebase.uid);
        }
      } catch (erro) {
        console.error('Falha ao resolver o acesso:', erro);
        setFalhaInfra(true);
      } finally {
        setCarregando(false);
      }
    });
  }, []);

  const sair = useCallback(async () => {
    await sairDaConta();
    setAcesso(null);
    setCadastro(null);
  }, []);

  const valor = {
    carregando,
    user,
    acesso,
    cadastro,
    falhaInfra,
    erroLogin,
    limparErroLogin: () => setErroLogin(null),
    autorizado: Boolean(acesso && !acesso.recusa),
    isAdmin: acesso?.perfil === 'admin',
    precisaCadastro: Boolean(acesso && !acesso.recusa && !cadastro),
    recarregarCadastro,
    sair,
  };

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export function useAuth() {
  const contexto = useContext(ContextoAuth);
  if (!contexto) {
    throw new Error('useAuth precisa estar dentro de ProvedorAuth.');
  }
  return contexto;
}
