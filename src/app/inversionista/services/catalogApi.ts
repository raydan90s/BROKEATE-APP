import http from '@/services/http';

import type { CatalogoTasas } from '../types/catalogo';

/**
 * Tasas del catálogo con la elegibilidad del perfil del usuario del token.
 * Con `monto`, Postgres devuelve además interés estimado y monto final por producto:
 * el simulador no multiplica nada en el cliente.
 */
export function getTasas(opciones?: {
  monto?: number;
  plazoDias?: number;
}): Promise<CatalogoTasas> {
  const query = new URLSearchParams();
  if (opciones?.monto != null) query.set('monto', String(opciones.monto));
  if (opciones?.plazoDias != null) query.set('plazo_dias', String(opciones.plazoDias));
  const qs = query.toString();

  return http.get<CatalogoTasas>(`/api/catalog/rates${qs ? `?${qs}` : ''}`);
}
