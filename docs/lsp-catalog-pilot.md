# Catálogo inicial de LSP y protocolo piloto — Hito 2

## Fuente y estado

Ministerio de Educación del Perú (2015), *Lengua de Señas Peruana: guía para el aprendizaje de la lengua de señas peruana, vocabulario básico*. [Repositorio oficial](https://repositorio.minedu.gob.pe/handle/20.500.12799/5545). La ficha bibliográfica también consta en [ALICIA / CONCYTEC](https://alicia.concytec.gob.pe/vufind/Record/MIIN_a99ba3532e88df544c391ae31f16f5e5/Details).

Las configuraciones y páginas se incorporan según la especificación proporcionada para este hito. La consulta directa del repositorio MINEDU estuvo bloqueada por su verificación de seguridad durante esta implementación; no se afirma haber verificado sus ilustraciones. Para Uno, Dos, Cuatro y Cinco las instrucciones remiten a la postura ilustrada en la página 73, sin sustituirla por una configuración genérica de otra lengua. Tres conserva la configuración solicitada de pulgar, índice y medio extendidos.

Las diez entradas comienzan con `validationStatus: 'pending'`. Una referencia documental y una captura técnicamente suficiente no equivalen a validación lingüística por expertos. La interfaz mantiene este estado pendiente; una futura validación necesitará un proceso independiente con evidencia de revisión. Las menciones a la mano derecha en las instrucciones proceden de la especificación de referencia: no se fuerza una mano en la captura, no se cambia la lateralidad del detector y no se genera una variante para personas zurdas o diestras sin revisión previa.

## Estructura final

| ID estable | Nombre | Tipo | Manos esperadas | Duración inicial | Página |
| --- | --- | --- | --- | --- | --- |
| LSP-001 | Uno | Estática | 1 | 1500 ms | 73 |
| LSP-002 | Dos | Estática | 1 | 1500 ms | 73 |
| LSP-003 | Tres | Estática | 1 | 1500 ms | 73 |
| LSP-004 | Cuatro | Estática | 1 | 1500 ms | 73 |
| LSP-005 | Cinco | Estática | 1 | 1500 ms | 73 |
| LSP-006 | Sí | Dinámica | 1 | 2500 ms | 134 |
| LSP-007 | Nada | Dinámica | 1 | 2500 ms | 134 |
| LSP-008 | Mucho | Dinámica | 2 | 3000 ms | 134 |
| LSP-009 | Solo | Dinámica | 1 | 2500 ms | 135 |
| LSP-010 | Con | Dinámica | 2 | 3000 ms | 135 |

`signCatalog.ts` define las diez entradas; cada una guarda `category: 'lsp'`, nombre, descripción, tipo, manos esperadas, duración, instrucciones, enlace documental, estado pendiente y `sourceReference: {title, publisher, year, page, repositoryUrl}`. El operador cambia la duración de cada entrada entre 500 y 10000 ms desde **Configurar duración**; no se reinicia al recargar, abrir otra conexión o restaurar un respaldo nuevo. Cada muestra conserva en `captureMetadata.labelSnapshot` la configuración usada al capturarla, incluida su duración y referencia, aunque luego cambie la duración del catálogo.

**NEG-001 · Ejemplos negativos** está en otro grupo del selector, con `category: 'negative'` y `validationStatus: 'not-applicable'`. No es la undécima seña LSP ni entra en el contador de diez. Duración inicial: 2500 ms. `expectedHands: 0` significa sin requisito (cero, una o dos manos); permite registros reales de reposo, movimientos ajenos al catálogo, gestos desconocidos o ausencia de manos visibles. No se generan ejemplos ni se entrena un clasificador.

## Incorporación segura del catálogo anterior

El catálogo anterior tenía los IDs `sign-01` a `sign-10`, inicialmente vacíos pero editables. No existe evidencia para equipararlos con los números del nuevo catálogo.

- Una base nueva recibe las diez entradas LSP y NEG-001, sin participantes ni muestras.
- Al abrir una base existente, una única transacción añade solo los IDs nuevos que falten. Conserva los diez espacios anteriores, sus metadatos y todas sus muestras. No escribe en los almacenes `samples` o `sequences`.
- La operación es idempotente y no cambia la versión 1 de IndexedDB. No sobrescribe duraciones ya configuradas de las entradas nuevas.
- Al importar un respaldo v1 anterior, primero se valida todo el archivo. La restauración explícita conserva sus etiquetas y muestras e incorpora los IDs nuevos que falten en la misma transacción.
- La tabla **Catálogo anterior conservado · correspondencias pendientes** muestra los IDs, nombres originales y cantidades reales de muestras. Todas las correspondencias quedan **sin asignar**. No se deduce una equivalencia por nombre, posición o número.
- Antes de cualquier futura reetiquetación: descargar respaldo, revisar cada secuencia y su etiqueta original, documentar una propuesta de correspondencias y obtener su revisión. Esta implementación no aplica correspondencias ni cambia `labelId`, repeticiones o `labelSnapshot` históricos.

Las pruebas simulan una base y un respaldo anteriores con datos exclusivamente de prueba; verifican conservación exacta y reapertura. No se ha inventariado ni modificado el IndexedDB personal de un participante en esta tarea.

## Piloto físico: 24 muestras previstas

**Estado: pendiente de ejecución con participantes y webcam reales.** No se crean muestras para simular este resultado. Las secuencias sintéticas de la batería de pruebas viven exclusivamente en bases aisladas de `fake-indexeddb`.

1. En `.env.development.local`, configurar `VITE_ENABLE_DATA_COLLECTION=true`. Ejecutar `npm.cmd run dev` y abrir `/herramientas/dataset` en la dirección que muestre Vite.
2. Si hay datos anteriores, descargar un respaldo antes de comenzar. Mantener una sola pestaña del Studio. Usar buena iluminación, encuadre estable y espacio para ambas manos; comprobar la guía de referencia antes de ejecutar las señas.
3. Crear dos participantes anónimos mediante **+**. Usar sus IDs reales asignados, que pueden no ser P001/P002 si ya existe historial. Explicar el tratamiento local de los landmarks y registrar el consentimiento de cada participante. Confirmarlo otra vez al cambiar de persona o recargar.
4. Para cada participante, completar tres repeticiones independientes de cada entrada de la tabla siguiente. Mantener las duraciones iniciales para comparar el piloto; si hace falta cambiarlas, registrar la decisión y conservar la duración efectiva de cada muestra.

| Entrada | Ejecución a observar | Manos | Duración | Repeticiones por participante | Total entre ambos |
| --- | --- | --- | --- | --- | --- |
| LSP-001 · Uno | Postura estática según página 73 | 1 | 1500 ms | 3 | 6 |
| LSP-003 · Tres | Postura estática con pulgar, índice y medio extendidos, según página 73 | 1 | 1500 ms | 3 | 6 |
| LSP-006 · Sí | Puño derecho vertical y movimiento de muñeca de arriba hacia abajo, según página 134 | 1 | 2500 ms | 3 | 6 |
| LSP-008 · Mucho | Abrir y cerrar las yemas de los dedos de ambas manos simultáneamente, según página 134 | 2 | 3000 ms | 3 | 6 |
| **Resultado previsto** | **4 señas × 2 participantes × 3 repeticiones** | | | | **24** |

5. Activar la cámara y elegir el tiempo de preparación. El valor inicial es **Sin espera** para señas de una mano y **3 s** para las de dos manos. Pulsar **Grabar muestra** y acomodar las manos antes de que comience la captura. Mantener la postura estática durante todo el intervalo o realizar el movimiento dinámico completo dentro de la ventana.
6. Revisar cada secuencia con el deslizador: timestamps, lateralidad original, cantidad de manos simultáneas, huecos y duración observada. La vista está en espejo y el JSON conserva las coordenadas originales. Para Mucho, dos manos presentes en momentos separados no sustituyen dos manos simultáneas por observación.
7. Guardar explícitamente como pendiente. Si falta una mano, hay pérdidas significativas, timestamps repetidos o cobertura insuficiente, repetir. Se puede conservar una captura técnicamente débil como pendiente tras reconocer el aviso, pero no contarla como una repetición satisfactoria del piloto. Cancelar o interrumpir la cámara no guarda una muestra parcial.
8. Si se conservan intentos fallidos para diagnóstico, su cantidad se informa aparte y el total de archivos puede superar 24. No eliminar datos anteriores para ajustar un contador. Registrar los IDs de las 24 repeticiones previstas, diferenciando cualquier muestra previa o intento adicional.
9. Descargar respaldo y exportación JSON. Comparar los IDs de participante/seña/muestra, las tres repeticiones por combinación y los timestamps de cada secuencia. Para verificar restauración sin sustituir el dataset de trabajo, usar otro perfil de navegador/origen vacío, importar el respaldo y revisar cantidades, secuencias, referencias y estados.

Registrar por separado el entorno de cámara/navegador, los IDs anónimos usados, los IDs de muestra seleccionados, duraciones modificadas, avisos y tomas repetidas. No registrar identidades ni inferir dominancia manual a partir de la lateralidad detectada. Una muestra **revisada por operador** acredita revisión técnica; todas las etiquetas LSP siguen pendientes de revisión lingüística.

Las comprobaciones de interrupción, retirada de una mano en Mucho y ejemplos negativos se realizan como pruebas adicionales identificadas; no forman parte de las 24 repeticiones previstas. La ausencia de fallos en pruebas automatizadas no certifica la ejecución física ni la corrección lingüística. El entrenamiento queda fuera de este hito.

## Verificación técnica

- `npm.cmd run build`: aprobado con Dataset Studio desactivado; no incluye su módulo de interfaz.
- `$env:VITE_ENABLE_DATA_COLLECTION = 'true'; npm.cmd run build`: aprobado con el catálogo y la interfaz incluidos.
- `npx.cmd tsc -b --pretty false`: aprobado; el build también ejecuta TypeScript.
- `npm.cmd run lint`: aprobado.
- `npm.cmd test`: 136 pruebas aprobadas. La ejecución paralela produjo avisos de acceso concurrente a la caché de Vite en Windows.
- `node --experimental-strip-types --test --test-concurrency=1 scripts/*.test.mjs`: las mismas 136 pruebas aprobadas, sin los errores de caché de la ejecución paralela.

Las pruebas incluyen los datos originales del canal fresco, secuencias estáticas y dinámicas de una y dos manos, categoría negativa, pérdida de manos, timestamps repetidos, duración observada, persistencia individual, IDs y fuente, migración aditiva e importación/exportación JSON con muestras anteriores intactas. También pasan las pruebas existentes de MediaPipe, progreso, perfil y temas. No certifican capturas físicas ni corrección lingüística.

## Archivos de esta configuración

- `src/features/sign-recognition/dataset/signCatalog.ts`: diez entradas, fuente, categoría negativa, identidad estable y adiciones del catálogo.
- `src/features/sign-recognition/dataset/datasetTypes.ts`: categorías, referencia documental, timestamps originales y versión de política de calidad.
- `src/features/sign-recognition/dataset/datasetStore.ts`: incorporación aditiva, restauración compatible y contador exclusivo de entradas LSP.
- `src/features/sign-recognition/dataset/datasetExport.ts`: validación e intercambio JSON de catálogos nuevos y anteriores.
- `src/features/sign-recognition/dataset/datasetCapture.ts`: secuencias originales, timestamps e incidencias de resultados repetidos/desordenados.
- `src/features/sign-recognition/dataset/datasetValidation.ts`: advertencias técnicas, conservación de la política histórica y ejemplos negativos.
- `src/features/sign-recognition/dataset/useDatasetCapture.ts`: inicio con requisito de manos configurable para la categoría negativa.
- `src/components/dataset/SignSelector.tsx`: grupos del selector, referencia, duración editable y revisión de correspondencias anteriores.
- `src/components/dataset/RecordingPanel.tsx`: instrucciones, aclaración de espejo/lateralidad y captura negativa.
- `src/components/dataset/SampleReview.tsx`: avisos ampliados y requisito de manos explícito.
- `src/pages/DatasetStudioPage.tsx` y `src/pages/DatasetStudioPage.css`: selección inicial, revisión del catálogo anterior y presentación de categorías.
- `scripts/dataset-capture.test.mjs`, `scripts/dataset-store.test.mjs`, `scripts/dataset-ui.test.mjs` y `scripts/fixtures/dataset.mjs`: pruebas de catálogo, captura, persistencia, migración, intercambio JSON e interfaz.
- `docs/lsp-catalog-pilot.md` (nuevo), `docs/dataset-studio.md` y `README.md`: catálogo final, compatibilidad y protocolo físico.

La revisión visual automatizada de esta sesión quedó bloqueada: el servicio de control de navegador no estaba disponible y el control de Brave se detuvo al no poder determinar su URL con confianza. La interacción visual real y el piloto físico siguen pendientes; no se activó la cámara ni se crearon participantes o muestras en el navegador.
