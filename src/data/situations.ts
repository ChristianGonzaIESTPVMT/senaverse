import { localIllustration, type IllustrationAsset } from './illustrations.ts';

export type SituationDifficulty = 'basico' | 'intermedio';
export type SituationFilter = 'todos' | SituationDifficulty;

export type SituationScene = {
  id: string;
  title: string;
  context: string;
  illustrationAfterAnswer?: true;
  question: string;
  optionIds: readonly [string, string, ...string[]];
  expectedSignId: string;
  explanation: string;
};

export type Situation = {
  id: string;
  title: string;
  difficulty: SituationDifficulty;
  description: string;
  context: string;
  objectives: readonly string[];
  rewardXp?: number;
  illustration: 'institute' | 'meeting' | 'shop' | 'library' | 'food' | 'numbers';
  illustrationSrc?: IllustrationAsset;
  illustrationAfterAnswer?: true;
  scenes: [SituationScene, ...SituationScene[]];
};

const SITUATION_XP = 40;

// Preserve original URLs and saved responses from the questionnaire prototype.
const archivedSituations: Situation[] = [
  {
    id: 'instituto',
    title: 'Un día en el instituto',
    difficulty: 'basico',
    description: 'Saluda, despídete, agradece y pide ayuda en el instituto.',
    context: 'Encuentros breves con tus compañeros durante un día de clases.',
    objectives: ['Distinguir saludos, agradecimientos y despedidas.'],
    illustration: 'institute',
    scenes: [
      {
        id: 'encuentro',
        title: 'Encuentro con un compañero',
        context: 'Llegas al instituto y encuentras a un compañero que te saluda.',
        question: '¿Qué expresión utilizarías para responder a su saludo?',
        optionIds: ['hola', 'adios', 'gracias'],
        expectedSignId: 'hola',
        explanation: 'Al iniciar un encuentro corresponde saludar. «Hola» permite responder al saludo de tu compañero.',
      },
      {
        id: 'agradecimiento',
        title: 'Una mano para encontrar tu aula',
        context: 'Pides ayuda para encontrar tu aula. Una compañera te acompaña y te muestra el camino.',
        question: '¿Qué expresión utilizarías para agradecer su ayuda?',
        optionIds: ['adios', 'gracias', 'hola'],
        expectedSignId: 'gracias',
        explanation: 'Tu compañera te ha ayudado. «Gracias» expresa agradecimiento por su apoyo.',
      },
      {
        id: 'despedida',
        title: 'Hasta el próximo encuentro',
        context: 'Las clases han terminado. Te separas de tus compañeros para volver a casa.',
        question: '¿Qué expresión corresponde al terminar el encuentro?',
        optionIds: ['hola', 'ayuda', 'adios'],
        expectedSignId: 'adios',
        explanation: 'Cuando termina un encuentro usamos una despedida. En este contexto corresponde «Adiós».',
      },
    ],
  },
  {
    id: 'conociendo-a-alguien',
    title: 'Conociendo a alguien',
    difficulty: 'basico',
    description: 'Preséntate, conoce a otras personas y utiliza expresiones de cortesía.',
    context: 'Una amiga te presenta a alguien de su grupo de estudio.',
    objectives: ['Identificar cuándo saludar, aceptar una invitación o agradecer.'],
    illustration: 'meeting',
    scenes: [
      {
        id: 'primer-saludo',
        title: 'Tu primera conversación',
        context: 'Un amigo te presenta a Lucía. Ella te da la bienvenida y espera tu saludo.',
        question: '¿Qué expresión utilizarías para comenzar la conversación?',
        optionIds: ['gracias', 'hola', 'adios'],
        expectedSignId: 'hola',
        explanation: 'Estás comenzando una conversación con alguien que acabas de conocer. «Hola» es un saludo adecuado.',
      },
      {
        id: 'confirmacion',
        title: 'Una invitación a participar',
        context: 'Lucía te pregunta si quieres unirte a su grupo de estudio. Te gustaría participar.',
        question: '¿Cómo expresarías que aceptas su invitación?',
        optionIds: ['no', 'adios', 'LSP-006'],
        expectedSignId: 'LSP-006',
        explanation: 'Quieres aceptar la invitación. «Sí» permite expresar una respuesta afirmativa.',
      },
      {
        id: 'cortesia',
        title: 'Un gesto de cortesía',
        context: 'Antes de terminar la conversación, Lucía comparte contigo los materiales para la próxima reunión.',
        question: '¿Qué expresión utilizarías para agradecerle?',
        optionIds: ['gracias', 'hola', 'no'],
        expectedSignId: 'gracias',
        explanation: 'Lucía te ha compartido algo que te ayuda. «Gracias» expresa tu agradecimiento.',
      },
    ],
  },
  {
    id: 'necesito-ayuda',
    title: 'Necesito ayuda',
    difficulty: 'intermedio',
    description: 'Utiliza expresiones para solicitar orientación y resolver dudas.',
    context: 'Buscas un libro y pides orientación al personal de la biblioteca.',
    objectives: ['Identificar una solicitud de ayuda, una confirmación y un agradecimiento.'],
    illustration: 'library',
    scenes: [
      {
        id: 'orientacion',
        title: 'Un libro difícil de encontrar',
        context: 'Estás en la biblioteca y no encuentras el libro que necesitas. Te acercas al personal de atención.',
        question: '¿Qué palabra expresa que necesitas apoyo para encontrarlo?',
        optionIds: ['gracias', 'ayuda', 'adios'],
        expectedSignId: 'ayuda',
        explanation: 'Necesitas orientación para encontrar un libro. «Ayuda» permite expresar esa necesidad.',
      },
      {
        id: 'libro-correcto',
        title: 'Una pregunta para confirmar',
        context: 'Te muestran el libro que buscabas y te preguntan si es el correcto. Reconoces que sí lo es.',
        question: '¿Qué respuesta permite confirmar que es el libro correcto?',
        optionIds: ['LSP-006', 'no', 'adios'],
        expectedSignId: 'LSP-006',
        explanation: 'Has encontrado el libro correcto. «Sí» permite confirmar que es el que necesitas.',
      },
      {
        id: 'agradecer-orientacion',
        title: 'Gracias por la orientación',
        context: 'Ya tienes el libro y sabes dónde puedes consultarlo gracias a las indicaciones recibidas.',
        question: '¿Qué expresión utilizarías para agradecer la orientación?',
        optionIds: ['hola', 'adios', 'gracias'],
        expectedSignId: 'gracias',
        explanation: 'Has recibido apoyo para resolver tu duda. «Gracias» expresa agradecimiento por la orientación.',
      },
    ],
  },
];

const shopSituation: Situation = {
  id: 'tienda',
  title: 'Comprando en una tienda',
  difficulty: 'intermedio',
  description: 'Identifica un producto, elige la cantidad y agradece la atención.',
  context: 'En la tienda del barrio buscas agua para ti y para un amigo.',
  objectives: ['Identificar el vocabulario de una compra.', 'Indicar dos unidades en el contexto de la compra.'],
  rewardXp: SITUATION_XP,
  illustration: 'shop',
  illustrationSrc: localIllustration('situaciones/situacion-01-tienda', 1200, 1200),
  scenes: [
    {
      id: 'llegada',
      title: 'Al entrar en la tienda',
      context: 'Entras en una tienda del barrio. La persona que atiende te recibe con un saludo.',
      question: '¿Qué expresión utilizarías para iniciar la interacción?',
      optionIds: ['adios', 'gracias', 'hola'],
      expectedSignId: 'hola',
      explanation: 'Acabas de llegar y vas a comenzar una interacción. Corresponde responder con «Hola».',
    },
    {
      id: 'producto',
      title: 'El producto que necesitas',
      illustrationAfterAnswer: true,
      context: 'Después de una caminata tienes sed. Quieres comprar una botella de agua.',
      question: '¿Qué palabra corresponde al producto que buscas?',
      optionIds: ['agua', 'comida', 'ayuda'],
      expectedSignId: 'agua',
      explanation: 'Buscas una botella para beber agua. La palabra que corresponde a ese producto es «Agua».',
    },
    {
      id: 'cantidad',
      title: 'Una para ti y otra para tu amigo',
      context: 'Decides comprar una botella para ti y una para tu amigo. Te preguntan cuántas necesitas.',
      question: '¿Qué cantidad debes indicar?',
      optionIds: ['LSP-001', 'LSP-002', 'LSP-003'],
      expectedSignId: 'LSP-002',
      explanation: 'Una botella para cada persona suma dos botellas. La cantidad que necesitas indicar es «Dos».',
    },
    {
      id: 'fin-de-compra',
      title: 'Al finalizar tu compra',
      context: 'La persona que atiende te entrega tu compra y te ayuda a guardarla.',
      question: '¿Qué expresión utilizarías para agradecer la atención?',
      optionIds: ['no', 'hola', 'gracias'],
      expectedSignId: 'gracias',
      explanation: 'Has recibido atención y ayuda. Puedes expresar tu agradecimiento con «Gracias».',
    },
  ],
};

export const situations: Situation[] = [
  shopSituation,
  {
    id: 'comida', title: 'Pidiendo comida', difficulty: 'intermedio', illustration: 'food',
    illustrationSrc: localIllustration('situaciones/situacion-02-comida', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Elige una porción y describe cuánto queda.',
    context: 'En el comedor eliges una porción y miras qué queda en las bandejas.',
    objectives: ['Indicar una porción.', 'Distinguir ausencia de abundancia.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'porcion', title: 'Una porción para el almuerzo',
        context: 'Almuerzas por tu cuenta y pides exactamente una porción de sopa.',
        question: '¿Qué número indica cuántas porciones pides?', optionIds: ['LSP-002', 'LSP-003', 'LSP-001'],
        expectedSignId: 'LSP-001', explanation: 'Has pedido una sola porción, por eso corresponde «Uno».' },
      { id: 'bandeja-vacia', title: 'Se acabó el pan',
        context: 'La bandeja de pan está vacía y no hay más pan en la cocina.',
        question: '¿Qué palabra expresa que no queda pan?', optionIds: ['LSP-007', 'LSP-008', 'LSP-001'],
        expectedSignId: 'LSP-007', explanation: 'Como la bandeja está vacía, «Nada» expresa que no queda pan.' },
      { id: 'bandeja-llena', title: 'Arroz para todos',
        context: 'Ves una bandeja de arroz casi llena. Hay suficiente para todas las personas de la mesa.',
        question: '¿Qué palabra describe la cantidad abundante de arroz?', optionIds: ['LSP-007', 'LSP-001', 'LSP-008'],
        expectedSignId: 'LSP-008', explanation: 'Hay arroz en abundancia, así que corresponde «Mucho».' },
    ],
  },
  {
    id: 'preguntas', title: 'Respondiendo preguntas', difficulty: 'basico', illustration: 'library',
    illustrationSrc: localIllustration('situaciones/situacion-03-preguntas', 1200, 1200),
    description: 'Confirma un dato e indica cuando una cantidad es cero.',
    context: 'En la biblioteca confirmas tu reserva y revisas tus préstamos.',
    objectives: ['Reconocer una respuesta afirmativa.', 'Identificar el número cero.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'confirmacion', title: 'El libro reservado',
        context: 'Te muestran el libro que reservaste. Reconoces la portada y compruebas que es el correcto.',
        question: 'Te preguntan si ese es tu libro reservado. ¿Qué respuesta afirma que lo es?',
        optionIds: ['no', 'LSP-006'], expectedSignId: 'LSP-006', explanation: 'El libro coincide con tu reserva. «Sí» expresa esa confirmación.' },
      { id: 'prestamos', title: 'Préstamos devueltos',
        context: 'Ya devolviste todos tus libros. Tu cuenta no muestra ningún préstamo pendiente.',
        question: '¿Qué número indica cuántos préstamos quedan pendientes?', optionIds: ['LSP-001', 'cero'],
        expectedSignId: 'cero', explanation: 'Devolviste todos los libros. Quedan cero préstamos pendientes.' },
    ],
  },
  {
    id: 'actividad', title: 'Organizando una actividad', difficulty: 'intermedio', illustration: 'meeting',
    illustrationSrc: localIllustration('situaciones/situacion-04-actividad', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Distingue entre participar por tu cuenta y hacerlo en compañía.',
    context: 'En tu grupo de estudio están repartiendo las tareas de una exposición.',
    objectives: ['Distinguir si una persona realiza una tarea sola o en compañía.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'individual', title: 'Una tarea individual',
        context: 'Te toca preparar el cartel por tu cuenta. Nadie más trabaja contigo en esa tarea.',
        question: '¿Qué palabra describe que haces la tarea sin compañía?', optionIds: ['LSP-010', 'LSP-009'],
        expectedSignId: 'LSP-009', explanation: 'Preparas el cartel sin compañía. La opción adecuada es «Solo».' },
      { id: 'equipo', title: 'Un ensayo en pareja',
        context: 'Ana estará a tu lado durante el ensayo. Ensayarán juntos.',
        question: '¿Qué palabra indica que ensayas en compañía de Ana?', optionIds: ['LSP-010', 'LSP-009'],
        expectedSignId: 'LSP-010', explanation: 'Ana te acompaña durante el ensayo, así que corresponde «Con».' },
    ],
  },
  {
    id: 'utiles', title: 'Comprando útiles escolares', difficulty: 'basico', illustration: 'institute',
    illustrationSrc: localIllustration('situaciones/situacion-05-utiles', 1200, 1200),
    description: 'Usa la lista del aula para elegir cuántos útiles comprar.',
    context: 'Vas a la papelería con la lista de útiles para un trabajo de clase.',
    objectives: ['Distinguir las cantidades tres y cuatro en una lista de compra.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'cuadernos', title: 'Cuadernos por curso',
        context: 'Necesitas un cuaderno para Matemática, uno para Comunicación y uno para Ciencia.',
        question: '¿Cuántos cuadernos debes comprar?', optionIds: ['LSP-002', 'LSP-003', 'LSP-004'],
        expectedSignId: 'LSP-003', explanation: 'Necesitas un cuaderno para cada uno de los tres cursos.' },
      { id: 'lapices', title: 'Materiales para el grupo',
        context: 'La profesora te pide un lápiz para cada una de las cuatro personas de tu grupo.',
        question: '¿Qué cantidad de lápices debes llevar?', optionIds: ['LSP-004', 'LSP-005', 'LSP-003'],
        expectedSignId: 'LSP-004', explanation: 'Hay cuatro personas en el grupo y cada una necesita un lápiz.' },
    ],
  },
  {
    id: 'cantidad', title: 'Eligiendo una cantidad', difficulty: 'basico', illustration: 'numbers',
    illustrationSrc: localIllustration('situaciones/situacion-06-cantidad', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Cuenta los materiales entregados y los que faltan.',
    context: 'Preparas materiales para las personas de un taller.',
    objectives: ['Elegir el número que representa el total.', 'Indicar una unidad pendiente.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'total', title: 'Hojas para el taller',
        context: 'Al taller llegaron cinco personas. Quieres entregar una hoja a cada persona.',
        question: '¿Cuántas hojas necesitas en total?', optionIds: ['LSP-001', 'LSP-004', 'LSP-005'],
        expectedSignId: 'LSP-005', explanation: 'Con cinco personas y una hoja para cada una, necesitas cinco hojas.' },
      { id: 'faltante', title: 'La última hoja',
        context: 'Has entregado cuatro de las cinco hojas. Todavía queda una persona sin su hoja.',
        question: '¿Cuántas hojas te falta entregar?', optionIds: ['LSP-005', 'LSP-001', 'cero'],
        expectedSignId: 'LSP-001', explanation: 'Ya entregaste cuatro hojas de un total de cinco. Falta una.' },
    ],
  },
];

export const allSituations = [...situations, ...archivedSituations];

export function getSituation(id: unknown) {
  return allSituations.find(situation => situation.id === id);
}

export function getSituationFilter(value: string | null): SituationFilter {
  return value === 'basico' || value === 'intermedio' ? value : 'todos';
}

export function getSituationsPath(filter: SituationFilter = 'todos') {
  return filter === 'todos' ? '/simulador' : `/simulador?nivel=${filter}`;
}

export function getSituationPath(situationId: string, filter: SituationFilter = 'todos') {
  const query = filter === 'todos' ? '' : `?nivel=${filter}`;
  return `/simulador/${encodeURIComponent(situationId)}${query}`;
}

export function getSituationScenePath(situationId: string, sceneId: string, filter: SituationFilter = 'todos') {
  const query = filter === 'todos' ? '' : `?nivel=${filter}`;
  return `/simulador/${encodeURIComponent(situationId)}/escena/${encodeURIComponent(sceneId)}${query}`;
}

export function getSituationResultsPath(situationId: string, filter: SituationFilter = 'todos') {
  const query = filter === 'todos' ? '' : `?nivel=${filter}`;
  return `/simulador/${encodeURIComponent(situationId)}/resultados${query}`;
}

export function getSituationReturnPath(value: unknown) {
  if (!value || typeof value !== 'object' || !('situationId' in value) || !('sceneId' in value)) return;
  const situation = getSituation(value.situationId);
  const scene = situation?.scenes.find(item => item.id === value.sceneId);
  if (!situation || !scene) return;
  const filter = 'filter' in value && typeof value.filter === 'string' ? getSituationFilter(value.filter) : 'todos';
  return getSituationScenePath(situation.id, scene.id, filter);
}
