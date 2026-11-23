# SeñaVerse · Hito 6.6 · Versión de exposición

**Candidata `6.6-3b82e96` · 22 de noviembre de 2026.** La demostración educativa está preparada para ejecutarse en Windows por loopback. La demostración en vivo de la V1 queda sujeta a la lista de comprobación física de este informe. La validación lingüística sigue pendiente.

## Qué se preservó

`3b82e96` («Corrige hallazgos de auditoría para la feria») incorpora las correcciones de la [auditoría integral del Hito 6.3](hito-6-3-auditoria-integral.md), sobre la base multimedia `dc159ce`. `src/`, `public/`, `ml/` y los manifiestos de npm conservan sus contenidos versionados. El catálogo mantiene seis unidades, doce lecciones, 57 actividades, 24 fichas con referencias del MINEDU, seis situaciones con 15 interacciones y cinco minijuegos. El sistema local conserva 1 300 XP disponibles y las reglas de progreso y recompensas.

El modelo público SVM V1 conserva diez clases y sus parámetros de inferencia. El JSON de producción coincide byte a byte con el de `public/`. El SHA-256 de las 355 grabaciones originales coincide con el manifiesto histórico de preparación. El paquete incluye el `.task` de MediaPipe, los dos pares JS/WASM de la versión fijada `1.2.3`, la fuente, los iconos, las imágenes locales y los módulos de las pantallas educativas. Dataset Studio y el Laboratorio permanecen en desarrollo.

## Instalar, verificar e iniciar

1. Ten instalados **Node.js 22 o posterior** y **Microsoft Edge o Google Chrome**. Se usó **Node.js 26.13.1** para construir y verificar la candidata. Descarga e instala los requisitos antes de ir a la feria si el equipo va a estar desconectado. [Descargas de Node.js](https://nodejs.org/en/download)
2. Extrae `dist-feria/SenaVerse-feria-6.6-3b82e96.zip` completo en una carpeta local con permiso de escritura. Conserva juntos el `.bat`, `scripts/`, `dist/`, `VERSION-FERIA.json` y `LEEME.txt`. El paquete ya contiene la compilación y el servidor usa módulos incluidos en Node.js.
3. Desde la carpeta extraída, comprueba el paquete con `.\INICIAR_SEÑAVERSE.bat --verificar`. El lanzador revisa la versión de Node.js, el inventario y los SHA-256; si encuentra un problema, la consola indica el archivo, requisito o ruta afectada.
4. Abre **`INICIAR_SEÑAVERSE.bat`** con doble clic. El lanzador verifica el build, inicia el servidor en **`http://127.0.0.1:4173/`** y abre Edge o Chrome cuando el puerto está listo. Mantén abierta la consola. Para terminar, desactiva Cámara si la estabas usando, cierra su pestaña y pulsa `Ctrl+C` en la consola.

Para arrancar manualmente, ejecuta estos comandos en PowerShell desde la carpeta extraída.

```powershell
node scripts/servidor-feria.mjs --verificar
node scripts/servidor-feria.mjs --solo-servidor
```

Abre `http://127.0.0.1:4173/` en un perfil independiente. Para retomar exactamente el perfil guardado por el lanzador, inicia Edge o Chrome con `--user-data-dir` apuntando a su carpeta dedicada. Usa la URL HTTP indicada, ya que el servidor comprueba el host y el origen de almacenamiento debe permanecer estable. Chromium trata el loopback como contexto confiable para el acceso a la cámara. [MDN sobre contextos seguros](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)

Estos comandos reconstruyen el paquete desde el repositorio con Node.js 26.13.1 y las utilidades de este hito.

```powershell
npm.cmd ci
npm.cmd run build
.\INICIAR_SEÑAVERSE.bat --verificar
node scripts/empaquetar-feria.mjs 6.6-copia-local
```

`npm.cmd ci` requiere acceso al registro de npm o una caché completa. La ejecución del ZIP extraído funciona con los requisitos locales instalados. `tar.exe` de Windows se usa al crear el ZIP. El empaquetador exige una etiqueta nueva si ya existen el directorio o el ZIP de esa versión.

## Perfil de exposición

El inicio automático usa `%LOCALAPPDATA%\SenaVerse\Perfiles\edge\demo-feria` o `%LOCALAPPDATA%\SenaVerse\Perfiles\chrome\demo-feria`. La primera apertura de un perfil dedicado puede empezar desde cero. El avance, la actividad y las recompensas persisten en el almacenamiento local de la aplicación. El identificador del perfil, el navegador y el origen `http://127.0.0.1:4173` deben coincidir para continuar el mismo recorrido.

```powershell
# Ensayo separado, con el mismo puerto habitual
.\INICIAR_SEÑAVERSE.bat --perfil=ensayo --navegador=edge

# Día de la feria, manteniendo el navegador elegido
.\INICIAR_SEÑAVERSE.bat --perfil=feria --navegador=edge
```

Usa `chrome` si ese será el navegador de la feria. Reserva `feria` para la primera demostración y realiza los ensayos con `ensayo`. Si necesitas otra demostración desde cero, elige un identificador nuevo, por ejemplo `feria-turno-2`. Las actividades completadas de forma real generan sus resultados y recompensas habituales. En Mi perfil, **Exportar mis datos** genera un JSON de consulta. Para retomar el mismo avance, conserva el perfil de navegador, cuya ruta informa el lanzador.

## Qué funciona sin Internet

Inicio, Aprender, Biblioteca, Cámara, Situaciones, Minijuegos, Mi progreso y Mi perfil usan la compilación local. Abrir Cámara muestra la interfaz y mantiene la webcam apagada hasta pulsar el control de activación. El detector de MediaPipe, la inferencia de la SVM V1 y la confirmación temporal se ejecutan en el navegador. El servidor sirve archivos estáticos desde `dist` y rechaza el acceso desde fuera de loopback, los entornos internos y las rutas de datos privados.

Las láminas y documentos enlazados del MINEDU, así como otras fuentes externas identificadas, requieren Internet. Conservan sus avisos de disponibilidad. Si el navegador indica que está sin conexión, la referencia muestra el aviso correspondiente. Si el sistema aún se considera conectado pero la fuente falla, cierra la pestaña externa y continúa con las instrucciones, ejercicios y diagramas locales disponibles. Las ilustraciones propias y el visor local tienen finalidad educativa. La comprobación con personal usuario de LSP y la incorporación de demostraciones autorizadas quedan pendientes.

## Recorrido breve · 5 a 7 minutos

1. **Inicio y Aprender.** Muestra la propuesta para aprender Lengua de Señas Peruana y la organización en seis unidades. Desde Números básicos abre la lección del uno al cinco, muestra «Observa las cinco señas» y responde «Dos» al ejercicio de las botellas. Enseña la opción **Hacer ejercicio sin cámara** en una de las prácticas.
2. **Biblioteca.** Selecciona **Números** y abre las fichas de Uno, Dos y Tres. Muestra las instrucciones, el diagrama disponible y la referencia identificada del MINEDU. Tres fichas distintas desbloquean **Explorador** la primera vez.
3. **Cámara.** Muestra la selección de Uno para práctica dirigida y el aviso experimental. Si el equipo superó el protocolo físico, activa la cámara, realiza Uno, muestra el resultado que se produzca y apaga. En el recorrido sin cámara, explica el control y vuelve a la ficha o al ejercicio local.
4. **Situaciones y Minijuegos.** Completa «Respondiendo preguntas» con las opciones **Sí** y **Cero**. Juega una partida breve de «Adivina la seña» en nivel básico, hasta ver el resultado. Usa la modalidad sin cámara en ambos módulos.
5. **Mi progreso y arquitectura.** Muestra la actividad registrada, los XP y la insignia obtenidos durante el recorrido. Recarga para comprobar la persistencia. Explica que la app se sirve por loopback, el historial reside en el navegador y MediaPipe más SVM V1 se ejecutan localmente al activar Cámara.

## Recorrido ampliado · 12 a 15 minutos

1. Desde Inicio y Mi progreso, muestra el estado inicial de un perfil limpio. En Aprender, sitúa Números básicos dentro del currículo y completa su lección del uno al cinco. Responde «Dos» al caso de las botellas. Asocia **Tres**, **Cinco** y **Uno** a las tres configuraciones, en ese orden. Completa prácticas del uno al cinco con los ejercicios sin cámara y responde **Uno**, **Dos**, **Tres**, **Cuatro**, **Cinco** a la evaluación. La primera finalización otorga 80 XP y desbloquea **Primer paso** si es la primera lección terminada.
2. En Biblioteca, combina la categoría **Números** con la búsqueda. Abre tres fichas distintas, muestra el visor local de Uno y señala la procedencia de la lámina. En Cámara, presenta el modo libre y selecciona Uno en el dirigido. Si la prueba física fue satisfactoria, demuestra confirmación, reintento, retirada de manos y apagado. En el recorrido alternativo, abre las instrucciones y el visor, luego continúa con los ejercicios sin cámara.
3. Completa «Respondiendo preguntas» con **Sí** y **Cero**. Muestra la retroalimentación por respuesta y el resumen. La primera finalización otorga 40 XP. Abre «Adivina la seña», elige una partida breve de nivel básico y muestra el registro y el récord de la configuración usada.
4. En Mi progreso, localiza las actividades, XP, insignias y el resultado del minijuego. Recarga la página o cierra y reabre el mismo perfil. Finaliza mostrando las capas navegador, MediaPipe, V1 y servidor estático, con referencia externa solo al abrir una fuente enlazada.

El recorrido alternativo combina estas mismas actividades con ejercicios de selección y observación locales. Recorre el flujo con Internet desconectado antes de la feria y deja cerradas las pestañas externas.

## Lista de verificación física en el equipo de feria

- [ ] Arrancar desde el ZIP verificado. Confirmar que el lanzador abre una ventana visible en el navegador y la URL previstos. Verificar que Cámara carga con la webcam apagada. Cerrar Teams, Zoom u otra aplicación que esté usando la webcam.
- [ ] Comprobar la cámara en la app Cámara de Windows. Revisar **Configuración → Privacidad y seguridad → Cámara**, el acceso para aplicaciones de escritorio y el permiso del sitio en el navegador. Elegir la cámara correcta si hay más de una. Cerrar la app de Windows antes de activar SeñaVerse.
- [ ] Consultar `edge://gpu` o `chrome://gpu` para comprobar WebGL y aceleración, y anotar el resultado. Reiniciar el navegador si se modifica su configuración de aceleración. Mantener los permisos y las protecciones del equipo bajo control de su responsable.
- [ ] Ensayar con luz frontal difusa y fondo poco recargado. Empezar a unos 40–70 cm y ajustar para que ambas manos puedan entrar completas en el encuadre. Activar los landmarks, mover la mano despacio y anotar saltos, congelaciones o retrasos.
- [ ] En modo libre, repetir una seña estática conocida (por ejemplo, Uno) con la mano derecha. Observar los estados de búsqueda y confirmación, el nombre mostrado y el tiempo observado. Repetir con la izquierda y anotar diferencias.
- [ ] En modo dirigido seleccionar Uno. Probar la seña objetivo, una distinta y el reintento. Retirar todas las manos y comprobar el aviso. Mantener las manos fuera unos segundos antes del siguiente ensayo para distinguir el estado de ausencia de manos de «seña sin reconocer».
- [ ] Ensayar gestos fuera del catálogo, Solo con y sin su movimiento de giro y varias ejecuciones de Nada. Registrar falsos positivos, rechazos, inconsistencias y condiciones de la toma. Usar el recorrido alternativo si la prueba dirigida falla de forma reiterada.
- [ ] Apagar con el control de Cámara y verificar que se extinga el indicador de uso. Repetir al navegar de Cámara a Biblioteca. Con el navegador en modo de comprobación, usar DevTools → Sources → Threads para observar `handDetection.worker` activo durante la captura y su desaparición al apagar o salir. Volver a activar una vez y comprobar que solo se inicia un Worker.
- [ ] Probar el permiso denegado y la recuperación mediante la configuración del sitio. Completar el recorrido sin webcam, recargar y confirmar el registro. Anotar equipo, navegador, webcam, iluminación, distancia, pruebas realizadas, resultado y responsable de la revisión.

La V1 experimental muestra dificultades con la mano izquierda, falsas aceptaciones fuera del catálogo, posibles confirmaciones de Solo con movimiento insuficiente e inconsistencias en Nada. La candidata conserva este comportamiento y sus umbrales. Los ensayos automatizados del navegador usan un dispositivo de prueba y, cuando se indica, reevalúan landmarks de tomas históricas locales.

## Contingencias y recuperación

| Incidencia | Acción en la feria |
| --- | --- |
| Internet caído o documento externo inaccesible | Mantén el servidor local abierto y usa instrucciones, diagramas disponibles y ejercicios. Si se abrió una pestaña externa, ciérrala y vuelve a SeñaVerse. |
| Webcam ausente u ocupada | Comprueba conexión USB o interruptor físico, cierra la aplicación que la usa y reintenta una vez. Continúa sin cámara si la incidencia persiste. |
| Permiso denegado | Revisa el permiso del sitio para `http://127.0.0.1:4173` y el acceso de aplicaciones de escritorio en Windows. Usa el recorrido alternativo si el equipo está administrado o la incidencia persiste. |
| Reconocimiento errático | Reintenta con una seña sencilla, iluminación frontal y manos dentro del encuadre. Continúa con la actividad sin cámara si las confirmaciones siguen siendo inestables. Muestra los resultados que hayan ocurrido en vivo. |
| Puerto 4173 ocupado | Si ya hay una consola de SeñaVerse abierta, usa su instancia. Si corresponde a otro proceso, déjalo intacto y ejecuta `.\INICIAR_SEÑAVERSE.bat --puerto=4174`. El puerto alternativo tiene almacenamiento separado. Regresa a 4173 para retomar el avance anterior. |
| Navegador cerrado | Abre el mismo perfil y la URL habitual si el servidor sigue activo. Si el servidor se detuvo, vuelve a iniciar con el lanzador y los mismos argumentos. |
| Equipo reiniciado | Vuelve a abrir el lanzador desde la carpeta extraída con los mismos argumentos y comprueba Mi progreso antes de continuar. |
| Error de carga | Ejecuta `--verificar`. Comprueba que sigues en la URL del lanzador y que el ZIP se extrajo completo. Si falla el inventario, recupera la copia verificada en una carpeta nueva. |
| Necesidad de recuperar la versión estable | Verifica el SHA-256 del ZIP de respaldo, extrae en una carpeta nueva y ejecuta `--verificar`. Reutiliza el navegador, el perfil y el puerto habituales si deseas retomar los datos locales del mismo equipo. |

Conserva el ZIP y su `.sha256` en dos ubicaciones, por ejemplo, una carpeta del equipo de exposición y una memoria USB. Verifica la copia después de transferirla. En PowerShell puedes usar `Get-FileHash -Algorithm SHA256 -LiteralPath '.\SenaVerse-feria-6.6-3b82e96.zip'` y comparar el resultado con el archivo `.sha256`. Conserva el repositorio y los datos de entrenamiento en su ubicación privada de respaldo. Si necesitas respaldar el avance del navegador, cierra el perfil dedicado y conserva su carpeta en el mismo equipo bajo el usuario de Windows correspondiente. La portabilidad de ese perfil entre equipos queda fuera de la verificación.

## Evidencias de la candidata

La compilación contiene **31 archivos y 39 158 771 bytes**. Los WASM suman **29 331 454 bytes**. El ZIP ocupa **14 825 276 bytes** y su SHA-256 es `d27a54646a9b3f904fa8fdec43d4371b27f11dccdabb65fa6c50248803a76155`. Se verificó el valor con PowerShell, se inspeccionó el inventario del ZIP y se extrajo en una ruta temporal de Windows con espacios y `ñ`. Se ejecutaron `--verificar` e inicio en `127.0.0.1:4173` desde esa copia. Una recompilación reprodujo los SHA-256 de los 31 recursos. Los cuatro archivos JS/WASM coincidieron con los de la dependencia fijada y el `.task` coincidió con su SHA-256 documentado. La revisión de privacidad encontró cero archivos privados en `dist`.

TypeScript, ESLint y el build terminaron con código 0. Pasaron **242 pruebas automatizadas** (223 de la plataforma, 6 de reconocimiento web y 13 de Python). Desde el lanzador extraído, una comprobación automatizada abrió Chromium en modo sin ventana, cargó Inicio y verificó el uso de un perfil temporal aislado. También se reprodujo el mensaje de puerto ocupado y se comprobó que la primera instancia seguía respondiendo con HTTP 200. El ensayo con una ventana visible en el equipo de la feria forma parte de la lista física.

Los diez recorridos de producción usaron Chromium 157 contra el servidor del ZIP extraído, con resolución externa bloqueada. El recorrido de Laboratorio usó el servidor de desarrollo. Las primeras ejecuciones simultáneas tuvieron varias esperas agotadas. Los once recorridos pasaron tras repetir en serie las verificaciones afectadas.

| Recorrido | Resultado observado |
| --- | --- |
| `audit-production` | 168 combinaciones de pantalla y tema. Cero desbordamientos o errores detectados. Las 1 906 solicitudes fueron locales. Con cámara inactiva no se inició el Worker ni se descargaron WASM o el detector. |
| `audit-functional` | Inicio de perfil limpio, sincronización entre documentos, manejo de escritura bloqueada y aviso externo al desconectarse. Las seis situaciones y 15 interacciones se completaron sin activar Cámara. Registraron 240 XP y repetir una situación conservó su recompensa original. |
| `curriculum-production` | Se completaron 12 lecciones, con 960 XP. La evaluación integradora pasó de 5/6 a 6/6 y persistió tras recargar. Se comprobaron el retorno desde Biblioteca y un enlace histórico. |
| `lesson-production` | Números básicos guardó una única finalización y un resultado de 4/5. La prueba comprobó reanudación, coincidencias históricas, permiso denegado y liberación de recursos. |
| `student-production` | Se comprobó la carga local de V1, error y recuperación, cámara manual, tres errores de dispositivo, reserva única, ausencia de manos, landmarks, modos libre y dirigido, rechazo y liberación por apagado y navegación. El primer resultado del Worker llegó en 2 148 ms con el dispositivo de prueba. |
| `library-production` | 35 fichas en total, búsqueda y filtros combinados, migración de favoritos, teclado, vuelta a la lección y enlace directo a la práctica de Tres. |
| `media-production` | Cinco diagramas locales con cero solicitudes externas, ampliación con teclado, avance conservado y cámara mantenida durante la consulta. |
| `situation-production` | Vuelta desde Biblioteca, Cero sin cámara, reanudación, coincidencias históricas comprobadas por separado y 40 XP una sola vez. |
| `minigames-production` | Cinco juegos, 100 XP, teclado, modos con y sin reloj, temporizadores y cámara liberados. |
| `progress-production` | Perfil nuevo e historial migrado, racha, avatar, favoritos y reanudación. Guardado de coincidencia histórica y vista móvil oscura. |
| `lab` en desarrollo | Recuperación tras modelo ausente, selector V1/V2, práctica dirigida, reinicio de MediaPipe y limpieza de recursos. Las dos rutas de herramientas devuelven 404 en el servidor de exposición. |

Para reproducir las verificaciones, arranca primero el ZIP extraído y usa otra consola en el repositorio. Ejecuta los recorridos de Chromium uno por vez. Las pruebas que reevalúan tomas históricas requieren el dataset privado en su ubicación habitual.

```powershell
npm.cmd exec -- tsc -b --pretty false
npm.cmd run lint
npm.cmd run build
npm.cmd test
node --test ml/tests/web.test.mjs
& .\ml\.venv\Scripts\python.exe -m unittest discover -s ml/tests -v

$fairChrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
$fairDataset = 'ml/datasets/senaverse-dataset-dataset-json.json'
$env:SENAVERSE_FERIA_ORIGEN = 'http://127.0.0.1:4173'
node scripts/recognition-lab-browser.mjs $fairChrome audit-production
node scripts/recognition-lab-browser.mjs $fairChrome audit-functional
node scripts/recognition-lab-browser.mjs $fairChrome student-production $fairDataset
Remove-Item Env:SENAVERSE_FERIA_ORIGEN
node scripts/recognition-lab-browser.mjs $fairChrome lab $fairDataset
node scripts/fair-audit-metrics.mjs $fairDataset
```

## Archivos de este hito

- `INICIAR_SEÑAVERSE.bat` comprueba Node.js y llama al servidor desde la ubicación del paquete.
- `scripts/servidor-feria.mjs` valida el build, publica únicamente sus recursos por loopback y abre el perfil aislado.
- `scripts/empaquetar-feria.mjs` prepara el directorio autónomo, el inventario `VERSION-FERIA.json`, `LEEME.txt`, el ZIP y su checksum.
- `scripts/feria.test.mjs` verifica integridad, archivos ausentes, exclusión de rutas, protocolo local y opciones de perfil.
- `scripts/recognition-lab-browser.mjs` permite ejecutar las pruebas de producción contra el servidor que se entrega.
- `.gitignore` excluye los paquetes generados de `dist-feria/`.

Conserva la candidata y su checksum durante el trabajo de V2. Usa una rama o un worktree independiente para futuras pruebas, y separa los perfiles de navegador de V2 y de exposición. Crea una etiqueta nueva para cada candidato, repite las pruebas contra el ZIP extraído y registra por separado las comprobaciones físicas y lingüísticas antes de promover una versión nueva.
