# Parte de Jonathan — Sistema visual, comparador y simulador

**Reparto (§3 y §6 del plan):** sistema visual de Brokeate + `GET /api/catalog/rates` +
`ComparadorPage` + `SimuladorPage`. Estado: **completo y verificado** (tsc limpio,
bundle web compila, 55 tests del backend en verde, endpoint probado en vivo).

---

## 1. Tokens de diseño (`tailwind.config.js`)

La paleta exacta del prototipo Brokeate, extraída de su `App.tsx` (`const C`):
azul marino `#14375E` / `#0A2540` dominante sobre blanco; verde `#1B8A5A`, ámbar
`#C77700` y rojo `#C0362C` **solo semánticos** (éxito / advertencia / error), nunca
decorativos.

**La decisión clave:** se cambiaron los *valores* manteniendo los *nombres* de los
tokens (`brand-primary`, `state-success`, `surface-border`…). Resultado: todas las
pantallas existentes de Diego y Erick adoptan el look de Brokeate con solo hacer
`git pull` — nadie tuvo que tocar su código.

Tokens nuevos disponibles para todos:

- `perfil-conservador` / `perfil-moderado` / `perfil-agresivo` — el color por perfil de
  riesgo del prototipo (navy / ámbar / rojo).
- `brand-ink` (titulares), `brand-mid` y `brand-pale` (azules de gráficos), `brand-gold`
  (el segmento "Oro" de los donuts).
- `stateAlpha-successSoft` / `-warningSoft` / `-errorSoft` — los fondos tenues de badges.

## 2. Componentes compartidos (`src/components/shared/`)

- **Nuevos:** `Boton.tsx` (primario navy / secundario tinte azul, con estado de carga) y
  `Tarjeta.tsx` (la tarjeta base: blanca, borde suave, esquinas 2xl). Base común para
  que las pantallas de subcuentas, agente y catálogo se vean de la misma familia.
- **Reestilizados:** `EstadoBadge` (aprobada ahora es verde semántico), `Estados`
  (spinner navy), `DisclaimerBanner` (ícono ámbar). `Calificacion.tsx` **no se tocó por
  dentro**, como manda el reparto: el pie con calificadora + fecha sigue siendo
  inseparable del rating.
- **`src/constants/colores.ts`:** la misma paleta para props que no aceptan clases
  (iconos, spinners, SVG), con `COLOR_PERFIL` y `COLORES_GRAFICO`.
- Swap mecánico de los hex del tema viejo (`#1E3A8A` → `#14375E`, etc.) en
  `RootNavigator`, `DonutPortafolio` y páginas existentes — solo strings de color,
  cero cambios de estructura.

## 3. Backend: `GET /api/catalog/rates` (`?monto=&plazo_dias=`)

Archivos: `src/routes/catalog_routes.py` · `src/controllers/catalog_controller.py` ·
`src/models/catalog.py` (+ registro en `main.py`).

Lectura pura sobre `instruments` + `institutions` — **no toca el schema ni el motor de
scoring**. Por cada producto devuelve: institución, calificación **con fuente y fecha**
(criterio de antialucinación: el dato viaja citado), tasa, plazo, mínimo de acceso, y:

- **`elegible` + `motivo_no_elegible`:** aplica la misma regla que valida
  `v_institution_eligibility` (`rating_tier <= max_rating_tier` del perfil del usuario
  del token, con la versión de reglas con la que se perfiló). El motivo es el
  `rationale` **versionado** de `profile_institution_rules`, no un texto inventado en
  el front. Los no elegibles **no se filtran: se marcan**.
- **`interes_estimado` + `monto_final`:** si el request trae `?monto=`, los calcula
  **Postgres** (regla 4 del equipo: ningún USD se multiplica en React).

Probado en vivo con Juan Pérez (`juan@demo.ec`): responde `perfil: moderado` y las
tasas ordenadas por calificación. Los 55 tests siguen pasando.

## 4. `ComparadorPage`

Fiel al comparador del prototipo: tabla ordenada por calificación (la ordena el
backend), cada fila con el componente `Calificacion` (imposible mostrar un rating sin
su calificadora y fecha), filtro por plazo, chip con el perfil del usuario, y la nota
educativa **"A mayor tasa, mayor riesgo"**.

Los productos que el perfil no puede tocar salen **en gris, con candado y la regla que
los bloquea** — enseñar la regla trabajando vale más que esconder la fila. Con el
usuario conservador se ve a `DPF Loja 360` (la mejor tasa, 9,4 %) bloqueada por su
calificación AA: la tensión tasa/riesgo hecha pantalla.

Ruta: `navigation.navigate('Comparador', { monto? })` — con monto, las tasas llegan
con interés calculado.

## 5. `SimuladorPage`

Monto (input + chips rápidos) y plazo (180/360/720 días). Cada cambio dispara, con
debounce de 400 ms, una nueva llamada a `/api/catalog/rates?monto=&plazo_dias=`:
**el front no calcula nada**, si el backend se apaga el simulador muestra error en vez
de números viejos.

Resultado: tarjeta destacada con la **mejor opción elegible** para el perfil (monto
final, tasa, capital vs. intereses, y la fuente de la calificación), lista compacta de
las demás opciones (las bloqueadas en gris con su motivo), y el pie fijo *"Datos
referenciales · no garantiza rentabilidad · el asesor aprueba antes de ejecutar"*.

Ruta: `navigation.navigate('Simulador')`.

## 6. Arreglos de paso (desbloqueos para el equipo)

- **`@react-navigation/bottom-tabs`** faltaba en `package.json` y rompía
  `tsc --noEmit` para todos → instalado (hagan `npm install` después del pull).
- **`pytest` y `pytest-asyncio`** faltaban en el entorno → sin ellos fallaban 5 tests
  del agente que en realidad estaban bien (ya están en `requirements.txt`).
- Las pantallas aún **no tienen botón de entrada**: el punto de enganche es de Diego
  (`navigation.navigate('Comparador', { monto? })` y `navigation.navigate('Simulador')`
  desde `SubcuentaDetallePage` o el Home).

## 7. Cómo probarlo

```powershell
# backend            # frontend
cd c:\ROBOADVISORY-BACKEND        cd c:\RoboAdvisorApp
.\.venv\Scripts\Activate.ps1      npx expo start   (w = web, o QR con Expo Go)
uvicorn src.main:app --reload --host 0.0.0.0
```

1. Login `juan@demo.ec` / `demo1234` (Moderado) → botones **Comparar tasas** y
   **Simular** en el inicio.
2. Para ver la elegibilidad bloqueando: perfilarse como conservador
   (`inversionista@demo.ec` / `demo1234`, respuestas cautas) → Banco Loja y VisionFund
   salen en gris con la regla.
