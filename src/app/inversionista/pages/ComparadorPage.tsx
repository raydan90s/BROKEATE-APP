import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Calificacion from '@/components/shared/Calificacion';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import Tarjeta from '@/components/shared/Tarjeta';
import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import { porcentaje, usd } from '@/utils/formato';

import { getTasas } from '../services/catalogApi';
import type { CatalogoTasas, TasaInstrumento } from '../types/catalogo';

type Ruta = RouteProp<{ Comparador: { monto?: number } | undefined }, 'Comparador'>;

/** Filtro por plazo. `undefined` = todos los productos del catálogo. */
const PLAZOS: { etiqueta: string; dias?: number }[] = [
  { etiqueta: 'Todos' },
  { etiqueta: '180 días', dias: 180 },
  { etiqueta: '360 días', dias: 360 },
  { etiqueta: '720 días', dias: 720 },
];

const NOMBRE_PERFIL: Record<string, string> = {
  conservador: 'Conservador',
  moderado: 'Moderado',
  agresivo: 'Agresivo',
};

/**
 * HU2: el catálogo aprobado, ordenado por calificación y con la regla de elegibilidad
 * **a la vista**. Los productos que el perfil del usuario no puede tocar no se esconden:
 * salen en gris con el `rationale` versionado de la regla. Enseñar la regla trabajando
 * vale más que ocultar la fila.
 */
export default function ComparadorPage() {
  const navigation = useNavigation();
  const route = useRoute<Ruta>();
  const monto = route.params?.monto;

  const [plazo, setPlazo] = useState<number | undefined>(undefined);
  const [datos, setDatos] = useState<CatalogoTasas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    setDatos(null);
    try {
      setDatos(await getTasas({ monto, plazoDias: plazo }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las tasas.');
    }
  }, [monto, plazo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <SafeAreaView className="flex-1 bg-surface-canvas">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-surface-border bg-surface-background px-4 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="h-8 w-8 items-center justify-center rounded-xl"
        >
          <Ionicons name="chevron-back" size={22} color={COLORES.primario} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-title font-bold text-text-primary">Comparador de tasas</Text>
          <Text className="text-caption text-text-muted">
            {monto != null ? `Para ${usd(monto)} · ` : ''}Tasas referenciales del catálogo
          </Text>
        </View>
        {datos?.perfil ? (
          <View className="rounded-lg bg-brandAlpha-primarySoft px-2 py-1">
            <Text className="text-caption font-bold text-brand-mid">
              {NOMBRE_PERFIL[datos.perfil] ?? datos.perfil}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Filtro por plazo */}
      <View className="flex-row gap-2 border-b border-surface-border bg-surface-elevated px-4 py-2">
        {PLAZOS.map((p) => {
          const activo = plazo === p.dias;
          return (
            <TouchableOpacity
              key={p.etiqueta}
              onPress={() => setPlazo(p.dias)}
              className={`flex-1 items-center rounded-xl py-2 ${
                activo ? 'bg-brand-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-caption font-bold ${
                  activo ? 'text-text-onPrimary' : 'text-text-muted'
                }`}
              >
                {p.etiqueta}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      ) : !datos ? (
        <Cargando mensaje="Cargando las tasas…" />
      ) : (
        <ScrollView className="flex-1 px-4" contentContainerClassName="gap-3 py-4">
          <Tarjeta className="gap-0 p-0">
            {datos.tasas.map((tasa, i) => (
              <FilaTasa key={tasa.code} tasa={tasa} esPrimera={i === 0} />
            ))}
          </Tarjeta>

          {/* La nota educativa: la tensión tasa/riesgo es producto, no letra chica. */}
          <View className="flex-row gap-2 rounded-2xl border border-surface-border bg-brandAlpha-primarySoft p-4">
            <Ionicons name="information-circle-outline" size={16} color={COLORES.azulMedio} />
            <Text className="flex-1 text-caption leading-4 text-text-muted">
              <Text className="font-bold text-text-secondary">A mayor tasa, mayor riesgo. </Text>
              La mejor tasa del catálogo viene de la institución con la calificación más
              baja: esa es la decisión que estás tomando.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FilaTasa({ tasa, esPrimera }: { tasa: TasaInstrumento; esPrimera: boolean }) {
  const bloqueada = tasa.elegible === false;

  return (
    <View
      className={`gap-2 p-4 ${esPrimera ? '' : 'border-t border-surface-border'} ${
        bloqueada ? 'opacity-60' : ''
      }`}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-body font-bold text-text-primary" numberOfLines={1}>
            {tasa.producto}
          </Text>
          <Calificacion
            institucion={tasa.institucion}
            calificacion={tasa.calificacion}
            fuente={tasa.fuente_calificacion}
            fecha={tasa.fecha_calificacion}
          />
        </View>
        <View className="items-end">
          <Text
            className={`text-heading font-bold ${
              bloqueada ? 'text-text-muted' : 'text-brand-primary'
            }`}
          >
            {porcentaje(tasa.tasa_anual)}
          </Text>
          <Text className="text-caption text-text-muted">
            {tasa.plazo_dias != null ? `anual · ${tasa.plazo_dias} días` : 'anual · sin plazo'}
          </Text>
          {tasa.monto_minimo != null ? (
            <Text className="text-caption text-text-muted">
              desde {usd(tasa.monto_minimo)}
            </Text>
          ) : null}
        </View>
      </View>

      {/* La regla versionada, no una excusa del front. */}
      {bloqueada && tasa.motivo_no_elegible ? (
        <View className="flex-row gap-2 rounded-xl bg-stateAlpha-warningSoft p-3">
          <Ionicons name="lock-closed-outline" size={14} color={COLORES.advertencia} />
          <Text className="flex-1 text-caption leading-4 text-text-secondary">
            <Text className="font-bold">No disponible para tu perfil. </Text>
            {tasa.motivo_no_elegible}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
