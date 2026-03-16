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
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro na ferramenta ${toolName}: ${err}`);
  }
  return res.json();
}
