# Hito 6.4, fase 3 · Preparación del dataset V2

Dataset Studio está preparado para recopilar las diez clases actuales con participantes independientes. La guía guarda 32 tomas previstas por persona, sus dos sesiones, el consentimiento de cada captura, la mano declarada, las revisiones y, cuando corresponde, el subtipo de `NEG-001`. El respaldo ampliado de 505 tomas aún aporta un solo participante. Hace falta completar las particiones de validación y prueba final antes del entrenamiento V2.

## Participantes y sesiones

Conserva los dos JSON históricos fuera de la carpeta pública. Trabaja con el mismo dataset de Studio. Si el navegador está vacío, puedes importar el respaldo de 505 tomas o combinar el conjunto completo desde bloques. Si ya contiene esas tomas, conserva el almacenamiento actual y verifica un respaldo completo antes de empezar.

| Disponibilidad | Entrenamiento | Validación | Prueba final |
|---|---|---|---|
| Seis personas nuevas | P001 elegible + dos personas nuevas, por ejemplo P002 y P003 | P004 y P005 | P006 y P007 |
| Cuatro personas nuevas | P001 elegible | P002 y P003 | P004 y P005 |

Los identificadores de la tabla son ejemplos. Registra cada persona una sola vez y guarda la asignación antes de su primera toma. Las dos sesiones usan el mismo ID y la misma partición. La aplicación bloquea el cambio de partición cuando el ID ya tiene tomas. Si se usan varios navegadores, crea primero los identificadores de forma coordinada. Dos perfiles vacíos podrían generar el mismo identificador para personas distintas. La combinación reporta el conflicto de identidad sin renumerar las tomas.

1. Abre Dataset Studio en el servidor local de desarrollo, con `VITE_ENABLE_DATA_COLLECTION=true`. Crea un identificador con **Crear participante anónimo**.
2. En **Guía de capturas V2**, asigna **Entrenamiento**, **Validación** o **Prueba final**. Selecciona **Guía · sesión 1** en **Modo de captura**.
3. Confirma el consentimiento en **Participantes** y pulsa **Registrar consentimiento**. El permiso de cámara del navegador se solicita aparte.
4. Selecciona una toma de la lista. En las tomas de una mano, indica la mano realmente utilizada. En las de dos manos y sin manos, la guía registra la condición de captura y la compara con los fotogramas. Añade observaciones del movimiento sin incluir datos personales.
5. Activa la cámara, comprueba el encuadre y graba. Revisa la calidad y la secuencia antes de guardar. La grabación queda **Pendiente de decisión**. En **Muestras guardadas**, abre **Revisar**. Ahí puedes actualizar la anotación del movimiento, **Aceptar muestra** y **Marcar como revisada por operador**. El contador avanza con una toma aceptada, revisada, sin exclusión y con la mano de la casilla, cuando corresponde. Las tomas rechazadas o excluidas se pueden repetir conservando los registros previos.
6. En la siguiente sesión, selecciona el mismo ID y **Guía · sesión 2**. Confirma de nuevo el consentimiento. La lista se reconstruye a partir de las tomas guardadas y conserva el avance después de recargar.
7. Descarga y verifica los bloques al cerrar cada sesión o, si necesitas un respaldo de todo el almacén, después de revisar las tomas. Mantén los archivos de prueba final separados y congelados. Usa validación para elegir umbrales y corregir errores. Ejecuta la evaluación final con el modelo ya fijado.

## Plan de las 32 tomas

| Tipo | Sesión 1 | Sesión 2 | Duración por toma |
|---|---|---|---|
| Uno a Cinco | Derecha, izquierda, derecha, izquierda, derecha | Izquierda, derecha, izquierda, derecha, izquierda | 2 000 ms |
| Sí, Nada y Solo | Una ejecución de cada una | Una ejecución de cada una | 2 500 ms |
| Mucho y Con | Una ejecución de cada una | Una ejecución de cada una | 3 000 ms |
| Negativos de una mano | Índice inmóvil, recorrido recto del índice, pinza inmóvil | Giro incompleto, pinza con dirección incorrecta | 2 500 ms |
| Negativos de dos manos | Movimiento similar a Mucho, transición | Movimiento similar a Con, configuración parecida a un número, gesto ajeno al catálogo | 2 500 ms |
| Negativos sin manos | Una toma con el encuadre vacío | Una toma con el encuadre vacío | 2 500 ms |
| Total | 16 | 16 | |

La guía permite cambiar el subtipo de un negativo por otro compatible con la cantidad de manos esperada. Las 12 tomas negativas conservan `NEG-001` como única etiqueta principal. Si el gesto ejecutado es una seña válida del catálogo, registra esa seña con su propia etiqueta. Para probar una configuración de dos manos parecida a los números, usa una postura fuera del catálogo.

- **Nada.** Revisa el movimiento completo y anota su dirección, inicio y fin. La dirección medida con landmarks requiere revisión lingüística para confirmar la ejecución.
- **Solo.** Registra el giro completo. Mantén separados los negativos de índice inmóvil, recorrido recto y giro incompleto.
- **Sí.** Comprueba que la secuencia muestra el inicio, la flexión y el retorno.
- **Lateralidad.** Compara la mano declarada con la del detector y revisa los cambios de lateralidad en la secuencia. Una discrepancia del detector puede deberse a clasificación o a un cambio real. Si la toma de Uno a Cinco usa una mano distinta de la prevista, queda registrada y la casilla de esa mano requiere repetición.

## Exportar, verificar y combinar

1. En **Bloques verificables**, selecciona **Todas las muestras**, **Participante** o **Sesión de un participante**. Para una selección arbitraria, marca las tomas en la tabla y pulsa **Exportar selección por bloques**.
2. Elige un máximo de **10, 25, 50 o 90 MiB**. El valor inicial es 25 MiB. Pulsa **Preparar bloques** y descarga cada bloque numerado. El límite se aplica a los bytes UTF‑8 del archivo completo, incluido el encabezado y la codificación del JSON. Cada archivo queda por debajo de los 100 MiB de Dataset Studio.
3. Vuelve a seleccionar todos los archivos de cada lote y pulsa **Verificar archivos**. El verificador comprueba SHA-256 del contenido de cada bloque, numeración, total de bloques y tomas, esquema y consistencia de las referencias. Si buscas comprobar una copia completa de este navegador, usa **Verificar respaldo del almacén local**. Esta opción compara las tomas, los participantes y el catálogo con IndexedDB.
4. Usa **Combinar sin sustituir** para agregar lotes y JSON completos compatibles. Puedes usar un Studio vacío o el mismo dataset. Las tomas idénticas con igual `sampleId` se omiten. Si cambia el contenido del mismo ID, la identidad o partición de una persona, o dos tomas ocupan la misma repetición, se cancela toda la transacción. Conserva ambos archivos si hay un conflicto y revisa cuál es la copia autorizada. Durante una combinación, Studio conserva los ajustes de las etiquetas ya presentes y cada toma conserva su etiqueta original.
5. **Importar / restaurar JSON** es la operación de sustitución del único archivo completo. En un almacén con tomas o participantes, exige confirmar y comprobar primero un respaldo completo. Studio vuelve a cotejar el respaldo justo antes de sustituir el almacén. Exportar o verificar archivos no borra el almacenamiento local.

Los bloques conservan `sampleId`, repeticiones, etiquetas y su versión de captura, participantes, consentimientos, coordenadas, timestamps, incidencias, calidad, revisión y exclusiones reversibles. El hash verifica integridad del contenido. Guarda los archivos en un lugar privado fuera de `public/`. Conserva todos los bloques que correspondan al mismo lote y evita mezclar exportaciones de la misma toma cuyo estado de revisión cambió entre ambas. Las capturas antiguas mantienen su formato, sin sesiones, mano declarada ni subtipos inventados.

## Preparación experimental en Python

`ml/scripts/v2.py` admite varios `--dataset` en `readiness`, `prepare` y `compare`. Acepta bloques y exportaciones completas del mismo dataset. Verifica los bloques y reúne las tomas en memoria. No hace falta crear un JSON combinado de más de 100 MiB. Para mantener una comparación reproducible, conserva los mismos archivos de entrada con su contenido original. El orden de los argumentos no afecta la huella del conjunto.

El dataset de 355 tomas es la referencia congelada de `--baseline`. Para `--dataset` utiliza el respaldo de 505 más los bloques de las capturas incorporadas, o un respaldo nuevo que ya incluya todas. Mantén fuera de `--dataset` las copias antiguas que repitan una toma cuyo estado cambió.

```powershell
$py = '.\ml\.venv\Scripts\python.exe'
& $py ml/scripts/v2.py readiness --dataset 'RUTA_AL_BLOQUE_1.json' --dataset 'RUTA_AL_BLOQUE_2.json'
```

`readiness` es de solo lectura. Cruza la elegibilidad con la división congelada de V1, revisa las particiones por persona y resume las clases y los negativos por cantidad de manos y subtipo. Con los participantes de la guía, `prepare` exige tomas aceptadas y revisadas, las diez clases y `NEG-001` por partición, negativos de cero, una y dos manos, y al menos dos participantes elegibles tanto en validación como en prueba. La auditoría también detecta duplicados de secuencia aunque tengan IDs diferentes. Solo entrenamiento y validación se convierten en ventanas en `prepare`. La prueba final permanece reservada para comparar modelos ya congelados.

El respaldo ampliado auditado contiene **505 tomas**. Hay **399 candidatas** de **P001** para el conjunto histórico de entrenamiento. La extracción en memoria confirmó **386 tomas con al menos una ventana utilizable**, incluidas 49 negativas. De los 67 negativos del respaldo, 60 son elegibles como tomas: 37 alcanzan una mano, 14 alcanzan dos y 9 mantienen el encuadre vacío. Las tomas sin manos se conservan para evaluar el estado de ausencia de manos. Aún faltan todas las clases y condiciones en validación y prueba final.

El ensayo con ese respaldo real produjo **cuatro bloques** con un máximo configurado de 25 MiB. Sus tamaños fueron 26 152 842, 26 173 460, 26 140 322 y 5 253 199 bytes. Python los leyó en orden inverso y devolvió el mismo inventario y resultado de elegibilidad que al leer el JSON original. El ensayo eliminó sus archivos temporales al terminar.

## Pruebas

Las **242** pruebas informadas para la versión de feria incluían 223 de plataforma, 6 de reconocimiento web y 13 de Python. Las **226** de la renovación visual correspondían solo a la suite web. Son alcances distintos. Los seis casos de reconocimiento web y los trece casos de Python anteriores siguen en sus suites. Las comprobaciones de Chromium se informan aparte.

| Suite de esta fase | Resultado |
|---|---|
| Plataforma web en Node | 232 aprobadas de 232, incluidos seis casos nuevos de captura, verificación y combinación |
| Dataset Studio y almacenamiento, repetidas por separado | 57 aprobadas de 57. Son un subconjunto de la suite web |
| Reconocimiento web de ML | 6 aprobadas de 6 |
| Python | 17 aprobadas de 17, incluidos cuatro casos nuevos de fuentes múltiples, integridad y particiones |
| TypeScript, ESLint y build | Código de salida 0 en las tres comprobaciones |
| Chromium en desarrollo | Guía de 32 tomas, partición guardada, nuevo consentimiento al cambiar de sesión, exportación del bloque de sesión y liberación de cámara y Worker |
| Servidor de feria | 72 archivos verificados. El build educativo coincide byte por byte con el de la renovación visual |

La prueba de Chromium usó una cámara sintética y resultados sin manos reproducidos por el arnés de pruebas. La frecuencia de esa captura fue insuficiente. Studio permitió conservarla expresamente como pendiente, bloqueó su aceptación y conservó su estado al exportarla. La aceptación de capturas suficientes se verificó con observaciones sintéticas en las pruebas de IndexedDB. Las pruebas de Python que ejercitan el entrenamiento usan datos sintéticos y artefactos temporales. La captura y la validez lingüística con participantes reales quedan pendientes.

## Integridad y alcance

| Archivo protegido | SHA‑256 |
|---|---|
| Modelo V1 público | `afd2aae852de7bb07f0318c3ed392353d11e1e89816b59265273454c781e83f3` |
| Dataset original de 355 tomas | `d8943f55f630f1eef9cdd011fbde632820a019d3887e560aada480324d9941f3` |
| Exportación ampliada de 505 tomas | `4861455229fdbe3fdb818f48e7ab5a0b818d1e306f5a15d32af018ef45476cdc` |
| ZIP de feria 6.6 | `d27a54646a9b3f904fa8fdec43d4371b27f11dccdabb65fa6c50248803a76155` |

La renovación visual, sus 21 WebP, las diez fotografías, los diez videos y la versión de feria se conservaron. Las sesiones, los subtipos y las nuevas asignaciones pertenecen a la herramienta de desarrollo. Se conservaron el catálogo de diez clases, los umbrales de V1, el progreso, las lecciones, Biblioteca y XP. V2 sigue sin entrenarse con las grabaciones reales.

## Archivos

- Dataset Studio y estilos en `src/pages/DatasetStudioPage.tsx` y `DatasetStudioPage.css`.
- Paneles y captura en `src/components/dataset/{CampaignPanel,DatasetBlocksPanel,RecordingPanel,SavedSamples,SampleReview}.tsx`.
- Guía, bloques, persistencia y validación en `src/features/sign-recognition/dataset/{datasetCampaign,datasetBlocks,datasetStore,datasetCapture,datasetExport,datasetTypes,datasetValidation,useDatasetCapture}.ts`.
- Entrada múltiple y auditoría en `ml/scripts/{v2,v2_sources,v2_campaign,audit}.py`.
- Pruebas en `scripts/dataset-v2.test.mjs`, `scripts/recognition-lab-browser.mjs`, `scripts/fixtures/dataset-campaign-browser.mjs` y `ml/tests/test_v2_sources.py`.
