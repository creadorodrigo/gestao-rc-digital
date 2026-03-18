// src/lib/mcpClient.ts
// Cliente HTTP para o servidor meta_mcp (VPS)
// Substitui as Supabase Edge Functions: claude-proxy e relatorios-ia

const MCP_URL = import.meta.env.VITE_MCP_URL ?? '';
const MCP_KEY = import.meta.env.VITE_MCP_API_KEY ?? '';

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'x-api-key': MCP_KEY,
  };
}

// Proxy direto para a Anthropic API (para Reunioes.tsx)
export async function mcpClaudeProxy(body: {
  model: string;
  max_tokens: number;
  system?: string;
  messages: { role: string; content: string }[];
}): Promise<{ content: { type: string; text: string }[] }> {
  const res = await fetch(`${MCP_URL}/claude/proxy`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro no servidor MCP: ${err}`);
  }
  return res.json();
}

// Runner com Agent SDK headless (para tarefas autônomas)
export async function mcpClaudeRun(
  prompt: string,
  options?: { allowedTools?: string[]; maxTurns?: number }
): Promise<{ success: boolean; result: string; sessionId?: string }> {
  const res = await fetch(`${MCP_URL}/claude/run`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, ...options }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro no servidor MCP: ${err}`);
  }
  return res.json();
}

// Chamada direta a uma ferramenta MCP (para RelatoriosIA.tsx)
export async function mcpTool<T = unknown>(
  toolName: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; data: T }> {
  const res = await fetch(`${MCP_URL}/tools/${toolName}`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(args),
  });
  let json: { success?: boolean; error?: string; data?: T } = {};
  try { json = await res.json(); } catch { /* ignora parse error */ }

  if (!res.ok || json.success === false) {
    const raw = json.error ?? '';
    if (raw.includes('[4]') || raw.toLowerCase().includes('request limit')) {
      throw new Error('Limite de requisições da API Meta atingido. Aguarde alguns minutos e tente novamente.');
    }
    if (raw.includes('[17]') || raw.toLowerCase().includes('user request limit')) {
      throw new Error('Limite de requisições do usuário atingido. Aguarde e tente novamente.');
    }
    throw new Error(raw || `Erro na ferramenta ${toolName}`);
  }
  return json as { success: boolean; data: T };
}
