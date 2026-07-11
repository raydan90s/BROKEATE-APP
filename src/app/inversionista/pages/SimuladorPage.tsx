import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import Tarjeta from '@/components/shared/Tarjeta';
import { COLORES } from '@/constants/colores';
import { ApiError } from '@/services/http';
import { porcentaje, usd } from '@/utils/formato';

import { getTasas } from '../services/catalogApi';
import type { CatalogoTasas, TasaInstrumento } from '../types/catalogo';

const MONTOS_RAPIDOS = [1000, 5000, 10000, 20000, 50000];
const PLAZOS = [
  { etiqueta: '180 días', dias: 180 },
  { etiqueta: '360 días', dias: 360 },
  { etiqueta: '720 días', dias: 720 },
];

/**
 * Prueba distintos montos y plazos y mira cómo cambia el resultado. **Ningún USD se
 * calcula aquí**: cada cambio pide de nuevo GET /api/catalog/rates?monto=&plazo_dias=
 * y Postgres devuelve interés y monto final por producto (regla 4 del equipo).
 */
export default function SimuladorPage() {
  const navigation = useNavigation();

  const [montoTexto, setMontoTexto] = useState('10000');
  const [plazo, setPlazo] = useState(360);
  const [datos, setDatos] = useState<CatalogoTasas | null>(null);
  const [error, setError] = useState<string | null>(null);

  const monto = Number(montoTexto.replace(/[^0-9]/g, '')) || 0;

  const cargar = useCallback(async () => {
    if (monto <= 0) return;
    setError(null);
    try {
      setDatos(await getTasas({ monto, plazoDias: plazo }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo simular.');
    }
  }, [monto, plazo]);

  // Debounce: se simula 400 ms después de la última tecla, no en cada una.
  useEffect(() => {
    const timer = setTimeout(() => void cargar(), 400);
    return () => clearTimeout(timer);
  }, [cargar]);

  // La mejor opción que el perfil SÍ puede tocar y cuyo mínimo alcanza el monto.
  const opciones = datos?.tasas ?? [];
  const mejor = opciones.find(
    (t) => t.elegible !== false && t.cumple_monto_minimo !== false && t.monto_final != null,
  );
  const resto = opciones.filter((t) => t !== mejor);

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
          <Text className="text-title font-bold text-text-primary">Simulador</Text>
          <Text className="text-caption text-text-muted">
            Prueba montos y plazos; las tasas vienen del catálogo
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerClassName="gap-3 py-4">
        {/* Monto */}
        <Tarjeta className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-body font-bold text-text-primary">Monto</Text>
            <Text className="text-heading font-bold text-brand-primary">{usd(monto)}</Text>
          </View>
          <TextInput
            value={montoTexto}
            onChangeText={setMontoTexto}
            keyboardType="number-pad"
            placeholder="Ej. 10000"
            placeholderTextColor={COLORES.textoMuted}
            className="rounded-xl border border-surface-border bg-surface-secondary px-4 py-3 text-body-md text-text-primary"
          />
          <View className="flex-row flex-wrap gap-2">
            {MONTOS_RAPIDOS.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMontoTexto(String(m))}
                className={`rounded-xl px-3 py-2 ${monto === m ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
                  }`}
              >
                <Text
                  className={`text-caption font-bold ${monto === m ? 'text-text-onPrimary' : 'text-brand-mid'
                    }`}
                >
                  {usd(m)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Tarjeta>

        {/* Plazo */}
        <Tarjeta className="gap-3">
          <Text className="text-body font-bold text-text-primary">Plazo</Text>
          <View className="flex-row gap-2">
            {PLAZOS.map((p) => (
              <TouchableOpacity
                key={p.dias}
                onPress={() => setPlazo(p.dias)}
                className={`flex-1 items-center rounded-xl py-2.5 ${plazo === p.dias ? 'bg-brand-primary' : 'bg-brandAlpha-primarySoft'
                  }`}
              >
                <Text
                  className={`text-body font-semibold ${plazo === p.dias ? 'text-text-onPrimary' : 'text-brand-mid'
                    }`}
                >
                  {p.etiqueta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Tarjeta>

        {/* Resultado */}
        {error ? (
          <ErrorEstado mensaje={error} onReintentar={cargar} />
        ) : monto <= 0 ? (
          <Text className="py-4 text-center text-body text-text-muted">
            Escribe un monto para simular.
          </Text>
        ) : !datos ? (
          <Cargando mensaje="Simulando…" />
        ) : (
          <>
            {mejor ? (
              <View className="overflow-hidden rounded-2xl border-2 border-brand-primary">
                <View className="bg-brand-primary px-4 py-2.5">
                  <Text className="text-caption font-bold tracking-widest text-white">
                    MEJOR OPCIÓN ELEGIBLE · {mejor.producto.toUpperCase()}
                  </Text>
                </View>
                <View className="gap-4 bg-surface-background p-4">
                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-caption font-bold tracking-wider text-text-muted">
                        MONTO FINAL
                      </Text>
                      <Text className="text-hero font-bold text-text-primary">
                        {usd(mejor.monto_final)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-caption font-bold tracking-wider text-text-muted">
                        TASA ANUAL
                      </Text>
                      <Text className="text-display font-bold text-state-success">
                        {porcentaje(mejor.tasa_anual)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1 items-center rounded-xl bg-brandAlpha-primarySoft p-3">
                      <Text className="text-caption font-bold tracking-wider text-text-muted">
                        CAPITAL
                      </Text>
                      <Text className="text-body-md font-bold text-text-primary">
                        {usd(monto)}
                      </Text>
                    </View>
                    <View className="flex-1 items-center rounded-xl bg-stateAlpha-successSoft p-3">
                      <Text className="text-caption font-bold tracking-wider text-state-success">
                        INTERESES
                      </Text>
                      <Text className="text-body-md font-bold text-state-success">
                        +{usd(mejor.interes_estimado)}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-caption text-text-muted">
                    {mejor.institucion} · {mejor.calificacion} · Fuente:{' '}
                    {mejor.fuente_calificacion ?? 'no declarada'}
                  </Text>
                </View>
              </View>
            ) : (
              <Tarjeta>
                <Text className="text-body text-text-secondary">
                  Ninguna opción elegible para tu perfil con ese monto y plazo.
                </Text>
              </Tarjeta>
            )}

            {resto.length > 0 ? (
              <Tarjeta className="gap-0 p-0">
                <Text className="p-4 pb-2 text-caption font-bold tracking-wider text-text-muted">
                  OTRAS OPCIONES
                </Text>
                {resto.map((t) => (
                  <FilaSimulada key={t.code} tasa={t} />
                ))}
              </Tarjeta>
            ) : null}

            <Text className="pb-2 text-center text-caption text-text-muted">
              Datos referenciales · no garantiza rentabilidad · el asesor aprueba antes de
              ejecutar
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilaSimulada({ tasa }: { tasa: TasaInstrumento }) {
  const bloqueada = tasa.elegible === false || tasa.cumple_monto_minimo === false;
  const motivo =
    tasa.elegible === false
      ? 'No disponible para tu perfil'
      : tasa.cumple_monto_minimo === false
        ? `Mínimo ${usd(tasa.monto_minimo)}`
        : null;

  return (
    <View
      className={`flex-row items-center gap-3 border-t border-surface-border p-4 ${bloqueada ? 'opacity-60' : ''
        }`}
    >
      <View className="flex-1">
        <Text className="text-body font-bold text-text-primary" numberOfLines={1}>
          {tasa.producto}
        </Text>
        <Text className="text-caption text-text-muted" numberOfLines={1}>
          {tasa.institucion} · {tasa.calificacion}
          {motivo ? ` · ${motivo}` : ''}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`text-body-md font-bold ${bloqueada ? 'text-text-muted' : 'text-brand-primary'
            }`}
        >
          {usd(tasa.monto_final)}
        </Text>
        <Text className="text-caption text-text-muted">{porcentaje(tasa.tasa_anual)}</Text>
      </View>
    </View>
  );
}
