import type { Lesson } from './curriculum.ts';
import { localIllustration } from './illustrations.ts';
import { getEducationalSign, guideReference, numbersReference } from './library.ts';
import type { LessonIllustration, LessonReference, Question, StudyStep } from './lessonPlan.ts';
import type { QuizMedia } from './educationalMedia.ts';
import { signQuizMedia } from './signQuizMedia.ts';

function choices(labels: string[]) {
  return labels.map((label, index) => ({ id: String(index), label }));
}

function choose(id: string, question: string, labels: string[], correct: number, explanation: string, media?: QuizMedia): Question {
  return { id, activity: { type: media ? 'identify' : 'choice', question, options: choices(labels),
    correctId: String(correct), success: explanation, explanation, media } };
}

function associate(id: string, question: string, labels: string[], pairs: [string, number, QuizMedia?][], explanation: string): Question {
  return { id, activity: { type: 'association', question, options: choices(labels),
    pairs: pairs.map(([label, answer, media], index) => ({ id: String(index), label, answerId: String(answer), media })),
    success: explanation, explanation } };
}

function mediaFor(id: string, kind: QuizMedia['kind']) {
  const sign = getEducationalSign(id);
  const media = sign && signQuizMedia(sign, kind);
  if (!media) throw new Error(`Falta el recurso ${kind} de ${id}`);
  return media;
}

function selectClip(id: string, question: string, candidates: string[], correct: number): Question {
  const options = candidates.map((signId, index) => ({ id: String(index), label: `Clip ${index + 1}`, media: mediaFor(signId, 'video') }));
  const explanation = options[correct].media.description;
  return { id, activity: { type: 'choice', question, options, correctId: String(correct),
    success: explanation, explanation, reviewSignIds: candidates } };
}

function order(id: string, question: string, labels: string[], sequence: number[], explanation: string): Question {
  return { id, activity: { type: 'order', question, options: choices(labels), order: sequence.map(String),
    success: explanation, explanation } };
}

function lesson(id: string, title: string, duration: string, description: string, objectives: string[], steps: StudyStep[]): Lesson {
  return { id, title, duration, description, plan: {
    objectives, steps: [{ id: 'objetivos', kind: 'intro', title: 'Antes de empezar', text: description }, ...steps],
  } };
}

function reading(title: string, paragraphs: string[], references?: LessonReference[], illustration?: LessonIllustration): StudyStep {
  return { id: 'lectura', kind: 'reading', title, paragraphs, references, illustration };
}

function study(title: string, text: string, ids: string[]): StudyStep {
  return { id: 'fichas', kind: 'study', title, text, signs: ids.map(id => ({ id })) };
}

function exercise(title: string, ...questions: Question[]): StudyStep {
  return { id: 'ejercicio', kind: 'question', title, questions };
}

function assessment(...questions: Question[]): StudyStep {
  return { id: 'evaluacion', kind: 'assessment', title: 'Evaluación de la lección', questions };
}

function practise(targetId: string, alternative: Question, notice?: string): StudyStep {
  const sign = getEducationalSign(targetId);
  if (!sign?.reference || !sign.instructions) throw new Error(`Falta la referencia para practicar ${targetId}`);
  return { id: `practica-${targetId.toLowerCase()}`, kind: 'practice', title: `Practica ${sign.word}`, targetId,
    instruction: sign.instructions, reference: sign.reference, alternative: [alternative], notice };
}

const greetings = ['buenos-dias', 'buenas-noches', 'hola', 'adios'];
const largerNumbers = ['seis', 'siete', 'ocho', 'nueve', 'diez'];
const expressionIds = ['LSP-006', 'LSP-007', 'LSP-008'];
const companyIds = ['LSP-009', 'LSP-010'];
const numberChoices = ['Ocho', 'Seis', 'Diez', 'Siete', 'Nueve'];
const expressionClips = ['LSP-008', 'LSP-006', 'LSP-007'];
const companyClips = ['LSP-010', 'LSP-009'];

export const basicLessons = [
  lesson('introduccion', 'Introducción a la LSP', '8 min',
    'Conoce qué es la Lengua de Señas Peruana y cómo empezar a estudiarla.', [
      'Reconocer la LSP como una lengua de la comunidad sorda peruana.',
      'Elegir materiales apropiados para aprender una seña de LSP.',
    ], [
      reading('Una lengua visual', [
        'La Lengua de Señas Peruana (LSP) es una lengua de la comunidad sorda peruana. Tiene sus propias reglas. En el mundo existen distintas lenguas de señas y cada una se aprende con sus propios materiales.',
        'Al observar una seña también cuentan la ubicación y orientación de las manos, el movimiento y la expresión del rostro y del cuerpo. Una etiqueta escrita en español ayuda a ubicar una entrada en una guía.',
        'Cuando practiques, comprueba que la fuente corresponde a LSP y observa la demostración completa antes de intentar reproducirla.',
      ], [{ title: 'Leer la cartilla del MINEDU · página impresa 70',
        url: numbersReference.url.replace('#page=14', '#page=12') },
      { title: 'Leer sobre la comunidad sorda y sus modelos lingüísticos · MINEDU',
        url: 'https://www.gob.pe/es/institucion/minedu/noticias/527771-mas-de-4200-estudiantes-con-discapacidad-auditiva-se-encuentran-matriculados-en-iiee-del-minedu' },
      { title: 'Leer sobre la diversidad de las lenguas de señas · Conadis',
        url: 'https://www.gob.pe/institucion/conadis/noticias/837340-semana-internacional-de-la-persona-sorda-mitos-y-verdades-sobre-la-comunidad-sorda-que-se-debe-conocer' }]),
      exercise('Elige una fuente de estudio', choose('fuente', '¿Qué material usarías para estudiar cómo se realiza una seña de LSP?',
        ['Una lista de palabras en español', 'Una demostración identificada como LSP en una guía del MINEDU', 'Una ficha de otra lengua de señas'], 1,
        'Una demostración de LSP permite observar los detalles de esa lengua.')),
      assessment(
        choose('lenguas', '¿Qué compruebas antes de usar una demostración para este curso?',
          ['La lengua de señas que identifica la fuente', 'La lengua de los subtítulos de la demostración', 'La glosa en español asignada a la seña'], 0,
          'El curso estudia LSP y las demostraciones deben corresponder a esa lengua.'),
        choose('observacion', 'Además de las manos, ¿qué puedes observar durante una demostración?',
          ['El punto de la pantalla donde aparecen los subtítulos', 'El texto de la ficha mientras la persona signa', 'El rostro y el cuerpo de quien signa'], 2,
          'La expresión facial y corporal forma parte de la información visual.')),
    ]),
  lesson('comunicacion-visual', 'Comunicación visual', '8 min',
    'Prepara el espacio y dirige tu atención visual antes de empezar a practicar.', [
      'Elegir condiciones que permitan ver el rostro y las manos.',
      'Ordenar los pasos de una práctica de observación.',
    ], [
      reading('Prepara el espacio', [
        'Ubícate frente a tu compañera o compañero de práctica en un lugar con buena iluminación. Espera a que haya atención visual para empezar.',
        'Mira una primera vez la demostración completa. Después vuelve a observar el lugar de inicio, el recorrido de las manos y la expresión que acompaña al movimiento. Ensaya despacio con el material a la vista.',
      ], [guideReference(14), guideReference(16)], {
        ...localIllustration('recursos/recurso-comunicacion-visual', 960, 720),
        alt: 'Personas frente a frente en un espacio iluminado, con el rostro, el torso y las manos a la vista',
      }),
      exercise('Organiza la práctica', order('secuencia', '¿En qué orden harías esta práctica por parejas?',
        ['Ensayar la demostración', 'Comprobar que hay atención visual', 'Observar la demostración completa'], [1, 2, 0],
        'Asegura la atención visual, observa la demostración y luego ensaya.')),
      assessment(
        choose('luz', '¿Dónde será más fácil observar el rostro y las manos de tu pareja?',
          ['Frente a ella, con luz que permita ver su rostro', 'De espaldas a ella', 'Frente a ella, con su rostro en sombra'], 0,
          'La buena iluminación y la posición de frente permiten ver la información visual.'),
        choose('mirada', 'Tu compañero está mirando sus apuntes. ¿Qué haces antes de iniciar la demostración?',
          ['Empiezas por la configuración y compruebas su mirada al final', 'Esperas a que pueda mirarte', 'Le pides que lea la ficha mientras haces el movimiento'], 1,
          'Esperar el contacto visual le permite ver la demostración desde el comienzo.')),
    ]),
  lesson('cero', 'Cero y cantidades vacías', '7 min',
    'Usa la lámina numérica del MINEDU para estudiar Cero y distinguirlo de una cantidad positiva.', [
      'Localizar la postura de Cero y compararla con Uno.',
      'Elegir Cero cuando una cantidad está vacía.',
    ], [
      study('Observa Cero y Uno', 'Compara las fotografías y la lámina. Coloca un objeto sobre la mesa, practica Uno y retíralo para ensayar Cero.', ['cero', 'LSP-001']),
      exercise('Compara las posturas', choose('uno', '¿Qué número corresponde a la postura del dibujo?', ['Cero', 'Uno'], 1,
        'El índice extendido corresponde a Uno. En Cero los dedos forman un contorno redondo.', mediaFor('LSP-001', 'diagram'))),
      assessment(
        choose('caja', 'Observa la demostración. ¿Qué cantidad indica?', ['Una', 'Dos', 'Cero'], 2,
          'La demostración corresponde a Cero. Se usa cuando no queda ningún objeto.', mediaFor('cero', 'video')),
        choose('forma', 'La foto muestra Uno. Según la lámina, ¿qué configuración usarías para indicar Cero?',
          ['Los dedos forman un contorno redondo', 'El índice extendido', 'Los cinco dedos extendidos'], 0,
          'En Uno se extiende el índice. En Cero, los dedos forman un contorno redondo.', mediaFor('LSP-001', 'photo'))),
    ]),
  lesson('seis-a-diez', 'Del seis al diez', '10 min',
    'Estudia cinco números nuevos, compara posturas y registra cantidades de objetos.', [
      'Localizar Seis, Siete, Ocho, Nueve y Diez en la figura 2 del MINEDU.',
      'Aplicar las cantidades del seis al diez en un recuento.',
    ], [
      study('De seis a diez en la lámina', 'Señala cada número en la figura 2 y ensaya la postura con una mano. Repite mirando el dibujo de Diez y prestando atención a su flecha.', largerNumbers),
      exercise('Compara las fotografías', associate('recuento', 'Observa qué dedo queda recogido en cada fotografía y elige la cantidad.',
        numberChoices, [['Fotografía A', 1, mediaFor('seis', 'photo')], ['Fotografía B', 3, mediaFor('siete', 'photo')],
          ['Fotografía C', 0, mediaFor('ocho', 'photo')]], 'Las fotografías representan seis, siete y ocho, en ese orden.')),
      assessment(
        choose('nueve', '¿Qué número muestra esta fotografía?', numberChoices, 4,
          'La postura corresponde a Nueve. Ocho más uno da nueve.', mediaFor('nueve', 'photo')),
        choose('diez', 'Observa el movimiento completo. ¿Qué cantidad representa?', numberChoices, 2,
          'El movimiento corresponde a Diez. Dos grupos de cinco suman diez.', mediaFor('diez', 'video'))),
    ]),
  lesson('saludos', 'Saludos básicos', '8 min', 'Compara dos saludos ilustrados en la guía del MINEDU.', [
    'Observar la secuencia de Buenos días y Buenas noches.',
    'Elegir un saludo adecuado para un encuentro de mañana o de noche.',
  ], [
    study('Dos saludos según el momento', 'Abre la página 46. Observa los dibujos en el orden impreso. Practica cada saludo siguiendo las flechas y compara cómo termina cada secuencia.', greetings),
    exercise('Elige cómo saludar', choose('entrada', 'Llegas a la primera clase a las ocho de la mañana. ¿Qué saludo de esta lección practicarías?',
      ['Buenas noches', 'Buenos días'], 1, 'Buenos días es apropiado para un encuentro por la mañana.')),
    assessment(
      associate('momento', 'Reproduce cada clip y elige el saludo según el momento del día.', ['Buenos días', 'Buenas noches'],
        [['Clip A', 0, mediaFor('buenos-dias', 'video')], ['Clip B', 1, mediaFor('buenas-noches', 'video')]],
        'El primer clip corresponde a un saludo de mañana y el segundo a uno de noche.'),
      choose('demostracion', 'Ambos saludos tienen más de una viñeta. ¿Cómo comprobarías en la página 46 dónde se distinguen?',
        ['Compararía solo la primera posición de las manos', 'Seguiría las flechas de cada secuencia hasta su posición final',
          'Compararía las últimas viñetas sin observar cómo se llega a ellas'], 1,
        'Recorre cada secuencia completa para comparar tanto las posiciones como los desplazamientos.')),
  ]),
  lesson('cortesia', 'Expresiones de cortesía', '8 min',
    'Estudia la viñeta Disculpar y decide cuándo pedir disculpas.', [
      'Seguir la figura de Disculpar para ensayar su movimiento.',
      'Elegir entre saludar y pedir disculpas según la situación.',
    ], [
      study('Observa expresiones de cortesía', 'Compara el movimiento de Disculpa con la demostración de Gracias. Consulta la viñeta Disculpar para repasar su recorrido.', ['disculpa', 'gracias']),
      exercise('Revisa las pistas de la viñeta', choose('turno', 'Tu compañera detiene la imitación de «Disculpa» en la posición inicial. ¿Qué le indicarías revisar en la página 47?',
        ['La posición inicial de ambas manos y nada más', 'El recorrido que indica la flecha tras colocar las manos', 'El último punto del recorrido sin seguir la flecha'], 1,
        'La colocación de ambas manos es el punto de partida. La flecha de la viñeta indica el desplazamiento.', mediaFor('disculpa', 'video'))),
      assessment(associate('contextos', 'Elige una expresión para cada momento.', ['Disculpa', 'Buenas noches', 'Buenos días'],
        [['Saludas a tu grupo al llegar a las 8 a. m.', 2], ['Tropiezas con una persona por accidente', 0],
          ['Saludas al entrar a una reunión a las 9 p. m.', 1]], 'Los saludos se eligen según el momento del encuentro. Disculpa corresponde al accidente.')),
    ]),
  lesson('expresiones', 'Expresiones cotidianas', '12 min', 'Estudia Sí, Nada y Mucho en tres contextos distintos.', [
    'Distinguir una afirmación, una ausencia y una cantidad abundante.',
    'Practicar las tres señas con la guía y una actividad sin cámara o dirigida.',
  ], [
    study('Observa Sí, Nada y Mucho', 'Compara cuántas manos intervienen. Repasa también cómo se expresa una negación con No.', [...expressionIds, 'no']),
    practise('LSP-006', selectClip('afirmacion', '¿En qué clip se demuestra «Sí»? Fíjate en qué parte de la mano se mueve.', expressionClips, 1)),
    practise('LSP-007', selectClip('ausencia', '¿En qué clip se demuestra «Nada»? Compara la posición de los dedos.', expressionClips, 2),
      'La V1 puede dar resultados inconsistentes con Nada. Usa el ejercicio alternativo si te cuesta obtener una coincidencia.'),
    practise('LSP-008', selectClip('abundancia', '¿En qué clip se demuestra «Mucho»? Compara cómo intervienen las manos.', expressionClips, 0)),
    assessment(
      associate('sentidos', 'Reproduce los clips y elige en qué situación usarías la seña de cada uno.',
        ['Indicar que quedan muchas fichas', 'Confirmar que asistirás', 'Indicar que no quedan fichas'],
        [['Clip A', 1, mediaFor('LSP-006', 'video')], ['Clip B', 2, mediaFor('LSP-007', 'video')], ['Clip C', 0, mediaFor('LSP-008', 'video')]],
        'El movimiento de muñeca del clip A expresa «Sí». El clip B muestra «Nada» con pulgar e índice juntos. En el clip C intervienen ambas manos para expresar «Mucho».')),
  ]),
  lesson('elecciones-y-compania', 'Solo y Con', '10 min', 'Estudia cómo expresar ausencia de compañía o compañía en un contexto.', [
    'Distinguir Solo y Con en ejemplos de compañía.',
    'Comparar la configuración y el movimiento de ambas señas con la guía.',
  ], [
    study('Observa Solo y Con', 'Busca las dos viñetas en la página 135. Fíjate en qué se mueve y en la diferencia entre usar una o dos manos.', companyIds),
    practise('LSP-009', selectClip('solo', '¿Qué clip demuestra «Solo»? Observa la trayectoria de la mano.', companyClips, 1),
      'La V1 puede tener dificultades con el giro de Solo. Puedes estudiar el movimiento en la figura y usar el ejercicio alternativo.'),
    practise('LSP-010', selectClip('con', '¿Qué clip demuestra «Con»? Observa cómo se colocan y se mueven las manos.', companyClips, 0)),
    assessment(
      associate('compania', 'Mira los clips y elige qué parte de cada relato expresa la seña.',
        ['Mario llegó acompañado por su hermano', 'Lucía llegó sin compañía'],
        [['Clip A', 1, mediaFor('LSP-009', 'video')], ['Clip B', 0, mediaFor('LSP-010', 'video')]],
        'El giro de una mano del clip A corresponde a «Solo». En el B se acercan ambas manos para expresar «Con».'),
      choose('manos', 'Observa el gesto en el clip. ¿Qué secuencia de posiciones siguen las manos?',
        ['Las manos pasan de estar separadas a acercarse con los pulgares extendidos',
          'Las manos pasan de estar juntas a separarse con los pulgares extendidos'], 0,
        'En «Con», las dos manos se acercan con los pulgares extendidos. Observa el punto de partida y compara la distancia al final del gesto.', mediaFor('LSP-010', 'video'))),
  ]),
  lesson('familia', 'Familia y personas', '9 min', 'Estudia Familia, Mamá y Papá en la guía ilustrada.', [
    'Comprender qué vínculo señala cada ficha.',
    'Comparar la configuración y el movimiento en las tres ilustraciones.',
  ], [
    study('Observa los vínculos familiares', 'Compara las configuraciones F, M y P. Mira la demostración de Hermano para observar sus dos fases.', ['familia', 'mama', 'papa', 'hermano']),
    exercise('Compara los movimientos', choose('semicirculo', '¿Cuál de las tres figuras muestra un semicírculo hacia delante con ambas manos?',
      ['Papá', 'Familia', 'Mamá'], 1, 'La ficha Familia muestra un semicírculo con ambas manos.')),
    assessment(associate('vinculos', 'Relaciona cada demostración con el vínculo que representa.', ['Mamá', 'Familia', 'Papá'],
      [['Clip A', 1, mediaFor('familia', 'video')], ['Fotografía B', 0, mediaFor('mama', 'photo')],
        ['Fotografía C', 2, mediaFor('papa', 'photo')]], 'La guía distingue las entradas por sus configuraciones F, M y P. En Familia también se aprecia el recorrido de ambas manos.')),
  ]),
  lesson('comunidad', 'Comunidad y lugares', '8 min', 'Observa y practica las señas Casa y Colegio.', [
    'Elegir la seña de un lugar según su uso.',
    'Distinguir la silueta de Casa del movimiento de Colegio.',
  ], [
    study('Compara Casa y Colegio', 'Abre las dos páginas de la guía. Ensaya las figuras prestando atención a la posición de las manos y al movimiento que muestra cada una.', ['casa', 'colegio']),
    exercise('Compara los desplazamientos', choose('aulas', 'Observa dónde se colocan las manos y cómo se desplazan. ¿Qué lugar indica el clip?',
      ['Colegio', 'Casa'], 0, 'La figura de Colegio muestra el recorrido circular. La de Casa representa la forma de un techo.', mediaFor('colegio', 'video'))),
    assessment(
      choose('tejado', '¿Qué lugar representa la postura de esta fotografía?', ['Colegio', 'Casa'], 1,
        'La figura Casa representa la silueta de un techo.', mediaFor('casa', 'photo')),
      choose('vivienda', 'Una compañera mueve las manos en círculos cuando quiere indicar dónde vive. ¿Qué ficha le ayudaría a revisar la configuración?', ['Casa', 'Colegio'], 0,
        'En Casa, las yemas de las dos manos se juntan para formar la silueta de un techo. El recorrido circular corresponde a Colegio.')),
  ]),
  lesson('repaso-cotidiano', 'Evaluación integradora', '12 min',
    'Aplica cantidades, saludos y expresiones estudiadas en pequeños casos cotidianos.', [
      'Seleccionar vocabulario de la ruta básica según la situación.',
      'Resolver un recuento y distinguir una postura numérica estudiada.',
    ], [
      study('Prepara tu repaso', 'Imagina que llegas al colegio para repartir materiales. Repasa las señas de la lista y practica cada una por separado con su referencia.', [
        'buenos-dias', 'colegio', 'LSP-003', 'seis', 'ocho', 'cero', 'LSP-007', 'LSP-010', 'ayuda', 'agua',
      ]),
      exercise('Elige la cantidad para el reparto', choose('mesa', 'Hay cuatro fichas en una mesa y añades dos. ¿Qué número prepararías?',
        ['Cero', 'Tres', 'Seis', 'Ocho'], 2, 'Cuatro más dos da seis. Revisa esa figura en la lámina numérica.')),
      assessment(
        choose('imagen', '¿Qué número representa esta postura?', ['Uno', 'Dos', 'Tres', 'Cinco'], 2,
          'En Tres quedan extendidos pulgar, índice y medio.', mediaFor('LSP-003', 'photo')),
        choose('material', 'De diez fichas repartes dos. ¿Qué cantidad queda?', ['Ocho', 'Cero', 'Tres', 'Seis'], 0,
          'Diez menos dos da ocho. Puedes repasar su postura en la lámina numérica.'),
        associate('encuentro', 'Elige una seña o saludo para cada caso e identifica las dos demostraciones.', ['Nada', 'Con', 'Colegio', 'Buenos días'],
          [['Indicar dónde se imparte la clase', 2], ['Saludar al llegar por la mañana', 3],
            ['Primera demostración', 0, mediaFor('LSP-007', 'video')], ['Segunda demostración', 1, mediaFor('LSP-010', 'video')]],
          'En la primera demostración se juntan pulgar e índice para «Nada». En la segunda se acercan las dos manos para «Con».')),
    ]),
] satisfies Lesson[];
