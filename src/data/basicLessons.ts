import type { Lesson } from './curriculum.ts';
import { localIllustration } from './illustrations.ts';
import { getEducationalSign, guideReference, numbersReference } from './library.ts';
import type { LessonIllustration, LessonReference, Question, StudyStep } from './lessonPlan.ts';

function choices(labels: string[]) {
  return labels.map((label, index) => ({ id: String(index), label }));
}

function choose(id: string, question: string, labels: string[], correct: number, explanation: string, diagramId?: string): Question {
  return { id, activity: { type: diagramId ? 'identify' : 'choice', question, options: choices(labels),
    correctId: String(correct), success: explanation, explanation, diagramId } };
}

function associate(id: string, question: string, labels: string[], pairs: [string, number][], explanation: string): Question {
  return { id, activity: { type: 'association', question, options: choices(labels),
    pairs: pairs.map(([label, answer], index) => ({ id: String(index), label, answerId: String(answer) })),
    success: explanation, explanation } };
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

const greetings = ['buenos-dias', 'buenas-noches'];
const largerNumbers = ['seis', 'siete', 'ocho', 'nueve', 'diez'];
const expressionIds = ['LSP-006', 'LSP-007', 'LSP-008'];
const companyIds = ['LSP-009', 'LSP-010'];
const numberChoices = ['Ocho', 'Seis', 'Diez', 'Siete', 'Nueve'];
const expressionChoices = ['Mucho', 'Sí', 'Nada'];
const companyChoices = ['Con', 'Solo'];

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
          ['Que corresponde a LSP', 'Que usa una traducción palabra por palabra', 'Que el título está escrito en inglés'], 0,
          'El curso estudia LSP y las demostraciones deben corresponder a esa lengua.'),
        choose('observacion', 'Además de las manos, ¿qué puedes observar durante una demostración?',
          ['El orden alfabético de la ficha', 'El color del material', 'El rostro y el cuerpo de quien signa'], 2,
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
          ['Empiezas con el movimiento', 'Esperas a que pueda mirarte', 'Reproduces la seña más deprisa'], 1,
          'Esperar el contacto visual le permite ver la demostración desde el comienzo.')),
    ]),
  lesson('cero', 'Cero y cantidades vacías', '7 min',
    'Usa la lámina numérica del MINEDU para estudiar Cero y distinguirlo de una cantidad positiva.', [
      'Localizar la postura de Cero y compararla con Uno.',
      'Elegir Cero cuando una cantidad está vacía.',
    ], [
      study('Observa Cero y Uno', 'Abre la figura 2. Coloca un objeto sobre la mesa y practica Uno con la ficha. Retíralo y ensaya Cero siguiendo la lámina.', ['cero', 'LSP-001']),
      exercise('Compara las posturas', choose('uno', '¿Qué número corresponde a la postura del dibujo?', ['Cero', 'Uno'], 1,
        'El índice extendido corresponde a Uno en esta lámina. Cero se ilustra con la mano cerrada.', 'LSP-001')),
      assessment(
        choose('caja', 'Retiraste la última ficha de una caja. ¿Cuántas fichas quedaron?', ['Una', 'Dos', 'Cero'], 2,
          'Cuando no queda ningún objeto, la cantidad es cero.'),
        choose('forma', 'En la lámina estudiada, ¿qué postura corresponde a Cero?', ['La mano cerrada', 'El índice extendido', 'Los cinco dedos extendidos'], 0,
          'En Cero la mano se cierra. El índice extendido se usa para Uno.')),
    ]),
  lesson('seis-a-diez', 'Del seis al diez', '10 min',
    'Estudia cinco números nuevos, compara posturas y registra cantidades de objetos.', [
      'Localizar Seis, Siete, Ocho, Nueve y Diez en la figura 2 del MINEDU.',
      'Aplicar las cantidades del seis al diez en un recuento.',
    ], [
      study('De seis a diez en la lámina', 'Señala cada número en la figura 2 y ensaya la postura con una mano. Repite mirando el dibujo de Diez y prestando atención a su flecha.', largerNumbers),
      exercise('Haz un recuento', associate('recuento', 'Cuenta las marcas de cada fila y elige el número para ensayar.',
        numberChoices, [['● ● ● ● ● ●', 1], ['● ● ● ● ● ● ●', 3], ['● ● ● ● ● ● ● ●', 0]], 'Las tres filas representan seis, siete y ocho objetos.')),
      assessment(
        choose('nueve', 'Hay ocho fichas sobre la mesa y añades una. ¿Qué número ensayarías?', numberChoices, 4,
          'Ocho más uno da nueve. Busca Nueve en la figura 2 para repasar la postura.'),
        choose('diez', 'Tienes dos grupos de cinco fichas. ¿Qué número representa el total?', numberChoices, 2,
          'Cinco más cinco da diez. Revisa la flecha de movimiento en la figura de Diez.')),
    ]),
  lesson('saludos', 'Saludos básicos', '8 min', 'Compara dos saludos ilustrados en la guía del MINEDU.', [
    'Observar la secuencia de Buenos días y Buenas noches.',
    'Elegir un saludo adecuado para un encuentro de mañana o de noche.',
  ], [
    study('Dos saludos según el momento', 'Abre la página 46. Observa los dibujos en el orden impreso. Practica cada saludo siguiendo las flechas y compara cómo termina cada secuencia.', greetings),
    exercise('Elige cómo saludar', choose('entrada', 'Llegas a la primera clase a las ocho de la mañana. ¿Qué saludo de esta lección practicarías?',
      ['Buenas noches', 'Buenos días'], 1, 'Buenos días es apropiado para un encuentro por la mañana.')),
    assessment(
      associate('momento', 'Relaciona cada horario con el saludo que estudiarías.', ['Buenos días', 'Buenas noches'],
        [['Encuentro a las 9 a. m.', 0], ['Encuentro a las 9 p. m.', 1]], 'Estos horarios permiten distinguir un saludo de mañana de uno de noche.'),
      choose('demostracion', '¿Qué parte de la figura comparas para distinguir los dos saludos?', ['La numeración de la página',
        'El movimiento que muestra cada secuencia', 'El color del marco'], 1, 'Las viñetas y sus flechas indican cómo se desarrolla cada saludo.')),
  ]),
  lesson('cortesia', 'Expresiones de cortesía', '8 min',
    'Estudia la viñeta Disculpar y decide cuándo pedir disculpas.', [
      'Seguir la figura de Disculpar para ensayar su movimiento.',
      'Elegir entre saludar y pedir disculpas según la situación.',
    ], [
      study('Observa Disculpar', 'Busca la viñeta Disculpar, arriba a la derecha. Observa el inicio y el recorrido. Ensaya con la ilustración antes de resolver el ejercicio.', ['disculpa']),
      exercise('Resuelve una interrupción', choose('turno', 'Interrumpes sin querer el turno de tu compañera. ¿Qué expresión estudiada corresponde?',
        ['Buenos días', 'Disculpa', 'Buenas noches'], 1, 'Disculpa sirve para reconocer la interrupción.')),
      assessment(associate('contextos', 'Elige una expresión para cada momento.', ['Disculpa', 'Buenas noches', 'Buenos días'],
        [['Saludas a tu grupo al llegar a las 8 a. m.', 2], ['Tropiezas con una persona por accidente', 0],
          ['Saludas al entrar a una reunión a las 9 p. m.', 1]], 'Los saludos se eligen según el momento del encuentro. Disculpa corresponde al accidente.')),
    ]),
  lesson('expresiones', 'Expresiones cotidianas', '12 min', 'Estudia Sí, Nada y Mucho en tres contextos distintos.', [
    'Distinguir una afirmación, una ausencia y una cantidad abundante.',
    'Practicar las tres señas con la guía y una actividad sin cámara o dirigida.',
  ], [
    study('Observa Sí, Nada y Mucho', 'Compara cuántas manos intervienen en cada figura y sigue sus indicaciones de movimiento.', expressionIds),
    practise('LSP-006', choose('afirmacion', 'Te preguntan si quieres participar y respondes afirmativamente. ¿Qué seña ensayas?',
      expressionChoices, 1, 'Sí expresa una respuesta afirmativa.')),
    practise('LSP-007', choose('ausencia', 'La bolsa está vacía. ¿Qué seña de la lección usarías para expresar que no hay ningún objeto?',
      expressionChoices, 2, 'Nada expresa que en la bolsa no hay objetos.'),
      'La V1 puede dar resultados inconsistentes con Nada. Usa el ejercicio alternativo si te cuesta obtener una coincidencia.'),
    practise('LSP-008', choose('abundancia', 'Quieres indicar que hay una cantidad abundante. ¿Qué seña ensayas?',
      expressionChoices, 0, 'Mucho expresa una cantidad abundante.')),
    assessment(
      associate('sentidos', 'Relaciona cada intención con una seña estudiada.', expressionChoices,
        [['Confirmar que asistirás', 1], ['Indicar que la caja quedó vacía', 2], ['Expresar que hay una gran cantidad', 0]],
        'Sí afirma, Nada expresa ausencia y Mucho indica una cantidad grande.')),
  ]),
  lesson('elecciones-y-compania', 'Solo y Con', '10 min', 'Estudia cómo expresar ausencia de compañía o compañía en un contexto.', [
    'Distinguir Solo y Con en ejemplos de compañía.',
    'Comparar la configuración y el movimiento de ambas señas con la guía.',
  ], [
    study('Observa Solo y Con', 'Busca las dos viñetas en la página 135. Fíjate en qué se mueve y en la diferencia entre usar una o dos manos.', companyIds),
    practise('LSP-009', choose('solo', 'Llegas sin ninguna compañía. ¿Qué seña de esta lección expresa esa situación?',
      companyChoices, 1, 'Solo indica que llegas sin compañía.'),
      'La V1 puede tener dificultades con el giro de Solo. Puedes estudiar el movimiento en la figura y usar el ejercicio alternativo.'),
    practise('LSP-010', choose('con', 'Llegas en compañía de alguien. ¿Qué seña de esta lección indica esa relación?',
      companyChoices, 0, 'Con indica que hay compañía.')),
    assessment(
      associate('compania', 'Elige la seña que corresponde al dato sobre compañía en cada caso.', companyChoices,
        [['Lucía fue al parque sin compañía', 1], ['Mario fue al parque en compañía de su hermano', 0]],
        'Solo expresa ausencia de compañía y Con expresa compañía en estos ejemplos.'),
      choose('manos', 'En la página estudiada, ¿qué seña acerca ambas manos entre sí?', companyChoices, 0,
        'Con se ilustra acercando las dos manos. Solo muestra un giro con una mano.')),
  ]),
  lesson('familia', 'Familia y personas', '9 min', 'Estudia Familia, Mamá y Papá en la guía ilustrada.', [
    'Comprender qué vínculo señala cada ficha.',
    'Comparar la configuración y el movimiento en las tres ilustraciones.',
  ], [
    study('Observa los vínculos familiares', 'Abre la página 79. Ensaya cada una de las tres figuras. Compara las configuraciones F, M y P tal como aparecen en la guía.', ['familia', 'mama', 'papa']),
    exercise('Compara los movimientos', choose('semicirculo', '¿Cuál de las tres figuras muestra un semicírculo hacia delante con ambas manos?',
      ['Papá', 'Familia', 'Mamá'], 1, 'La ficha Familia muestra un semicírculo con ambas manos.')),
    assessment(associate('vinculos', 'Relaciona cada significado con la ficha de estudio.', ['Mamá', 'Familia', 'Papá'],
      [['El conjunto de personas de un grupo familiar', 1], ['Una forma cercana de referirse a la madre', 0],
        ['Una forma cercana de referirse al padre', 2]], 'Familia identifica al grupo. Mamá y Papá identifican vínculos familiares concretos.')),
  ]),
  lesson('comunidad', 'Comunidad y lugares', '8 min', 'Observa y practica las señas Casa y Colegio.', [
    'Elegir la seña de un lugar según su uso.',
    'Distinguir la silueta de Casa del movimiento de Colegio.',
  ], [
    study('Compara Casa y Colegio', 'Abre las dos páginas de la guía. Ensaya las figuras prestando atención a la posición de las manos y al movimiento que muestra cada una.', ['casa', 'colegio']),
    exercise('Identifica el lugar', choose('aulas', 'Visitas un lugar con aulas donde se imparten clases. ¿Qué seña practicarías?',
      ['Colegio', 'Casa'], 0, 'Colegio identifica un lugar en el que se imparten clases.')),
    assessment(
      choose('tejado', '¿En cuál de las figuras juntas las yemas de los dedos para dibujar un techo?', ['Colegio', 'Casa'], 1,
        'La figura Casa representa la silueta de un techo.'),
      choose('vivienda', 'Buscas la ficha del lugar donde vives con tu familia. ¿Cuál abres?', ['Casa', 'Colegio'], 0,
        'Casa es la ficha del lugar que sirve como vivienda.')),
  ]),
  lesson('repaso-cotidiano', 'Evaluación integradora', '12 min',
    'Aplica cantidades, saludos y expresiones estudiadas en pequeños casos cotidianos.', [
      'Seleccionar vocabulario de la ruta básica según la situación.',
      'Resolver un recuento y distinguir una postura numérica estudiada.',
    ], [
      study('Prepara tu repaso', 'Imagina que llegas al colegio para repartir materiales. Repasa las señas de la lista y practica cada una por separado con su referencia.', [
        'buenos-dias', 'colegio', 'LSP-003', 'seis', 'ocho', 'cero', 'LSP-007', 'LSP-010',
      ]),
      exercise('Elige la cantidad para el reparto', choose('mesa', 'Hay cuatro fichas en una mesa y añades dos. ¿Qué número prepararías?',
        ['Cero', 'Tres', 'Seis', 'Ocho'], 2, 'Cuatro más dos da seis. Revisa esa figura en la lámina numérica.')),
      assessment(
        choose('imagen', '¿Qué número representa esta postura?', ['Uno', 'Dos', 'Tres', 'Cinco'], 2,
          'En Tres quedan extendidos pulgar, índice y medio.', 'LSP-003'),
        choose('material', 'De diez fichas repartes dos. ¿Qué cantidad queda?', ['Ocho', 'Cero', 'Tres', 'Seis'], 0,
          'Diez menos dos da ocho. Puedes repasar su postura en la lámina numérica.'),
        associate('encuentro', 'Elige una seña o saludo estudiado para cada intención.', ['Nada', 'Con', 'Colegio', 'Buenos días'],
          [['Indicar dónde se imparte la clase', 2], ['Saludar al llegar por la mañana', 3],
            ['Expresar que la caja quedó vacía', 0], ['Indicar que llegaste en compañía de alguien', 1]],
          'Las elecciones comprueban el sentido de cada seña o saludo en el caso descrito.')),
    ]),
] satisfies Lesson[];
