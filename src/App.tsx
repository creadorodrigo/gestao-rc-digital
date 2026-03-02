import { useState, useEffect } from "react";

// ============================================================
// TYPES
// ============================================================
interface User {
  id: number;
  nome: string;
  email: string;
  senha: string;
  role: string;
  funcao: string;
  avatar: string;
}

interface Cliente {
  id: number;
  nome: string;
}

interface Tarefa {
  id: number;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  solicitante_id: number;
  responsavel_id: number;
  cliente_id: number;
  data_entrega: string;
  criado_em: string;
}

interface StatusConfigEntry {
  label: string;
  color: string;
  bg: string;
  accent: string;
}

interface PrioridadeConfigEntry {
  label: string;
  color: string;
}

interface SupabaseFetchOptions extends Omit<RequestInit, "headers"> {
  prefer?: string;
  headers?: Record<string, string>;
}

type FormState = {
  titulo: string;
  descricao: string;
  status: string;
  prioridade: string;
  solicitante_id: string;
  responsavel_id: string;
  cliente_id: string;
  data_entrega: string;
};

// ============================================================
// CONFIGURAÇÃO SUPABASE
// Substitua pelas suas credenciais do Supabase
// ============================================================
const SUPABASE_URL = "https://SEU_PROJECT.supabase.co";
const SUPABASE_KEY = "SUA_ANON_KEY";

export async function supabase(
  path: string,
  options: SupabaseFetchOptions = {}
): Promise<unknown> {
  const { prefer, ...fetchInit } = options;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer || "return=representation",
    },
    ...fetchInit,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ============================================================
// DADOS MOCK (usado quando Supabase não está configurado)
// ============================================================
const MOCK_USERS: User[] = [
  { id: 1, nome: "Rodrigo Creado", email: "rodrigo@rcdigital.com", senha: "admin123", role: "admin", funcao: "Gestor", avatar: "RC" },
  { id: 2, nome: "Ana Silva", email: "ana@rcdigital.com", senha: "team123", role: "team", funcao: "Designer", avatar: "AS" },
  { id: 3, nome: "Carlos Lima", email: "carlos@rcdigital.com", senha: "team123", role: "team", funcao: "Tráfego", avatar: "CL" },
];

const MOCK_CLIENTES: Cliente[] = [
  { id: 1, nome: "Loja Fashion Store" },
  { id: 2, nome: "Construtora Alpha" },
  { id: 3, nome: "Clínica Bella Vida" },
  { id: 4, nome: "Tech Solutions" },
];

const MOCK_TAREFAS: Tarefa[] = [
  {
    id: 1, titulo: "Criar criativos para campanha de março", descricao: "Desenvolver 5 peças para Meta Ads",
    status: "a_fazer", prioridade: "alta", solicitante_id: 1, responsavel_id: 2, cliente_id: 1,
    data_entrega: "2026-03-05", criado_em: "2026-03-01"
  },
  {
    id: 2, titulo: "Ajustar segmentação Google Ads", descricao: "Revisar palavras-chave e lances",
    status: "em_andamento", prioridade: "media", solicitante_id: 1, responsavel_id: 3, cliente_id: 2,
    data_entrega: "2026-03-04", criado_em: "2026-03-01"
  },
  {
    id: 3, titulo: "Relatório mensal fevereiro", descricao: "Compilar resultados e enviar ao cliente",
    status: "em_andamento", prioridade: "alta", solicitante_id: 2, responsavel_id: 1, cliente_id: 3,
    data_entrega: "2026-03-03", criado_em: "2026-02-28"
  },
  {
    id: 4, titulo: "Setup inicial campanhas", descricao: "Configurar pixel e campanhas iniciais",
    status: "concluido", prioridade: "alta", solicitante_id: 1, responsavel_id: 3, cliente_id: 4,
    data_entrega: "2026-02-28", criado_em: "2026-02-25"
  },
];

const STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  a_fazer: { label: "A Fazer", color: "#6B7280", bg: "#1F2937", accent: "#9CA3AF" },
  em_andamento: { label: "Em Andamento", color: "#D4A017", bg: "#1C1600", accent: "#F0C040" },
  em_revisao: { label: "Em Revisão", color: "#7C3AED", bg: "#1E0A3C", accent: "#A78BFA" },
  concluido: { label: "Concluído", color: "#059669", bg: "#002010", accent: "#34D399" },
};

const PRIORIDADE_CONFIG: Record<string, PrioridadeConfigEntry> = {
  baixa: { label: "Baixa", color: "#6B7280" },
  media: { label: "Média", color: "#D4A017" },
  alta: { label: "Alta", color: "#EF4444" },
};

// ============================================================
// STYLES
// ============================================================
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold: #C9A84C;
    --gold-light: #F0C040;
    --gold-dark: #8B6914;
    --black: #0A0A0A;
    --dark: #111111;
    --dark2: #1A1A1A;
    --dark3: #242424;
    --dark4: #2E2E2E;
    --text: #E8E8E8;
    --text-muted: #888888;
    --text-dim: #555555;
    --border: #2A2A2A;
    --border-gold: rgba(201,168,76,0.3);
  }

  body { font-family: 'Nunito', sans-serif; background: var(--black); color: var(--text); }

  .app { min-height: 100vh; display: flex; flex-direction: column; }

  /* LOGIN */
  .login-wrap {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: radial-gradient(ellipse at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.05) 0%, transparent 50%),
                var(--black);
  }
  .login-card {
    width: 400px; padding: 48px 40px;
    background: var(--dark);
    border: 1px solid var(--border-gold);
    border-radius: 4px;
    box-shadow: 0 0 60px rgba(201,168,76,0.08), 0 20px 60px rgba(0,0,0,0.8);
  }
  .login-logo {
    text-align: center; margin-bottom: 36px;
  }
  .login-logo .diamond {
    width: 72px; height: 72px; margin: 0 auto 16px;
    border: 2px solid var(--gold); transform: rotate(45deg);
    display: flex; align-items: center; justify-content: center;
    background: var(--dark2);
    box-shadow: 0 0 20px rgba(201,168,76,0.2);
  }
  .login-logo .diamond span {
    transform: rotate(-45deg); font-size: 22px; font-weight: 800;
    background: linear-gradient(135deg, #F0C040, #C9A84C);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    letter-spacing: -1px;
  }
  .login-logo h1 { font-size: 20px; font-weight: 700; color: var(--gold); letter-spacing: 2px; }
  .login-logo p { font-size: 11px; color: var(--text-muted); letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; }
  .login-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .login-input {
    width: 100%; padding: 12px 16px; margin-bottom: 20px;
    background: var(--dark2); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text); font-family: 'Nunito', sans-serif; font-size: 14px;
    transition: border-color 0.2s;
    outline: none;
  }
  .login-input:focus { border-color: var(--gold); }
  .login-btn {
    width: 100%; padding: 14px; background: linear-gradient(135deg, #C9A84C, #8B6914);
    border: none; border-radius: 3px; color: #000; font-family: 'Nunito', sans-serif;
    font-size: 13px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase;
    cursor: pointer; transition: opacity 0.2s, transform 0.1s;
  }
  .login-btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .login-error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 3px; padding: 10px 14px; font-size: 13px; color: #F87171; margin-bottom: 16px; }
  .login-hint { margin-top: 20px; padding: 12px; background: var(--dark2); border-radius: 3px; border-left: 2px solid var(--gold-dark); }
  .login-hint p { font-size: 11px; color: var(--text-dim); }
  .login-hint code { color: var(--gold); font-family: 'DM Mono', monospace; }

  /* HEADER */
  .header {
    height: 60px; background: var(--dark); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
    position: sticky; top: 0; z-index: 100;
  }
  .header-logo { display: flex; align-items: center; gap: 12px; }
  .header-diamond {
    width: 34px; height: 34px; border: 1.5px solid var(--gold);
    transform: rotate(45deg); display: flex; align-items: center; justify-content: center;
    background: var(--dark2);
  }
  .header-diamond span { transform: rotate(-45deg); font-size: 11px; font-weight: 800; color: var(--gold); }
  .header-title { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: 1px; }
  .header-title span { color: var(--gold); }
  .header-right { display: flex; align-items: center; gap: 16px; }
  .user-badge {
    display: flex; align-items: center; gap: 10px;
    padding: 6px 12px; background: var(--dark2); border-radius: 3px;
    border: 1px solid var(--border);
  }
  .user-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg, #C9A84C, #8B6914);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: #000;
  }
  .user-info { line-height: 1.2; }
  .user-name { font-size: 12px; font-weight: 700; color: var(--text); }
  .user-role { font-size: 10px; color: var(--text-muted); letter-spacing: 1px; }
  .logout-btn {
    padding: 6px 12px; background: transparent; border: 1px solid var(--border);
    border-radius: 3px; color: var(--text-muted); font-size: 11px; letter-spacing: 1px;
    cursor: pointer; font-family: 'Nunito', sans-serif; transition: all 0.2s;
  }
  .logout-btn:hover { border-color: var(--gold); color: var(--gold); }

  /* NAV */
  .nav { background: var(--dark); border-bottom: 1px solid var(--border); padding: 0 24px; display: flex; gap: 4px; }
  .nav-btn {
    padding: 12px 16px; background: transparent; border: none; border-bottom: 2px solid transparent;
    color: var(--text-muted); font-family: 'Nunito', sans-serif; font-size: 12px; font-weight: 600;
    letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; gap: 6px;
  }
  .nav-btn:hover { color: var(--text); }
  .nav-btn.active { color: var(--gold); border-bottom-color: var(--gold); }
  .nav-badge {
    background: var(--gold); color: #000; font-size: 9px; font-weight: 800;
    padding: 1px 5px; border-radius: 10px;
  }

  /* MAIN */
  .main { flex: 1; padding: 24px; overflow-x: auto; }

  /* TOOLBAR */
  .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
  .toolbar-left { display: flex; align-items: center; gap: 12px; }
  .toolbar-title { font-size: 22px; font-weight: 800; color: var(--text); }
  .toolbar-title span { color: var(--gold); }
  .filter-select {
    padding: 8px 12px; background: var(--dark2); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text); font-family: 'Nunito', sans-serif; font-size: 12px;
    outline: none; cursor: pointer;
  }
  .filter-select:focus { border-color: var(--gold); }
  .btn-primary {
    padding: 10px 20px; background: linear-gradient(135deg, #C9A84C, #8B6914);
    border: none; border-radius: 3px; color: #000; font-family: 'Nunito', sans-serif;
    font-size: 12px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px;
  }
  .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn-secondary {
    padding: 8px 16px; background: var(--dark2); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text-muted); font-family: 'Nunito', sans-serif;
    font-size: 12px; font-weight: 600; letter-spacing: 1px; cursor: pointer; transition: all 0.2s;
  }
  .btn-secondary:hover { border-color: var(--gold); color: var(--gold); }

  /* KANBAN */
  .kanban { display: flex; gap: 16px; align-items: flex-start; min-width: max-content; }
  .kanban-col {
    width: 300px; background: var(--dark); border-radius: 4px;
    border: 1px solid var(--border); flex-shrink: 0;
  }
  .kanban-col-header {
    padding: 14px 16px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--border);
  }
  .kanban-col-title { display: flex; align-items: center; gap: 8px; }
  .col-dot { width: 8px; height: 8px; border-radius: 50%; }
  .col-label { font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .col-count {
    background: var(--dark3); padding: 2px 8px; border-radius: 10px;
    font-size: 11px; font-weight: 700; color: var(--text-muted);
  }
  .kanban-col-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 200px; }
  .add-card-btn {
    width: 100%; padding: 10px; background: transparent;
    border: 1px dashed var(--border); border-radius: 3px;
    color: var(--text-dim); font-family: 'Nunito', sans-serif; font-size: 12px;
    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .add-card-btn:hover { border-color: var(--gold); color: var(--gold); }

  /* TASK CARD */
  .task-card {
    background: var(--dark2); border: 1px solid var(--border); border-radius: 4px;
    padding: 14px; cursor: pointer; transition: all 0.2s;
    border-left: 3px solid transparent;
  }
  .task-card:hover { border-color: var(--border-gold); transform: translateY(-1px); box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
  .task-card.prioridade-alta { border-left-color: #EF4444; }
  .task-card.prioridade-media { border-left-color: #D4A017; }
  .task-card.prioridade-baixa { border-left-color: #6B7280; }
  .task-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
  .task-titulo { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.4; flex: 1; }
  .task-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px; }
  .task-meta { display: flex; flex-direction: column; gap: 6px; }
  .task-meta-row { display: flex; align-items: center; justify-content: space-between; }
  .meta-label { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
  .meta-value { font-size: 11px; color: var(--text-muted); font-weight: 600; }
  .meta-avatar {
    width: 22px; height: 22px; border-radius: 50%;
    background: linear-gradient(135deg, #C9A84C, #8B6914);
    display: flex; align-items: center; justify-content: center;
    font-size: 8px; font-weight: 800; color: #000;
  }
  .task-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
  .badge-prioridade {
    padding: 2px 8px; border-radius: 2px; font-size: 9px; font-weight: 800;
    letter-spacing: 1.5px; text-transform: uppercase;
  }
  .task-date { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--text-dim); }
  .task-date.overdue { color: #EF4444; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    display: flex; align-items: center; justify-content: center; z-index: 200;
    backdrop-filter: blur(4px);
  }
  .modal {
    background: var(--dark); border: 1px solid var(--border-gold); border-radius: 4px;
    width: 560px; max-height: 90vh; overflow-y: auto;
    box-shadow: 0 0 60px rgba(201,168,76,0.1), 0 20px 60px rgba(0,0,0,0.8);
  }
  .modal-header {
    padding: 20px 24px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .modal-title { font-size: 16px; font-weight: 800; color: var(--text); }
  .modal-subtitle { font-size: 11px; color: var(--text-muted); margin-top: 2px; letter-spacing: 1px; }
  .modal-close {
    width: 32px; height: 32px; background: var(--dark2); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text-muted); cursor: pointer; font-size: 16px;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
  }
  .modal-close:hover { border-color: var(--gold); color: var(--gold); }
  .modal-body { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
  .modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

  .form-group { display: flex; flex-direction: column; gap: 6px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .form-label { font-size: 10px; font-weight: 700; color: var(--text-muted); letter-spacing: 2px; text-transform: uppercase; }
  .form-input, .form-select, .form-textarea {
    padding: 10px 14px; background: var(--dark2); border: 1px solid var(--border);
    border-radius: 3px; color: var(--text); font-family: 'Nunito', sans-serif; font-size: 13px;
    outline: none; transition: border-color 0.2s;
  }
  .form-input:focus, .form-select:focus, .form-textarea:focus { border-color: var(--gold); }
  .form-textarea { resize: vertical; min-height: 80px; }

  /* DETAIL MODAL */
  .detail-section { margin-bottom: 20px; }
  .detail-section-title { font-size: 10px; font-weight: 700; color: var(--text-dim); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid var(--border); }
  .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .detail-field { display: flex; flex-direction: column; gap: 4px; }
  .detail-label { font-size: 10px; color: var(--text-dim); letter-spacing: 1px; text-transform: uppercase; }
  .detail-value { font-size: 13px; color: var(--text); font-weight: 600; }
  .status-select-row { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
  .status-chip {
    padding: 5px 12px; border-radius: 2px; font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; border: 1px solid transparent;
    transition: all 0.2s;
  }
  .status-chip.active { border-color: currentColor; }
  .status-chip:not(.active) { opacity: 0.5; }
  .status-chip:hover { opacity: 1; }

  /* TOAST */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    background: var(--dark2); border: 1px solid var(--gold); border-radius: 3px;
    padding: 14px 20px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: slideIn 0.3s ease;
  }
  .toast-icon { color: var(--gold); font-size: 16px; }
  .toast-text { font-size: 13px; font-weight: 600; }
  @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

  /* EMPTY */
  .empty-col { text-align: center; padding: 24px 12px; color: var(--text-dim); font-size: 12px; }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--dark); }
  ::-webkit-scrollbar-thumb { background: var(--dark4); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--gold-dark); }

  /* COMING SOON */
  .coming-soon {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 400px; gap: 16px;
  }
  .coming-soon-icon { font-size: 48px; opacity: 0.3; }
  .coming-soon h2 { font-size: 24px; font-weight: 800; color: var(--text); }
  .coming-soon p { color: var(--text-muted); font-size: 14px; text-align: center; max-width: 400px; }
  .coming-soon .tag {
    padding: 6px 16px; background: var(--dark2); border: 1px solid var(--border-gold);
    border-radius: 20px; font-size: 11px; color: var(--gold); letter-spacing: 2px; text-transform: uppercase;
  }
`;

// ============================================================
// UTILS
// ============================================================
function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("pt-BR");
}

function isOverdue(d: string | null | undefined): boolean {
  if (!d) return false;
  return new Date(d + "T00:00:00") < new Date();
}

function getUserInitials(nome: string | undefined): string {
  return nome?.split(" ").slice(0, 2).map(n => n[0]).join("") || "?";
}

// ============================================================
// COMPONENTS
// ============================================================
interface ToastProps {
  msg: string;
  onClose: () => void;
}

function Toast({ msg, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="toast">
      <span className="toast-icon">✦</span>
      <span className="toast-text">{msg}</span>
    </div>
  );
}

interface TaskCardProps {
  tarefa: Tarefa;
  usuarios: User[];
  clientes: Cliente[];
  onClick: (tarefa: Tarefa) => void;
}

function TaskCard({ tarefa, usuarios, clientes, onClick }: TaskCardProps) {
  const responsavel = usuarios.find(u => u.id === tarefa.responsavel_id);
  const cliente = clientes.find(c => c.id === tarefa.cliente_id);
  const prio = PRIORIDADE_CONFIG[tarefa.prioridade] || PRIORIDADE_CONFIG["media"];
  const overdue = isOverdue(tarefa.data_entrega) && tarefa.status !== "concluido";

  return (
    <div className={`task-card prioridade-${tarefa.prioridade}`} onClick={() => onClick(tarefa)}>
      <div className="task-card-header">
        <div className="task-titulo">{tarefa.titulo}</div>
      </div>
      {tarefa.descricao && <div className="task-desc">{tarefa.descricao}</div>}
      <div className="task-meta">
        {cliente && (
          <div className="task-meta-row">
            <span className="meta-label">Cliente</span>
            <span className="meta-value">{cliente.nome}</span>
          </div>
        )}
        {responsavel && (
          <div className="task-meta-row">
            <span className="meta-label">Responsável</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="meta-avatar">{getUserInitials(responsavel.nome)}</div>
              <span className="meta-value" style={{ fontSize: 11 }}>{responsavel.nome.split(" ")[0]}</span>
            </div>
          </div>
        )}
      </div>
      <div className="task-footer">
        <span className="badge-prioridade" style={{ background: prio.color + "22", color: prio.color }}>
          {prio.label}
        </span>
        {tarefa.data_entrega && (
          <span className={`task-date ${overdue ? "overdue" : ""}`}>
            {overdue ? "⚠ " : ""}{formatDate(tarefa.data_entrega)}
          </span>
        )}
      </div>
    </div>
  );
}

interface TaskDetailModalProps {
  tarefa: Tarefa;
  usuarios: User[];
  clientes: Cliente[];
  currentUser: User;
  onClose: () => void;
  onUpdate: (tarefa: Tarefa) => void;
  onDelete: (id: number) => void;
}

function TaskDetailModal({ tarefa, usuarios, clientes, currentUser, onClose, onUpdate, onDelete }: TaskDetailModalProps) {
  const [status, setStatus] = useState(tarefa.status);
  const responsavel = usuarios.find(u => u.id === tarefa.responsavel_id);
  const solicitante = usuarios.find(u => u.id === tarefa.solicitante_id);
  const cliente = clientes.find(c => c.id === tarefa.cliente_id);

  const handleStatusChange = (s: string) => {
    setStatus(s);
    onUpdate({ ...tarefa, status: s });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{tarefa.titulo}</div>
            <div className="modal-subtitle">DETALHES DA TAREFA</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <div className="detail-section-title">Status</div>
            <div className="status-select-row">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div
                  key={key}
                  className={`status-chip ${status === key ? "active" : ""}`}
                  style={{ color: cfg.accent, background: status === key ? cfg.bg : "transparent" }}
                  onClick={() => handleStatusChange(key)}
                >
                  {cfg.label}
                </div>
              ))}
            </div>
          </div>

          {tarefa.descricao && (
            <div className="detail-section">
              <div className="detail-section-title">Descrição</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>{tarefa.descricao}</div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">Informações</div>
            <div className="detail-grid">
              <div className="detail-field">
                <div className="detail-label">Cliente</div>
                <div className="detail-value">{cliente?.nome || "—"}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Prioridade</div>
                <div className="detail-value" style={{ color: PRIORIDADE_CONFIG[tarefa.prioridade]?.color }}>
                  {PRIORIDADE_CONFIG[tarefa.prioridade]?.label || "—"}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Solicitante</div>
                <div className="detail-value">{solicitante?.nome || "—"}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Responsável</div>
                <div className="detail-value">{responsavel?.nome || "—"}</div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Data de Entrega</div>
                <div className="detail-value" style={{ color: isOverdue(tarefa.data_entrega) && tarefa.status !== "concluido" ? "#EF4444" : "var(--text)" }}>
                  {formatDate(tarefa.data_entrega)}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-label">Criado em</div>
                <div className="detail-value">{formatDate(tarefa.criado_em)}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          {currentUser.role === "admin" && (
            <button className="btn-secondary" onClick={() => onDelete(tarefa.id)} style={{ color: "#EF4444", borderColor: "rgba(239,68,68,0.3)" }}>
              Excluir
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

interface NewTaskModalProps {
  usuarios: User[];
  clientes: Cliente[];
  currentUser: User;
  onClose: () => void;
  onSave: (tarefa: Tarefa) => void;
  initialStatus: string;
}

function NewTaskModal({ usuarios, clientes, currentUser, onClose, onSave, initialStatus }: NewTaskModalProps) {
  const [form, setForm] = useState<FormState>({
    titulo: "", descricao: "", status: initialStatus || "a_fazer",
    prioridade: "media", solicitante_id: String(currentUser.id),
    responsavel_id: "", cliente_id: "", data_entrega: ""
  });

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.titulo.trim()) return;
    onSave({
      ...form,
      id: Date.now(),
      solicitante_id: Number(form.solicitante_id),
      responsavel_id: Number(form.responsavel_id),
      cliente_id: Number(form.cliente_id),
      criado_em: new Date().toISOString().split("T")[0],
    });
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">Nova Tarefa</div>
            <div className="modal-subtitle">PREENCHA OS DADOS ABAIXO</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.titulo} onChange={e => set("titulo", e.target.value)} placeholder="Ex: Criar criativos para campanha" />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição</label>
            <textarea className="form-textarea" value={form.descricao} onChange={e => set("descricao", e.target.value)} placeholder="Descreva a tarefa..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <select className="form-select" value={form.cliente_id} onChange={e => set("cliente_id", e.target.value)}>
                <option value="">Selecionar</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsável</label>
              <select className="form-select" value={form.responsavel_id} onChange={e => set("responsavel_id", e.target.value)}>
                <option value="">Selecionar</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Prioridade</label>
              <select className="form-select" value={form.prioridade} onChange={e => set("prioridade", e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => set("status", e.target.value)}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Solicitante</label>
              <select className="form-select" value={form.solicitante_id} onChange={e => set("solicitante_id", e.target.value)}>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Data de Entrega</label>
              <input className="form-input" type="date" value={form.data_entrega} onChange={e => set("data_entrega", e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>✦ Criar Tarefa</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAGES
// ============================================================
interface KanbanPageProps {
  tarefas: Tarefa[];
  setTarefas: (fn: (prev: Tarefa[]) => Tarefa[]) => void;
  usuarios: User[];
  clientes: Cliente[];
  currentUser: User;
  showToast: (msg: string) => void;
}

function KanbanPage({ tarefas, setTarefas, usuarios, clientes, currentUser, showToast }: KanbanPageProps) {
  const [newModal, setNewModal] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<Tarefa | null>(null);
  const [filtroResp, setFiltroResp] = useState("");

  const tarefasFiltradas = filtroResp
    ? tarefas.filter(t => t.responsavel_id === Number(filtroResp))
    : tarefas;

  const tarefasPorStatus = (status: string) => tarefasFiltradas.filter(t => t.status === status);

  const handleSaveTask = (tarefa: Tarefa) => {
    setTarefas(prev => [...prev, tarefa]);
    setNewModal(null);
    showToast("Tarefa criada com sucesso!");
  };

  const handleUpdateTask = (updated: Tarefa) => {
    setTarefas(prev => prev.map(t => t.id === updated.id ? updated : t));
    showToast("Tarefa atualizada!");
  };

  const handleDeleteTask = (id: number) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
    setDetailModal(null);
    showToast("Tarefa removida.");
  };

  const overdueCnt = tarefas.filter(t => isOverdue(t.data_entrega) && t.status !== "concluido").length;

  return (
    <>
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-title">Tarefas <span>/ Kanban</span></div>
          {overdueCnt > 0 && (
            <span style={{ background: "rgba(239,68,68,0.15)", color: "#F87171", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 3, border: "1px solid rgba(239,68,68,0.3)" }}>
              ⚠ {overdueCnt} atrasada{overdueCnt > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="filter-select" value={filtroResp} onChange={e => setFiltroResp(e.target.value)}>
            <option value="">Todos responsáveis</option>
            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome.split(" ")[0]}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setNewModal("a_fazer")}>
            + Nova Tarefa
          </button>
        </div>
      </div>

      <div className="kanban">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const col = tarefasPorStatus(status);
          return (
            <div className="kanban-col" key={status}>
              <div className="kanban-col-header">
                <div className="kanban-col-title">
                  <div className="col-dot" style={{ background: cfg.color }} />
                  <span className="col-label" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                <span className="col-count">{col.length}</span>
              </div>
              <div className="kanban-col-body">
                {col.length === 0 && <div className="empty-col">Nenhuma tarefa</div>}
                {col.map(t => (
                  <TaskCard key={t.id} tarefa={t} usuarios={usuarios} clientes={clientes} onClick={setDetailModal} />
                ))}
                <button className="add-card-btn" onClick={() => setNewModal(status)}>+ Adicionar</button>
              </div>
            </div>
          );
        })}
      </div>

      {newModal && (
        <NewTaskModal
          usuarios={usuarios} clientes={clientes} currentUser={currentUser}
          initialStatus={newModal} onClose={() => setNewModal(null)} onSave={handleSaveTask}
        />
      )}
      {detailModal && (
        <TaskDetailModal
          tarefa={detailModal} usuarios={usuarios} clientes={clientes} currentUser={currentUser}
          onClose={() => setDetailModal(null)} onUpdate={handleUpdateTask} onDelete={handleDeleteTask}
        />
      )}
    </>
  );
}

interface ComingSoonProps {
  icon: string;
  title: string;
  desc: string;
  tag: string;
}

function ComingSoon({ icon, title, desc, tag }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">{icon}</div>
      <h2>{title}</h2>
      <p>{desc}</p>
      <div className="tag">{tag}</div>
    </div>
  );
}

// ============================================================
// APP
// ============================================================
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("tarefas");
  const [tarefas, setTarefas] = useState<Tarefa[]>(MOCK_TAREFAS);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogin = () => {
    const user = MOCK_USERS.find(u => u.email === email && u.senha === senha);
    if (user) {
      setCurrentUser(user);
      setLoginError("");
    } else {
      setLoginError("E-mail ou senha inválidos.");
    }
  };

  if (!currentUser) {
    return (
      <>
        <style>{styles}</style>
        <div className="login-wrap">
          <div className="login-card">
            <div className="login-logo">
              <div className="diamond"><span>RC</span></div>
              <h1>RC DIGITAL</h1>
              <p>Sistema de Gestão</p>
            </div>
            {loginError && <div className="login-error">{loginError}</div>}
            <label className="login-label">E-mail</label>
            <input className="login-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <label className="login-label">Senha</label>
            <input className="login-input" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
            <button className="login-btn" onClick={handleLogin}>ENTRAR</button>
            <div className="login-hint">
              <p>Demo — Admin: <code>rodrigo@rcdigital.com</code> / <code>admin123</code></p>
              <p style={{ marginTop: 4 }}>Time: <code>ana@rcdigital.com</code> / <code>team123</code></p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const tarefasHoje = tarefas.filter(t => t.data_entrega === new Date().toISOString().split("T")[0]).length;

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <header className="header">
          <div className="header-logo">
            <div className="header-diamond"><span>RC</span></div>
            <div className="header-title">RC <span>Digital</span></div>
          </div>
          <div className="header-right">
            <div className="user-badge">
              <div className="user-avatar">{currentUser.avatar}</div>
              <div className="user-info">
                <div className="user-name">{currentUser.nome.split(" ")[0]}</div>
                <div className="user-role">{currentUser.role === "admin" ? "ADMIN" : "EQUIPE"}</div>
              </div>
            </div>
            <button className="logout-btn" onClick={() => setCurrentUser(null)}>SAIR</button>
          </div>
        </header>

        <nav className="nav">
          {[
            { key: "tarefas", label: "Tarefas", badge: tarefasHoje > 0 ? tarefasHoje : null },
            { key: "clientes", label: "Clientes" },
            ...(currentUser.role === "admin" ? [
              { key: "dashboard", label: "Dashboard" },
              { key: "time", label: "Time" },
              { key: "crm", label: "CRM" },
            ] : []),
          ].map(({ key, label, badge }) => (
            <button key={key} className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              {label}
              {badge && <span className="nav-badge">{badge}</span>}
            </button>
          ))}
        </nav>

        <main className="main">
          {tab === "tarefas" && (
            <KanbanPage
              tarefas={tarefas} setTarefas={setTarefas}
              usuarios={MOCK_USERS} clientes={MOCK_CLIENTES}
              currentUser={currentUser} showToast={showToast}
            />
          )}
          {tab === "clientes" && (
            <ComingSoon icon="🏢" title="Módulo de Clientes" desc="Cadastro completo de clientes com dados públicos e restritos, visão em lista e kanban." tag="Próximo módulo" />
          )}
          {tab === "dashboard" && (
            <ComingSoon icon="📊" title="Dashboard Gerencial" desc="Visão executiva com gráficos de NPS, metas de faturamento e performance da agência." tag="Em desenvolvimento" />
          )}
          {tab === "time" && (
            <ComingSoon icon="👥" title="Gestão do Time" desc="Cadastro da equipe com foto, função, telefone e integração com WhatsApp via Evolution API." tag="Em desenvolvimento" />
          )}
          {tab === "crm" && (
            <ComingSoon icon="💼" title="CRM Comercial" desc="Pipeline de leads em kanban para o setor comercial da agência." tag="Em breve" />
          )}
        </main>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </>
  );
}
