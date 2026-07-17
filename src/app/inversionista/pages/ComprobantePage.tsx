import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AgenteFab from '@/app/agente/components/AgenteFab';
import BotonAtras from '@/components/shared/BotonAtras';
import { Cargando, ErrorEstado } from '@/components/shared/Estados';
import { useColores } from '@/context/ThemeContext';
import { ApiError } from '@/services/http';
import type { InvestorStackParamList } from '@/types/navigation';
import { fechaHora, porcentaje, usd } from '@/utils/formato';

import { getOrden } from '../services/ordersApi';
import type { LineaOrden, Orden } from '../types/orden';

function Linea({ linea }: { linea: LineaOrden }) {
  return (
    <View className="gap-2 rounded-2xl border border-surface-border bg-surface-background p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-body-md font-bold text-text-primary">
            {linea.instrumento_nombre}
          </Text>
          {linea.institucion ? (
            <Text className="text-caption text-text-muted">
              {linea.institucion}
              {linea.calificacion ? ` · ${linea.calificacion}` : ''}
            </Text>
          ) : null}
        </View>
        {/* Lo que recibió ESTE banco, ya neto de su parte de comisión. El % sigue siendo el
            de la cartera: la comisión se prorratea igual en todas las líneas, así que
            descontarla no corre a nadie de su porcentaje. */}
        <View className="items-end">
          <Text className="text-body-md font-bold text-text-primary">
            {usd(linea.monto_invertido)}
          </Text>
          <Text className="text-caption text-text-muted">{porcentaje(linea.porcentaje)}</Text>
        </View>
      </View>

      {/* La referencia es lo que hace de esto un comprobante y no un resumen: es el dato
          con el que el cliente puede preguntar por SU orden en ESE banco. */}
      {linea.bank_reference ? (
        <View className="flex-row items-center justify-between rounded-xl bg-surface-canvas px-3 py-2">
          <Text className="text-caption text-text-secondary">Referencia</Text>
          <Text className="text-caption font-bold text-text-primary">
            {linea.bank_reference}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * El comprobante: qué se cursó, a qué bancos, con qué referencia, quién lo firmó y cuánto
 * cobró Brokeate.
 *
 * La comisión se muestra **a propósito**, y es la decisión de diseño más importante de
 * esta pantalla. La paga el cliente y sale de su inversión, así que acá se ve la resta
 * entera: puso tanto, se cobró tanto, se invirtió tanto. Un comprobante que solo mostrara
 * el total comprometido estaría escondiendo la comisión detrás de un número más grande.
 *
 * Y sigue diciendo que es la misma en todas las instituciones con convenio, que ahora
 * importa más que antes: un intermediario tiene un incentivo obvio para empujar al banco
 * que mejor le paga, y desde que la comisión la paga el cliente ese sesgo se pagaría con
 * su plata. "Confía en que no lo hacemos" no es una respuesta; que en la base no exista una
 * columna donde escribir una tasa distinta por banco sí lo es (`commission_policies`,
 * migración 005).
 *
 * `comision_rationale` viene del servidor y no está escrito acá por lo mismo de siempre:
 * si mañana cambia la política, esta pantalla cambia sola en vez de mentir.
 */
export default function ComprobantePage() {
  const colores = useColores();
  const navigation = useNavigation<NativeStackNavigationProp<InvestorStackParamList>>();
  const { orderId } = useRoute<RouteProp<InvestorStackParamList, 'Comprobante'>>().params;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setOrden(await getOrden(orderId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu comprobante.');
    }
  }, [orderId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <ErrorEstado mensaje={error} onReintentar={cargar} />
      </SafeAreaView>
    );
  }

  if (!orden) {
    return (
      <SafeAreaView className="flex-1 bg-surface-background">
        <Cargando mensaje="Cargando tu comprobante…" />
      </SafeAreaView>
    );
  }

  const confirmada = orden.estado === 'confirmed';

  return (
    <SafeAreaView className="flex-1 bg-surface-background">
      <View className="flex-row items-center gap-3 border-b border-surface-border px-5 py-4">
        {navigation.canGoBack() ? <BotonAtras onPress={navigation.goBack} /> : null}
        <Text className="flex-1 text-heading font-bold text-text-primary">Comprobante</Text>
      </View>

      <ScrollView className="flex-1 bg-surface-canvas" contentContainerClassName="px-5 py-6 gap-4">
        <View className="items-center gap-1 rounded-2xl border border-surface-border bg-surface-background p-6">
          <Text className="text-caption font-bold uppercase text-text-secondary">
            {confirmada ? 'Invertido' : 'Enviado al banco'}
          </Text>
          {/* El neto: la cifra grande del comprobante tiene que ser la que está trabajando
              en los bancos, no la que salió de la cuenta del cliente. El desglose completo
              está abajo. */}
          <Text className="text-display font-bold text-text-primary">
            {usd(orden.monto_invertido)}
          </Text>
          <Text className="text-caption text-text-muted">
            {orden.lineas.length}{' '}
            {orden.lineas.length === 1 ? 'institución' : 'instituciones'} ·{' '}
            {fechaHora(orden.confirmada_en ?? orden.creada_en)}
          </Text>
        </View>

        {/* La firma humana. Es la respuesta a "¿y quién responde por esto?" y por eso está
            arriba del detalle, no enterrada al final. */}
        {orden.advisor_nombre ? (
          <View className="flex-row items-center gap-3 rounded-2xl border border-surface-border bg-surface-background p-4">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-brandAlpha-primarySoft">
              <Ionicons name="person" size={18} color={colores.azulMedio} />
            </View>
            <View className="flex-1">
              <Text className="text-caption text-text-muted">Revisada y aprobada por</Text>
              <Text className="text-body-md font-bold text-text-primary">
                {orden.advisor_nombre}
              </Text>
              <Text className="text-caption text-text-muted">
                Asesor de Brokeate{orden.rules_version ? ` · reglas ${orden.rules_version}` : ''}
              </Text>
            </View>
          </View>
        ) : null}

        <Text className="mt-2 text-caption font-bold uppercase text-text-secondary">
          Tus órdenes
        </Text>
        {orden.lineas.map((linea) => (
          <Linea key={linea.item_id} linea={linea} />
        ))}

        {/* --- Lo que cuesta. Ver el docstring: esta sección es el argumento. --- */}
        <View className="mt-2 gap-3 rounded-2xl border border-surface-border bg-surface-background p-5">
          <Text className="text-caption font-bold uppercase text-text-secondary">
            Qué te costó esto
          </Text>

          <View className="flex-row items-baseline justify-between">
            <Text className="text-body text-text-secondary">Tu subcuenta</Text>
            <Text className="text-body-md text-text-primary">{usd(orden.monto_total)}</Text>
          </View>

          {/* La cuenta completa y no solo el resultado: tasa × monto = comisión. Que el
              usuario pueda rehacerla de cabeza es el punto — un porcentaje suelto al lado
              de una cifra obliga a confiar en que alguien multiplicó bien, que es
              exactamente lo que esta app no le pide a nadie. */}
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-body text-text-secondary">Comisión de Brokeate</Text>
              <Text className="text-caption text-text-muted">
                {porcentaje(orden.comision_bps / 100)} de {usd(orden.monto_total)}
              </Text>
            </View>
            <Text className="text-body-md text-text-primary">
              −{usd(orden.comision_total)}
            </Text>
          </View>

          <View className="h-px bg-surface-border" />

          <View className="flex-row items-baseline justify-between">
            <Text className="text-body-md font-bold text-text-primary">Se invirtió</Text>
            <Text className="text-heading font-bold text-text-primary">
              {usd(orden.monto_invertido)}
            </Text>
          </View>

          {orden.comision_rationale ? (
            <Text className="text-caption leading-4 text-text-muted">
              {orden.comision_rationale}
            </Text>
          ) : null}
        </View>

        <View className="h-4" />
      </ScrollView>

      <AgenteFab />
    </SafeAreaView>
  );
}
