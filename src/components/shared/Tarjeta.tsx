import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * La tarjeta base de Brokeate: blanca, borde suave, esquinas 2xl.
 * Todas las superficies elevadas de la app parten de aquí para que
 * el comparador, las subcuentas y el agente se vean de la misma familia.
 */
export default function Tarjeta({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={`rounded-2xl border border-surface-border bg-surface-background p-4 ${className}`}>
      {children}
    </View>
  );
}
