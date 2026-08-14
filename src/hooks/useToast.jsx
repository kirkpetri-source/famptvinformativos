import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

const ContextoToast = createContext(null);

let proximoId = 1;

export function ProvedorToast({ children }) {
  const [toasts, setToasts] = useState([]);

  const remover = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (mensagem, tipo = 'sucesso') => {
      const id = proximoId++;
      setToasts((atual) => [...atual, { id, mensagem, tipo }]);
      // Erro fica mais tempo: costuma exigir leitura e alguma acao.
      setTimeout(() => remover(id), tipo === 'erro' ? 8000 : 4000);
    },
    [remover]
  );

  const sucesso = useCallback((m) => mostrar(m, 'sucesso'), [mostrar]);
  const erro = useCallback((m) => mostrar(m, 'erro'), [mostrar]);

  return (
    <ContextoToast.Provider value={{ sucesso, erro }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tipo}`}>
            {t.tipo === 'erro' ? (
              <AlertCircle size={18} color="var(--famp-danger)" />
            ) : (
              <CheckCircle2 size={18} color="var(--famp-success)" />
            )}
            <span className="crescer">{t.mensagem}</span>
            <button
              type="button"
              onClick={() => remover(t.id)}
              aria-label="Fechar aviso"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ContextoToast.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ContextoToast);
  if (!contexto) throw new Error('useToast precisa estar dentro de ProvedorToast.');
  return contexto;
}
