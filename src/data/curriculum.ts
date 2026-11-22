import type { LessonPlan } from './lessonPlan.ts';
import type { StudyRun } from './lessonStudy.ts';
import { numbersLesson } from './numbersLesson.ts';
import { basicLessons } from './basicLessons.ts';

type ActivityOption = { id: string; label: string };
type ActivityBase = { question: string; success: string; explanation?: string; diagramId?: string };
export type LessonActivity = ActivityBase & (
  | { type: 'choice' | 'identify'; options: ActivityOption[]; correctId: string }
  | { type: 'association'; options: ActivityOption[]; pairs: { id: string; label: string; answerId: string }[] }
  | { type: 'order'; options: ActivityOption[]; order: string[] }
);

type LegacyLessonContent = {
  heading: string;
  explanation: string;
  concepts?: { title: string; description: string; example: string }[];
  activity: LessonActivity;
  signId?: string;
  practiceSignId?: string;
  videoSrc?: string;
  thumbnailSrc?: string;
  captionsSrc?: string;
};
export type Lesson = {
  id: string;
  title: string;
  duration: string;
  description: string;
} & ({ content: LegacyLessonContent; plan?: never } | { plan: LessonPlan; content?: never });
export type Unit = { id: number; title: string; subtitle: string; illustration: 'greetings' | 'alphabet' | 'everyday'; lessons: Lesson[] };

const previousUnits: Unit[] = [
  {
    id: 1,
    title: 'Primeros pasos',
    subtitle: 'Introducción y saludos básicos.',
    illustration: 'greetings',
    lessons: [
      {
        id: 'introduccion', title: 'Introducción a la LSP', duration: '8 min',
        description: 'Conoce la Lengua de Señas Peruana y prepara tu recorrido de aprendizaje.',
        content: {
          heading: 'Un aprendizaje visual y contextual',
          explanation: 'Comienza por conocer el contexto de una expresión y observa las demostraciones completas. En el material de LSP, presta atención a las manos, los movimientos y las expresiones faciales. Practica con recursos revisados y a tu propio ritmo.',
          concepts: [
            { title: 'Observar', description: 'Explora una demostración completa antes de repetirla.', example: 'Mira el contexto' },
            { title: 'Practicar', description: 'Vuelve al material y repasa los detalles con calma.', example: 'Avanza a tu ritmo' },
          ],
          activity: {
            type: 'choice', question: '¿Qué recurso te permite observar cómo se realiza una seña de LSP?',
            options: [{ id: 'video', label: 'Una demostración en video revisada' }, { id: 'palabra', label: 'Solo la palabra escrita' }],
            correctId: 'video', success: '¡Correcto! Un video revisado permite observar la demostración completa.',
          },
        },
      },
      {
        id: 'saludos', title: 'Saludos básicos', duration: '10 min',
        description: 'Identifica expresiones habituales para comenzar y terminar un encuentro.',
        content: {
          heading: '¿Cuándo usamos estas expresiones?',
          explanation: 'Al encontrarnos con alguien, generalmente saludamos; cuando termina el encuentro, nos despedimos. Aprender LSP exige observar la forma, el movimiento y el contexto de cada seña.',
          concepts: [
            { title: 'Saludar', description: 'Al comenzar una interacción.', example: '«Hola»' },
            { title: 'Despedirse', description: 'Al terminar una interacción.', example: '«Adiós»' },
          ],
          signId: 'hola', practiceSignId: 'hola',
          activity: {
            type: 'choice', question: 'Acabas de llegar al instituto y encuentras a un compañero. ¿Qué expresión corresponde utilizar?',
            options: [{ id: 'hola', label: 'Hola' }, { id: 'adios', label: 'Adiós' }],
            correctId: 'hola', success: '¡Correcto! Para iniciar el encuentro corresponde saludar.',
          },
        },
      },
      {
        id: 'cortesia', title: 'Expresiones de cortesía', duration: '8 min',
        description: 'Reconoce expresiones para agradecer y solicitar apoyo.',
        content: {
          heading: 'La cortesía en una conversación',
          explanation: 'Elegir una expresión adecuada ayuda a comunicar tu intención. Puedes agradecer cuando recibes apoyo y solicitar ayuda cuando necesitas orientación. Consulta el contexto y la demostración de cada expresión.',
          signId: 'gracias',
          activity: {
            type: 'association', question: 'Relaciona cada situación con la expresión adecuada.',
            pairs: [{ id: 'agradecer', label: 'Una compañera te presta sus apuntes', answerId: 'gracias' }, { id: 'orientacion', label: 'Necesitas encontrar tu aula', answerId: 'ayuda' }],
            options: [{ id: 'gracias', label: 'Gracias' }, { id: 'ayuda', label: 'Ayuda' }],
            success: '¡Bien! Relacionaste las expresiones con su contexto de uso.',
          },
        },
      },
      {
        id: 'repaso-basico', title: 'Repaso del vocabulario', duration: '7 min',
        description: 'Repasa saludos, despedidas y expresiones de cortesía.',
        content: {
          heading: 'Una expresión para cada momento',
          explanation: 'Piensa en el momento de la conversación. Puedes saludar al llegar, agradecer después de recibir apoyo y despedirte al terminar. El contexto te ayuda a elegir el vocabulario que quieres expresar.',
          signId: 'adios',
          activity: {
            type: 'identify', question: 'Tu conversación ha terminado y vas a salir. Identifica la expresión adecuada.',
            options: [{ id: 'hola', label: 'Hola' }, { id: 'adios', label: 'Adiós' }, { id: 'gracias', label: 'Gracias' }],
            correctId: 'adios', success: '¡Correcto! «Adiós» corresponde a una despedida.',
          },
        },
      },
      {
        id: 'evaluacion-inicial', title: 'Evaluación de la unidad', duration: '10 min',
        description: 'Comprueba los conceptos de esta primera unidad.',
        content: {
          heading: 'Comprueba el contexto de las expresiones',
          explanation: 'Esta actividad repasa el significado y el uso de las expresiones de la unidad. La práctica de la ejecución de señas se incorporará con los recursos audiovisuales y la evaluación correspondiente.',
          activity: {
            type: 'association', question: 'Asocia los momentos de la conversación con su expresión.',
            pairs: [{ id: 'inicio', label: 'Al comenzar un encuentro', answerId: 'hola' }, { id: 'apoyo', label: 'Después de recibir apoyo', answerId: 'gracias' }, { id: 'final', label: 'Al terminar el encuentro', answerId: 'adios' }],
            options: [{ id: 'hola', label: 'Hola' }, { id: 'gracias', label: 'Gracias' }, { id: 'adios', label: 'Adiós' }],
            success: '¡Muy bien! Identificaste el uso de las expresiones de la unidad.',
          },
        },
      },
    ],
  },
  {
    id: 2,
    title: 'Alfabeto y números',
    subtitle: 'Dactilología y expresiones numéricas.',
    illustration: 'alphabet',
    lessons: [
      {
        id: 'abecedario', title: 'Abecedario manual', duration: '12 min',
        description: 'Prepara el estudio del alfabeto manual con recursos visuales.',
        content: {
          heading: 'Observa el alfabeto manual',
          explanation: 'Este espacio reunirá las demostraciones del alfabeto manual. Para estudiar cada letra, necesitarás observar la configuración y la orientación de la mano en materiales de LSP revisados. Puedes volver a cada demostración para comparar sus detalles.',
          activity: {
            type: 'choice', question: '¿Qué conviene hacer al estudiar una letra del alfabeto manual?',
            options: [{ id: 'observar', label: 'Observar su demostración y repasar sus detalles' }, { id: 'adivinar', label: 'Deducir la forma de la mano a partir de la letra escrita' }],
            correctId: 'observar', success: '¡Correcto! Observa y repasa la demostración revisada de cada letra.',
          },
        },
      },
      {
        id: 'numeros', title: 'Números básicos', duration: '9 min',
        description: 'Aprende los números del uno al cinco en LSP y practícalos con o sin cámara.',
        plan: numbersLesson,
      },
      {
        id: 'dactilologia', title: 'Dactilología en contexto', duration: '10 min',
        description: 'Organiza tu práctica del alfabeto en secuencias breves.',
        content: {
          heading: 'De la observación a una secuencia',
          explanation: 'Para preparar una secuencia de letras, repasa primero sus demostraciones individuales y luego observa cómo se presentan en conjunto. El material de esta lección se completará con ejemplos revisados de LSP.',
          activity: {
            type: 'choice', question: '¿Qué orden de estudio te ayuda a preparar una secuencia de letras?',
            options: [{ id: 'primero-secuencia', label: 'Repetir una secuencia sin consultar las letras' }, { id: 'primero-letras', label: 'Observar las letras y después repasar la secuencia' }],
            correctId: 'primero-letras', success: '¡Bien! Repasar primero cada letra permite observar sus detalles.',
          },
        },
      },
      {
        id: 'repaso-alfabeto', title: 'Repaso de alfabeto y números', duration: '10 min',
        description: 'Relaciona contenidos del alfabeto y las cantidades.',
        content: {
          heading: 'Organiza lo que has repasado',
          explanation: 'Distingue el estudio de las letras del estudio de las cantidades. En ambos casos, acompaña el significado con observación de recursos visuales y práctica pausada.',
          activity: {
            type: 'association', question: 'Relaciona cada contenido con el propósito de su práctica.',
            pairs: [{ id: 'letras', label: 'Repasar demostraciones de letras', answerId: 'alfabeto' }, { id: 'cantidades', label: 'Indicar cuántos objetos necesitas', answerId: 'numeros' }],
            options: [{ id: 'numeros', label: 'Números' }, { id: 'alfabeto', label: 'Alfabeto manual' }],
            success: '¡Correcto! Relacionaste los contenidos con su propósito.',
          },
        },
      },
    ],
  },
  {
    id: 3,
    title: 'Vida cotidiana',
    subtitle: 'Familia, comunidad y comunicación básica.',
    illustration: 'everyday',
    lessons: [
      {
        id: 'presentaciones', title: 'Presentación personal', duration: '10 min',
        description: 'Reconoce el contexto de una presentación y un primer encuentro.',
        content: {
          heading: 'El primer encuentro con alguien',
          explanation: 'Una presentación suele comenzar con un saludo y un intercambio de información personal. Esta lección propone situaciones para reconocer el inicio de la conversación y preparar la consulta de las demostraciones de LSP.',
          signId: 'hola',
          activity: {
            type: 'choice', question: 'Te presentan a una nueva compañera. ¿Qué expresión corresponde al iniciar el encuentro?',
            options: [{ id: 'adios', label: 'Adiós' }, { id: 'hola', label: 'Hola' }, { id: 'no', label: 'No' }],
            correctId: 'hola', success: '¡Correcto! Puedes comenzar el encuentro con un saludo.',
          },
        },
      },
      {
        id: 'familia', title: 'Familia y personas', duration: '11 min',
        description: 'Explora vocabulario para hablar de personas cercanas.',
        content: {
          heading: 'Las personas de tu entorno',
          explanation: 'El vocabulario de la familia permite hablar de personas cercanas y de sus vínculos. Relaciona cada palabra con su significado y consulta después su demostración visual en la biblioteca.',
          signId: 'familia',
          activity: {
            type: 'association', question: 'Relaciona cada vínculo con la palabra correspondiente.',
            pairs: [{ id: 'madre', label: 'Una forma cercana de referirse a la madre', answerId: 'mama' }, { id: 'padre', label: 'Una forma cercana de referirse al padre', answerId: 'papa' }],
            options: [{ id: 'papa', label: 'Papá' }, { id: 'mama', label: 'Mamá' }],
            success: '¡Bien! Identificaste las palabras asociadas a estos vínculos familiares.',
          },
        },
      },
      {
        id: 'comunidad', title: 'Comunidad y lugares', duration: '9 min',
        description: 'Reconoce situaciones para pedir orientación en tu comunidad.',
        content: {
          heading: 'Pide orientación cuando la necesitas',
          explanation: 'En el instituto, una biblioteca o un establecimiento puedes necesitar indicaciones. Identifica primero qué necesitas comunicar y elige una expresión adecuada para solicitar apoyo.',
          signId: 'ayuda',
          activity: {
            type: 'identify', question: 'Necesitas encontrar un aula y buscas orientación. ¿Qué palabra expresa esa necesidad?',
            options: [{ id: 'ayuda', label: 'Ayuda' }, { id: 'adios', label: 'Adiós' }, { id: 'agua', label: 'Agua' }],
            correctId: 'ayuda', success: '¡Correcto! «Ayuda» permite expresar que necesitas apoyo.',
          },
        },
      },
      {
        id: 'alimentos', title: 'Alimentos y bebidas', duration: '10 min',
        description: 'Relaciona vocabulario con necesidades del día a día.',
        content: {
          heading: 'Comunica lo que necesitas',
          explanation: 'Hablar de alimentos y bebidas forma parte de muchas situaciones cotidianas. Relaciona las palabras con el contexto antes de consultar cómo se expresan en el material visual de LSP.',
          signId: 'agua',
          activity: {
            type: 'association', question: 'Relaciona cada necesidad con el vocabulario adecuado.',
            pairs: [{ id: 'beber', label: 'Buscas una botella para beber', answerId: 'agua' }, { id: 'almuerzo', label: 'Vas a preguntar por el almuerzo', answerId: 'comida' }],
            options: [{ id: 'agua', label: 'Agua' }, { id: 'comida', label: 'Comida' }],
            success: '¡Correcto! Relacionaste las palabras con las necesidades descritas.',
          },
        },
      },
      {
        id: 'expresiones', title: 'Expresiones cotidianas', duration: '10 min',
        description: 'Amplía tus recursos para responder y comunicar decisiones.',
        content: {
          heading: 'Respuestas en una conversación',
          explanation: 'Durante una conversación puedes confirmar una información, aceptar una invitación o expresar una negativa. Identifica tu intención y consulta la demostración de la expresión que deseas utilizar.',
          signId: 'si',
          activity: {
            type: 'choice', question: 'Una compañera te invita a estudiar y quieres aceptar. ¿Qué respuesta corresponde?',
            options: [{ id: 'no', label: 'No' }, { id: 'adios', label: 'Adiós' }, { id: 'si', label: 'Sí' }],
            correctId: 'si', success: '¡Correcto! «Sí» permite expresar que aceptas la invitación.',
          },
        },
      },
      {
        id: 'repaso-cotidiano', title: 'Repaso de vida cotidiana', duration: '12 min',
        description: 'Aplica el vocabulario de la unidad a contextos habituales.',
        content: {
          heading: 'El vocabulario dentro de una situación',
          explanation: 'Relaciona las expresiones con lo que sucede a tu alrededor. Este repaso reúne situaciones de la comunidad, las compras y la cortesía para preparar la práctica en contexto.',
          activity: {
            type: 'association', question: 'Asocia cada contexto con la palabra que necesitas.',
            pairs: [{ id: 'indicaciones', label: 'Necesitas indicaciones para llegar a un lugar', answerId: 'ayuda' }, { id: 'bebida', label: 'Quieres comprar una botella para beber', answerId: 'agua' }, { id: 'agradecimiento', label: 'Una persona te ha orientado', answerId: 'gracias' }],
            options: [{ id: 'gracias', label: 'Gracias' }, { id: 'ayuda', label: 'Ayuda' }, { id: 'agua', label: 'Agua' }],
            success: '¡Muy bien! Relacionaste el vocabulario con los contextos de la unidad.',
          },
        },
      },
    ],
  },
];

export const legacyUnitLessonIds = previousUnits.map(unit => unit.lessons.map(lesson => lesson.id));
const previousLessons = previousUnits.flatMap(unit => unit.lessons);

function lessons(...ids: string[]): Lesson[] {
  return ids.map(id => {
    const available = basicLessons.find(lesson => lesson.id === id) ?? previousLessons.find(lesson => lesson.id === id);
    if (!available) throw new Error(`Lección desconocida: ${id}`);
    return available;
  });
}

export const units: Unit[] = [
  { id: 1, title: 'Primeros pasos', subtitle: 'Conoce la LSP y practica la atención visual.', illustration: 'greetings',
    lessons: lessons('introduccion', 'comunicacion-visual', 'repaso-basico', 'evaluacion-inicial') },
  { id: 2, title: 'Números básicos', subtitle: 'Identifica cantidades y estudia los números del cero al diez.', illustration: 'alphabet',
    lessons: lessons('numeros', 'cero', 'seis-a-diez', 'abecedario', 'dactilologia', 'repaso-alfabeto') },
  { id: 3, title: 'Saludos y cortesía', subtitle: 'Elige un saludo según el momento y practica cómo pedir disculpas.', illustration: 'greetings',
    lessons: lessons('saludos', 'cortesia') },
  { id: 4, title: 'Expresiones cotidianas', subtitle: 'Practica respuestas, cantidades y compañía.', illustration: 'everyday',
    lessons: lessons('expresiones', 'elecciones-y-compania') },
  { id: 5, title: 'Personas, familia y entorno', subtitle: 'Identifica vínculos familiares y lugares frecuentes.', illustration: 'everyday',
    lessons: lessons('familia', 'comunidad', 'presentaciones', 'alimentos') },
  { id: 6, title: 'Aplicación y evaluación', subtitle: 'Usa el vocabulario estudiado en situaciones cotidianas.', illustration: 'alphabet',
    lessons: lessons('repaso-cotidiano') },
];

export const initialCompletedLessonIds = ['introduccion', 'abecedario'];
export const functionalLessons = units.flatMap(unit => unit.lessons.filter(lesson => lesson.plan).map(lesson => ({ unit, lesson })));
export const totalLessons = functionalLessons.length;

export function getCurriculumProgress({ lessonStudy }: { lessonStudy?: Record<string, StudyRun> }) {
  const completed = functionalLessons.filter(({ lesson }) => !!lessonStudy?.[lesson.id]?.completedAt).map(({ lesson }) => lesson.id);
  const unitProgress = units.map(unit => {
    const count = unit.lessons.filter(lesson => lesson.plan).length;
    const done = unit.lessons.filter(lesson => lesson.plan && completed.includes(lesson.id)).length;
    return { unit, count, done, percent: count ? Math.round(done / count * 100) : null };
  });
  return { total: totalLessons, done: completed.length, completed, unitProgress,
    percent: totalLessons ? Math.round(completed.length / totalLessons * 100) : 0 };
}

export function getUnitPath(unitId: number) {
  return `/academia/unidad/${unitId}`;
}

export function getLessonPath(unitId: number, lessonId: string) {
  return `${getUnitPath(unitId)}/leccion/${lessonId}`;
}

export function getLessonLocation(lessonId: string) {
  for (const unit of units) {
    const lesson = unit.lessons.find(item => item.id === lessonId);
    if (lesson) return { unit, lesson };
  }
}

export function getNextLesson(unit: Unit, completed: string[]) {
  return unit.lessons.find(lesson => !completed.includes(lesson.id));
}

export function getResumeLesson(completed: string[], lastLessonId: string | null = null) {
  const last = lastLessonId ? getLessonLocation(lastLessonId) : undefined;
  if (last && !completed.includes(last.lesson.id)) return last;
  for (const unit of units) {
    const lesson = getNextLesson(unit, completed);
    if (lesson) return { unit, lesson };
  }
  return last ?? { unit: units[0], lesson: units[0].lessons[0] };
}
