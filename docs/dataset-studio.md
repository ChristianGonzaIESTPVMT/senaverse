# SeñaVerse Dataset Studio — Hito 2

## Habilitar la herramienta

Agrega a **`.env.development.local`**:

```dotenv
VITE_ENABLE_DATA_COLLECTION=true
```

Reinicia `npm.cmd run dev` y abre **`http://localhost:5173/herramientas/dataset`** si Vite indica el puerto 5173. Si anuncia otro puerto, usa esa dirección conservando `/herramientas/dataset`. La navegación directa y la recarga usan el fallback de SPA de Vite y el mismo registro de React Router.

**`.env.example` es solo una plantilla: Vite no lo carga.** Escribir `true` únicamente allí no habilita la herramienta. El archivo efectivo debe llamarse exactamente `.env.development.local`, estar en la raíz junto a `package.json` y contener el valor literal `true`. Está excluido de Git por `*.local` y habilita solo el modo de desarrollo; una compilación normal de producción no lo lee. No hace falta cambiar `vite.config.ts`, `package.json` ni el router.

Si la ruta vuelve a Inicio, comprueba primero ese archivo y reinicia Vite: con la variable ausente, `false` u otro valor, `App.tsx` no registra la ruta y el comodín `*` redirige a `/`. La comparación existente `import.meta.env.VITE_ENABLE_DATA_COLLECTION === 'true'` es deliberada. Las variables del proceso tienen prioridad: si la terminal contiene `$env:VITE_ENABLE_DATA_COLLECTION = 'false'`, elimínala con `Remove-Item Env:VITE_ENABLE_DATA_COLLECTION -ErrorAction SilentlyContinue` para que se use el archivo. Para deshabilitar la herramienta, cambia el archivo a `false` y reinicia Vite.

La ruta no aparece en el sidebar del estudiante. Si el valor no es exactamente `true`, el módulo y la ruta se excluyen del build. Una producción habilitada explícitamente mediante esa variable sí incluye la herramienta: **el indicador no es autenticación ni control de acceso**. No hay cuentas ni backend.

### Pruebas específicas de acceso

`node --experimental-strip-types --test scripts/dataset-access.test.mjs` comprueba la lectura real de los archivos de entorno por Vite, el caso de `.env.example` sin configuración efectiva, la prioridad de la variable del proceso y la separación entre desarrollo y producción. Usa entornos temporales aislados, sin editar la configuración local del proyecto.

También solicita la ruta directamente por HTTP dos veces y renderiza el `App` y `BrowserRouter` reales con esa URL en un entorno SSR aislado. Comprueba que `true` selecciona Dataset Studio y que `false` o la variable ausente dejan la ruta fuera del registro. En ambos casos verifica las rutas del estudiante, incluida Cámara libre, sin añadir enlaces públicos a la herramienta. Estas comprobaciones no son una prueba visual de recarga en un navegador ni activan la webcam o el IndexedDB del usuario. Las pruebas existentes de almacenamiento comprueban participantes, muestras, persistencia y conservación de respaldos anteriores en bases aisladas.

Verificación de esta corrección: las tres pruebas de acceso y la batería completa de **139 pruebas** aprobaron. La batería completa se ejecutó en serie con `node --experimental-strip-types --test --test-concurrency=1 scripts/*.test.mjs`. También aprobaron TypeScript y ESLint. El servidor iniciado con el archivo local real respondió HTTP 200 en `/` y en peticiones repetidas a `/herramientas/dataset`; el módulo `App.tsx` enviado al cliente contenía la variable con valor `true`. El control de navegador no estaba disponible, por lo que la navegación visual y la captura física no se verificaron.

## Flujo de uso

### Si la cámara no inicia

- Si **Activar cámara** está deshabilitado, el recuadro muestra el requisito pendiente: crear/seleccionar participante, registrar el consentimiento de la sesión, completar la etiqueta o esperar una operación de almacenamiento. Marcar la casilla de consentimiento requiere además pulsar **Registrar consentimiento**.
- Si el botón responde pero aparece un error al abrir el dispositivo, el problema es distinto del bloqueo por consentimiento. `NotReadableError` indica un fallo de acceso al dispositivo; no demuestra por sí solo que otra aplicación lo esté usando. Revisa la cámara seleccionada en el navegador, su conexión y su estado en Windows, y cierra otras aplicaciones que estén utilizándola. Si hay varias cámaras, selecciona una habilitada antes de reintentar.
- En Windows, el código 22 del Administrador de dispositivos significa que el dispositivo está deshabilitado. Cambiar la cámara seleccionada o habilitar un dispositivo son decisiones del operador; el Studio no modifica esos ajustes. No hace falta borrar IndexedDB ni repetir el registro de muestras para diagnosticar este error.

Referencias: [errores de getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#exceptions), [código 22 de Windows](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/cm-prob-disabled).

### Recopilar una secuencia

1. Pulsa **+** en Participantes. Se crea P001, P002, etc., sin pedir datos de identidad. Los IDs eliminados no se reutilizan, y el contador también se conserva en los respaldos.
2. Explica el procesamiento local y la posibilidad de eliminar los registros. Marca la casilla que confirma el consentimiento de la persona y pulsa **Registrar consentimiento**. La cámara está deshabilitada hasta entonces. Cada cambio de participante, recarga o restauración exige una nueva confirmación de sesión; la fecha y versión del consentimiento quedan en IndexedDB y en cada captura.
3. Selecciona una de las diez entradas **LSP-001 a LSP-010**, documentadas en el [catálogo y protocolo piloto](lsp-catalog-pilot.md). Todas comienzan **pendientes de revisión lingüística**, con título, entidad, año, página y enlace de la guía MINEDU de 2015. El selector separa los ejemplos negativos y cualquier catálogo anterior conservado. No se entrenan modelos.
4. La duración inicial es **1.5 s para estáticas**, **2.5 s para dinámicas de una mano** y **3 s para Mucho y Con**, editable entre 0.5 y 10 s por entrada desde el lápiz o **Configurar duración**. Cambiar una duración no altera otras entradas ni muestras anteriores. La identidad, el tipo, las manos y la fuente del catálogo LSP permanecen estables; no existe un control que declare estas diez entradas validadas sin revisión. Las etiquetas anteriores conservan su editor y estado originales.
5. Activa la cámara compartida. Cuando el detector tenga las manos esperadas y un resultado fresco, pulsa **Iniciar cuenta regresiva**. La cuenta dura tres segundos.
6. Ejecuta la seña durante el intervalo. Si faltan manos o dejan de llegar resultados, se muestra una advertencia y se registra la incidencia. Tras el intervalo hay hasta 120 ms para recibir resultados que ya estuvieran en curso y pertenecieran a esa grabación.
7. Revisa métricas y fotogramas con el deslizador. Puedes **Guardar como pendiente**, **Repetir** o **Descartar**. No hay guardado automático. Una captura de calidad insuficiente requiere una aceptación explícita adicional para conservarse como pendiente; una secuencia sin suficientes datos de manos no puede guardarse.
8. Las muestras guardadas pueden inspeccionarse, marcarse como revisadas por el operador, descartarse de uso o eliminarse. Marcar una muestra revisada no valida la seña lingüísticamente. Las muestras de calidad insuficiente no pueden marcarse aceptadas. Eliminar una muestra o un participante requiere confirmación; eliminar un participante borra también sus secuencias locales.
9. Usa **Exportar dataset JSON** o **Descargar respaldo**. Ambos contienen el esquema completo y todos los estados de revisión; `exportType` distingue su finalidad. **Importar / restaurar JSON** valida todo el archivo, muestra sus cantidades y pide confirmar antes de sustituir el dataset local completo. No fusiona datasets. Al restaurar un respaldo v1 anterior, se conservan sus diez etiquetas y todas sus muestras, y se añaden las once entradas nuevas que falten sin asumir correspondencias.

Las selecciones de participante/etiqueta quedan bloqueadas durante la captura y mientras exista un borrador pendiente, para no cambiar su etiqueta accidentalmente. Cancelar, navegar o interrumpir la cámara descarta la captura incompleta. Una repetición guardada recibe su número de forma transaccional por participante y etiqueta. Cambiar los metadatos del catálogo no reetiqueta muestras anteriores: cada una conserva `labelSnapshot`.

## Reutilización del Hito 1 y origen de los datos

`RecordingPanel` renderiza exactamente un `PracticeCamera`. No abre otra webcam, no construye otro Hand Landmarker y no crea otro Worker. Usa el mismo ciclo optimizado, GPU con alternativa CPU, Canvas y cierre de recursos existentes.

Se añadió el canal opcional `onFreshInference` a `detectionSession → useHandDetection → PracticeCamera`. Se emite una sola vez después de aceptar una inferencia real del Worker. Los redibujados, el cambio de tamaño y los puntos retenidos por continuidad visual no emiten observaciones de recopilación.

Cada evento incluye el resultado real de MediaPipe, timestamps monotónicos y la configuración técnica efectiva. El controlador de captura vuelve a rechazar resultados de más de 120 ms, timestamps repetidos/desordenados, resultados fuera del intervalo y datos incompletos. Los timestamps repetidos/desordenados se registran como incidencias y se advierten en la revisión, sin duplicar observaciones. Copia los datos para que un cambio posterior no modifique una muestra.

Los campos se verificaron contra `vision.d.ts` de **`@mediapipe/tasks-vision@1.2.3`**: se usa `handedness` con sus categorías `score`, `index`, `categoryName`, `displayName`, además de `landmarks` y `worldLandmarks`. Se conservan las coordenadas x/y/z; no se inventan world landmarks ni lateralidades ausentes. El modelo es Hand Landmarker Full FP16, versión 1, con SHA-256 registrado en la exportación.

Una inferencia fresca con cero manos también es una observación real: se guarda con `handCount: 0` y `hands: []`, sin puntos inventados. Esto permite calcular honestamente el porcentaje de observaciones con manos esperadas. No se interpola ni se duplica un fotograma para alcanzar una frecuencia nominal.

`timestampMs` es relativo al inicio de la ventana de grabación y procede del reloj monotónico del Hito 1 al observar el fotograma. No pretende ser el timestamp físico de exposición del sensor. La ventana real está en `durationMs`, y el tiempo entre la primera y última observación está separado como `qualityMetrics.observedDurationMs`. La frecuencia medida es `(N − 1) / intervalo observado`, sin presuponer 30 FPS.

## Calidad y revisión

Los límites iniciales, centralizados en `datasetTypes.ts`, son ocho observaciones, 10 observaciones/s, al menos 80% con el número esperado de manos y 70% de cobertura temporal. También se advierten lateralidades ausentes e intervalos superiores a 250 ms entre resultados. La política de calidad 2 añade avisos por cualquier mano necesaria ausente, resultados duplicados/desordenados/inválidos y falta de datos al inicio o al final. Una caída desde el número esperado cuenta como pérdida de seguimiento; los huecos sin resultados se registran aparte. La cobertura observada insuficiente se indica explícitamente. Una captura interrumpida se cancela y avisa que no se guardó una muestra incompleta.

`NEG-001` es una categoría técnica de ejemplos negativos, independiente de las diez señas oficiales seleccionadas. Su valor inicial `expectedHands: 0` significa **sin requisito de manos (0–2)**, no «prohibir manos». Permite secuencias reales sin manos visibles, manos en reposo y movimientos ajenos al catálogo; nunca inventa puntos. La duración, el tipo y el requisito de manos se pueden configurar. Su validación lingüística es `not-applicable` y no incrementa el contador de señas LSP configuradas.

Estas reglas son filtros técnicos de recopilación, no una medida de precisión ni una comprobación de la ejecución de LSP. Todos los ejemplos se etiquetan por el operador y comienzan como `pending`. La validación del contenido lingüístico sigue siendo independiente.

## Almacenamiento

Base **IndexedDB `senaverse-dataset-studio`**, versión 1, en el perfil y origen actuales del navegador:

- `meta`: datasetId, fechas, contador de participantes, esquema y configuración/modelo.
- `participants`: identificadores y registro de consentimiento.
- `signs`: diez entradas LSP, una categoría técnica negativa y, cuando existen, las diez etiquetas anteriores intactas. La incorporación es aditiva e idempotente al abrir la base; no cambia su versión ni escribe en `samples` o `sequences`.
- `samples`: metadatos, calidad, incidencias y revisión, con índices por participante, etiqueta y repetición.
- `sequences`: arrays de fotogramas, separados de los resúmenes para no cargarlos todos al listar muestras.

Guardar/borrar/restaurar utiliza transacciones. Se confirma el éxito tras el commit; si una escritura falla se revierte toda la operación. No se almacena el dataset en localStorage. IndexedDB no necesita servicios externos y los recursos del detector siguen sirviéndose localmente.

## Formato JSON v1

El nivel raíz incluye `schemaVersion`, `datasetId`, `createdAt`, `collectedAt` —primera grabación, o null sin muestras—, `exportedAt`, `nextParticipantNumber`, `captureConfiguration`, `mediaPipeModel`, `exportType`, `participants`, `signs` y `samples`.

Cada muestra incluye:

```text
sampleId, labelId, participantId, repetition, recordedAt, durationMs
frames: [
  { timestampMs, sourceTimestamps?: {capturedAtMs,inferenceTimestampMs,receivedAtMs}, handCount, hands: [
    { handedness: [{score,index,categoryName,displayName}],
      landmarks: [{x,y,z}, ... 21],
      worldLandmarks?: [{x,y,z}, ... 21] }
  ] }
]
incidents: [{timestampMs, type}]
qualityMetrics: recuentos, ratio de manos esperadas, duración observada,
                frecuencia, pérdidas, advertencias y suficiencia técnica
captureMetadata: configuración efectiva, modelo, labelSnapshot,
                 consentimiento, duración solicitada y completed,
                 qualityPolicyVersion?, recordingStartedAtMs?, coordinates?, visualMirrored?
reviewStatus: pending | accepted | rejected
```

Los arrays conservan su orden y los timestamps son estrictamente crecientes dentro de cada repetición. Las nuevas capturas conservan además los tres timestamps monotónicos originales del canal Worker y el inicio de la grabación; la importación comprueba su relación con el timestamp relativo. No son timestamps físicos de exposición del sensor. Se preservan los números finitos sin redondear las coordenadas. El cero negativo se representa como cero, de acuerdo con el formato JSON habitual. La vista de inspección y la cámara están reflejadas (`visualMirrored: true`), pero `inputMirrored` permanece false y `coordinates: 'mediapipe-original'` indica que no se invierten ni normalizan los datos al capturarlos.

Ejemplo de lectura posterior, sin entrenamiento ni aplanar las secuencias:

```python
import json

with open("dataset.json", encoding="utf-8") as source:
    dataset = json.load(source)
for sample in dataset["samples"]:
    times_ms = [frame["timestampMs"] for frame in sample["frames"]]
    sequence = [frame["hands"] for frame in sample["frames"]]
```

La importación rechaza esquemas desconocidos, campos adicionales —incluidos datos de identidad no admitidos—, referencias rotas, IDs/repeticiones duplicados, timestamps inválidos, coordenadas no finitas, manos sin 21 puntos y métricas inconsistentes. Las adiciones opcionales mantienen `schemaVersion: 1`: se admiten respaldos anteriores con exactamente los diez IDs `sign-01` a `sign-10`, y los nuevos con las diez entradas LSP más `NEG-001` y las etiquetas anteriores que conserven. Los clientes anteriores no pueden importar los nuevos catálogos. Las muestras históricas sin `qualityPolicyVersion` se verifican con la política original; sus coordenadas, métricas, etiquetas y estados no se reescriben. No se implementa migración desde otros esquemas/modelos. Los archivos de importación y respaldo tienen un límite de 100 MB para acotar el uso de memoria. No se genera un respaldo que esta misma versión no pueda restaurar.

## Pruebas y validación manual pendiente

Comandos: `npm.cmd run build`, `npx.cmd tsc -b --pretty false`, `npm.cmd run lint`, `npm.cmd test`. Las pruebas incluyen las diez entradas y sus páginas, duraciones independientes persistidas, identidad estable, categorías separadas, participantes/consentimiento, secuencias de una y dos manos, cero manos, rechazos por antigüedad/duplicados, independencia de las copias, calidad, IndexedDB, borrado en cascada, rollback por cuota simulada, incorporación aditiva al abrir una base v1, conservación exacta de muestras históricas, exportación/restauración y renderizado de las interfaces. Las pruebas del canal fresco verifican que no recibe redibujados ni resultados obsoletos. También se compara la procedencia exportada con la versión del SDK instalada y el hash del archivo de modelo real.

`fake-indexeddb` es una dependencia exclusivamente de desarrollo para probar las transacciones en Node. No se utiliza en el navegador ni en el paquete del Studio. Se comprobaron builds con la bandera ausente y con activación explícita; el primero excluye el Studio.

Las pruebas de captura usan resultados sintéticos y las de almacenamiento usan una implementación de IndexedDB para pruebas. **No equivalen a una recopilación física con participantes.** Queda pendiente completar este recorrido con webcam en Brave:

1. Confirmar que la cámara no puede activarse antes del consentimiento y que no se guarda nada sin pulsar Guardar.
2. Completar el [piloto físico de Uno, Tres, Sí y Mucho](lsp-catalog-pilot.md), con dos participantes y tres repeticiones por seña: 24 muestras previstas.
3. Retirar manos durante una toma, revisar la advertencia, los ceros reales y el porcentaje reducido.
4. Cancelar a mitad de cuenta/grabación, cambiar de página y comprobar que se apaga la webcam sin guardar una toma parcial.
5. Guardar varias repeticiones y cambiar entre P001/P002, confirmando nuevamente cada consentimiento.
6. Inspeccionar fotogramas, eliminar una captura y eliminar un participante con sus muestras.
7. Descargar respaldo, importarlo tras confirmar la sustitución y comprobar IDs, cantidades, puntos, tiempos y estados de revisión.

Límites: el almacenamiento depende de la cuota del navegador y puede borrarse al limpiar sus datos; los respaldos descargados deben gestionarse por separado. Exportar/importar JSON usa memoria proporcional al archivo. Conviene usar una sola pestaña del Studio durante la recopilación. Las cuotas reales y las capturas físicas requieren validación en hardware real; las pruebas sintéticas no completan el piloto ni validan las señas lingüísticamente.

## Archivos de este hito

**Creados:** `.env.example`; `src/pages/DatasetStudioPage.tsx` y `.css`; los cinco archivos bajo `src/components/dataset/` (`ParticipantSelector`, `SignSelector`, `RecordingPanel`, `SampleReview`, `DatasetStatistics`); los siete bajo `src/features/sign-recognition/dataset/` (`datasetTypes`, `datasetStore`, `datasetCapture`, `datasetValidation`, `datasetExport`, `signCatalog`, `useDatasetCapture`); tres pruebas `scripts/dataset-*.test.mjs`, `scripts/fixtures/dataset.mjs` y esta guía.

**Modificados:** `src/App.tsx` para la ruta condicionada; `PracticeCamera.tsx`, `useHandDetection.ts`, `detectionSession.ts`, `types.ts` para la suscripción opcional fresca; `scripts/hand-detection.test.mjs` para verificar su aislamiento; `package.json` y `package-lock.json` para la dependencia de pruebas; `README.md` para enlazar esta guía. No se modifican lecciones, reglas de XP, pantallas de práctica, el catálogo educativo ni Situaciones.

Referencias: [IndexedDB y transacciones](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [fake-indexeddb](https://github.com/dumbmatter/fakeIndexedDB). Los tipos MediaPipe se verificaron en el paquete instalado, no se dedujeron de una API diferente.
