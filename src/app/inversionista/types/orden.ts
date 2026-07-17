/**
 * Espejo de `src/models/orders.py`. Si un campo cambia allá, cambia acá.
 *
 * Regla del proyecto: **el front no calcula nada**. La comisión de acá no se deriva
 * multiplicando el monto por la tasa — es una columna GENERATED de Postgres que viaja ya
 * calculada. Estos tipos existen para transportarla, no para recalcularla. Lo mismo vale
 * para `monto_invertido`: viaja servido justamente para que nadie lo obtenga restando acá.
 *
 * La comisión la paga el INVERSIONISTA (4,5% del total de la subcuenta) y sale de su
 * inversión: `monto_total` es lo que pone y `monto_invertido` lo que llega a los bancos.
 */

export type EstadoOrden = 'sent' | 'confirmed' | 'failed';
export type TipoInstitucion = 'banco' | 'cooperativa' | 'broker_internacional';

// --- La orden ------------------------------------------------------------

/** Una instrucción hacia UN banco. Una cartera en tres bancos son tres de estas. */
export interface LineaOrden {
  item_id: string;
  instrumento_code: string;
  instrumento_nombre: string;

  institucion: string | null;
  calificacion: string | null;
  tipo_institucion: TipoInstitucion | null;

  /** La porción bruta de la línea (total × %). Lo que llega al banco es `monto_invertido`. */
  monto: number;
  porcentaje: number;
  /** La parte de la comisión que le toca a esta línea. La calcula Postgres. */
  comision: number;
  /** Lo que efectivamente llega a este banco: `monto - comision`. */
  monto_invertido: number;

  /** La devuelve el banco al confirmar. Null mientras la línea está `sent`. */
  bank_reference: string | null;
  estado: EstadoOrden;
  confirmada_en: string | null;
}

export interface Orden {
  order_id: string;
  proposal_id: string;
  investor_id: string;
  investor_nombre: string | null;

  /** Quién firmó la propuesta de la que nació esta orden. */
  advisor_id: string | null;
  advisor_nombre: string | null;

  estado: EstadoOrden;

  /** La integración con la banca es simulada y la app lo DICE. No lo insinúa, no lo
   *  esconde: `BadgeSimulacion` se pinta cada vez que esto es `true`. */
  is_simulated: boolean;

  /** Lo que el cliente comprometió. NO es lo que llega a los bancos: de acá sale la comisión. */
  monto_total: number;
  comision_bps: number;
  comision_total: number;
  /** Lo que se repartió entre las instituciones: `monto_total - comision_total`. */
  monto_invertido: number;
  /** Por qué se cobra eso y por qué es igual en todos los bancos. Sale de la base. */
  comision_rationale: string | null;

  rules_version: string | null;
  creada_en: string;
  confirmada_en: string | null;

  lineas: LineaOrden[];
}

// --- El convenio (GET /api/catalog/convenios) ----------------------------

export interface Convenio {
  code: string;
  nombre: string;
  tipo: TipoInstitucion;
  calificacion: string;
  calificacion_fuente: string | null;
  calificacion_fecha: string | null;

  convenio_activo: boolean;
  convenio_desde: string | null;
  /** Cuántos productos suyos están en el catálogo. Con 0, no aparece en ninguna propuesta. */
  productos: number;
}

/**
 * `misma_para_todas` no lo decide el front: es una propiedad del esquema
 * (`commission_policies` no tiene columna de institución) que el servidor afirma. Si
 * alguna vez llegara `false`, la pantalla tiene que dejar de prometerlo — por eso se lee
 * del payload en vez de estar escrito a mano en el JSX.
 */
export interface PoliticaComision {
  comision_bps: number;
  comision_porcentaje: number;
  rationale: string;
  rules_version: string;
  misma_para_todas: boolean;
}

export interface CatalogoConvenios {
  politica: PoliticaComision | null;
  convenios: Convenio[];
}
