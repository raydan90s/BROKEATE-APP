import http from '@/services/http';

/**
 * Cliente del agente conversacional. Espejo de `src/models/agent.py` del backend.
 *
 * Regla del proyecto: el front no interpreta ni recalcula nada de lo que dice el
 * agente. El texto y las fuentes vienen ya validados por el guardarraíl del backend;
 * acá solo se transportan y se pintan.
 */

export interface SourceChip {
  table: string;
  record_id: string;
  /** Ya viene listo para mostrar: "Depósito a Plazo Fijo 360 días · 60% · USD 12.000". */
  label: string;
}

export interface AgentChatResponse {
  texto: string;
  sources: SourceChip[];
  /** Evidencia anti-alucinación: el texto mostrado pasó el validador del banco. */
  guardrail_passed: boolean;
  /** El modelo de Gemini, la plantilla determinista o el rechazo por alcance. */
  modelo: string;
  en_alcance: boolean;
}

export interface AgentChatRequest {
  /** Sin sesión, el backend usa la última sesión completada del usuario del token. */
  session_id?: string;
  mensaje: string;
  /** Proveedor de IA elegido en el header ("google"|"openai"|"anthropic"). */
  provider?: string;
}

/** Un proveedor del catálogo. El backend NUNCA manda las API keys, solo si existen. */
export interface ProviderInfo {
  id: string;
  modelo: string;
  disponible: boolean;
  es_default: boolean;
}

/** Un turno de conversación. `provider` cambia el modelo en tiempo real. */
export function enviarMensaje(
  mensaje: string,
  sessionId?: string,
  provider?: string,
): Promise<AgentChatResponse> {
  const body: AgentChatRequest = { mensaje };
  if (sessionId) body.session_id = sessionId;
  if (provider) body.provider = provider;
  return http.post<AgentChatResponse>('/api/agent/chat', body);
}

/** Catálogo de proveedores para el selector del header. */
export function getProviders(): Promise<ProviderInfo[]> {
  return http.get<ProviderInfo[]>('/api/agent/providers');
}
