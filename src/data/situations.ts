import { localIllustration, type IllustrationAsset } from './illustrations.ts';

export type SituationDifficulty = 'basico' | 'intermedio';
export type SituationFilter = 'todos' | SituationDifficulty;

export type SituationScene = {
  id: string;
  title: string;
  context: string;
  illustrationAfterAnswer?: true;
  dialogue?: 'camera' | 'visual';
  question: string;
  optionIds: readonly [string, string, ...string[]];
  expectedSignId: string;
  explanation: string;
  reply?: string;
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
  speaker?: string;
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
  speaker: 'Persona de la tienda',
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
      context: 'Después de caminar con tu amigo, entras en la tienda. La persona del mostrador hace contacto visual contigo.',
      question: '¡Hola! ¿En qué te ayudo?',
      optionIds: ['adios', 'gracias', 'hola'],
      expectedSignId: 'hola',
      explanation: 'Acabas de llegar y vas a comenzar una interacción. Corresponde responder con «Hola».',
      reply: 'Te escucho. ¿Qué necesitas llevar?',
    },
    {
      id: 'producto',
      title: 'El producto que necesitas',
      illustrationAfterAnswer: true,
      context: 'Tienes sed después de la caminata y buscas algo para beber. En el mostrador hay botellas y bocadillos.',
      question: '¿Qué te doy?',
      optionIds: ['agua', 'comida', 'ayuda'],
      expectedSignId: 'agua',
      explanation: 'En este turno debes nombrar el producto que quieres beber. «Ayuda» serviría para pedir apoyo y «Comida» para pedir algo de comer.',
      reply: 'Tengo agua fría. ¿Cuántas botellas te pongo?',
    },
    {
      id: 'cantidad',
      title: 'Una para ti y otra para tu amigo',
      dialogue: 'camera',
      context: 'Ves que tu amigo todavía espera afuera. Quieres llevarle una botella y quedarte con otra.',
      question: '¿Cuántas botellas te pongo?',
      optionIds: ['LSP-001', 'LSP-002', 'LSP-003'],
      expectedSignId: 'LSP-002',
      explanation: 'Una botella para cada persona suma dos botellas. La cantidad que necesitas indicar es «Dos».',
      reply: 'Aquí tienes las dos. Te las pongo juntas en una bolsa.',
    },
    {
      id: 'fin-de-compra',
      title: 'Al finalizar tu compra',
      context: 'Recibes la bolsa y quieres reconocer la ayuda antes de salir.',
      question: 'Listo, aquí tienes tu compra.',
      optionIds: ['no', 'hola', 'gracias'],
      expectedSignId: 'gracias',
      explanation: 'Has recibido atención y ayuda. Puedes expresar tu agradecimiento con «Gracias».',
      reply: 'De nada. ¡Que les vaya bien en la caminata!',
    },
  ],
};

export const situations: Situation[] = [
  shopSituation,
  {
    id: 'comida', title: 'Pidiendo comida', difficulty: 'intermedio', illustration: 'food', speaker: 'Persona del comedor',
    illustrationSrc: localIllustration('situaciones/situacion-02-comida', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Elige una porción y describe cuánto queda.',
    context: 'En el comedor eliges una porción y miras qué queda en las bandejas.',
    objectives: ['Indicar una porción.', 'Distinguir ausencia de abundancia.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'porcion', title: 'Una porción para el almuerzo', dialogue: 'camera',
        context: 'Llegas al comedor antes que el resto de tu mesa. Por ahora vas a pedir sopa solo para ti.',
        question: '¿Cuántas porciones de sopa te sirvo?', optionIds: ['LSP-002', 'LSP-003', 'LSP-001'],
        expectedSignId: 'LSP-001', explanation: 'Estás pidiendo sopa únicamente para ti. Una porción se indica con «Uno».',
        reply: 'Te sirvo un plato. ¿Puedes mirar si queda pan en la bandeja?' },
      { id: 'bandeja-vacia', title: 'Se acabó el pan', dialogue: 'visual',
        context: 'Te acercas al cesto del pan. En el fondo solo ves migas.',
        question: '¿Cuánto pan queda ahí?', optionIds: ['LSP-007', 'LSP-008', 'LSP-001'],
        expectedSignId: 'LSP-007', explanation: 'Solo quedaron migas. «Nada» comunica que no queda pan para servir.',
        reply: 'Entonces retiro el cesto. ¿Puedes revisar también la bandeja de arroz?' },
      { id: 'bandeja-llena', title: 'Arroz para todos', dialogue: 'visual',
        context: 'El arroz llega casi hasta el borde de la bandeja y aún no lo han repartido.',
        question: '¿Cómo está la bandeja de arroz? ¿Cuánto queda?', optionIds: ['LSP-007', 'LSP-001', 'LSP-008'],
        expectedSignId: 'LSP-008', explanation: 'La bandeja casi llena indica una cantidad abundante. «Mucho» expresa esa idea.',
        reply: 'Perfecto, alcanza para toda tu mesa.' },
    ],
  },
  {
    id: 'preguntas', title: 'Respondiendo preguntas', difficulty: 'basico', illustration: 'library', speaker: 'Persona de la biblioteca',
    illustrationSrc: localIllustration('situaciones/situacion-03-preguntas', 1200, 1200),
    description: 'Confirma un dato e indica cuando una cantidad es cero.',
    context: 'En la biblioteca confirmas tu reserva y revisas tus préstamos.',
    objectives: ['Reconocer una respuesta afirmativa.', 'Identificar el número cero.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'confirmacion', title: 'El libro reservado',
        context: 'Te muestran el libro que reservaste. Reconoces la portada y compruebas que es el correcto.',
        question: '¿Es este el libro que reservaste?',
        optionIds: ['no', 'LSP-006'], expectedSignId: 'LSP-006', explanation: 'La portada coincide con la de tu reserva. Con «Sí» confirmas que es el ejemplar correcto.',
        reply: 'Perfecto. Antes de registrarlo, revisemos tus préstamos anteriores.' },
      { id: 'prestamos', title: 'Préstamos devueltos',
        context: 'Recuerdas que dejaste el último libro en el mostrador ayer. La lista de pendientes está vacía.',
        question: 'Antes de anotar el nuevo préstamo, ¿cuántos libros te quedan por devolver?', optionIds: ['LSP-001', 'cero'],
        expectedSignId: 'cero', explanation: 'La cuenta está vacía, así que hay cero préstamos pendientes.',
        reply: 'Confirmado. Ya registré este libro a tu nombre.' },
    ],
  },
  {
    id: 'actividad', title: 'Organizando una actividad', difficulty: 'intermedio', illustration: 'meeting', speaker: 'Compañera de clase',
    illustrationSrc: localIllustration('situaciones/situacion-04-actividad', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Distingue entre participar por tu cuenta y hacerlo en compañía.',
    context: 'En tu grupo de estudio están repartiendo las tareas de una exposición.',
    objectives: ['Distinguir si una persona realiza una tarea sola o en compañía.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'individual', title: 'Una tarea individual', dialogue: 'visual',
        context: 'El grupo anotó un solo nombre al lado del cartel: el tuyo. El resto prepara las diapositivas.',
        question: '¿Cómo vas a trabajar en el cartel?', optionIds: ['LSP-010', 'LSP-009'],
        expectedSignId: 'LSP-009', explanation: 'Eres la única persona a cargo del cartel. «Solo» indica cómo harás esa tarea.',
        reply: 'Dejo el cartel a tu cargo. Para el ensayo sí pueden juntarse en parejas.' },
      { id: 'equipo', title: 'Un ensayo en pareja', dialogue: 'visual',
        context: 'Ana se apunta a tu mismo turno. Le propones ensayar el inicio mientras ella prepara el cierre.',
        question: '¿Cómo te organizaste para el ensayo?', optionIds: ['LSP-010', 'LSP-009'],
        expectedSignId: 'LSP-010', explanation: 'El cartel lo preparas por tu cuenta, pero en el ensayo participa Ana. «Con» expresa esa compañía.',
        reply: 'Entonces les reservo el mismo turno a los dos.' },
    ],
  },
  {
    id: 'utiles', title: 'Comprando útiles escolares', difficulty: 'basico', illustration: 'institute', speaker: 'Persona de la papelería',
    illustrationSrc: localIllustration('situaciones/situacion-05-utiles', 1200, 1200),
    description: 'Usa la lista del aula para elegir cuántos útiles comprar.',
    context: 'Vas a la papelería con la lista de útiles para un trabajo de clase.',
    objectives: ['Distinguir las cantidades tres y cuatro en una lista de compra.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'cuadernos', title: 'Cuadernos por curso',
        dialogue: 'camera',
        context: 'Necesitas un cuaderno para Matemática, uno para Comunicación y uno para Ciencia.',
        question: 'Tengo estos cuadernos. ¿Cuántos te separo?', optionIds: ['LSP-002', 'LSP-003', 'LSP-004'],
        expectedSignId: 'LSP-003', explanation: 'Hay tres cursos en la lista y necesitas un cuaderno por curso.',
        reply: 'Van tres cuadernos. Me dijiste que también buscabas lápices.' },
      { id: 'lapices', title: 'Materiales para el grupo', dialogue: 'camera',
        context: 'La lista incluye un lápiz para ti y otro para cada uno de tus tres compañeros de grupo.',
        question: '¿Cuántos lápices agrego a la compra?', optionIds: ['LSP-004', 'LSP-005', 'LSP-003'],
        expectedSignId: 'LSP-004', explanation: 'El lápiz para ti más los tres de tus compañeros hacen cuatro.',
        reply: 'Aquí tienes los cuatro lápices y los tres cuadernos.' },
    ],
  },
  {
    id: 'cantidad', title: 'Eligiendo una cantidad', difficulty: 'basico', illustration: 'numbers', speaker: 'Responsable del taller',
    illustrationSrc: localIllustration('situaciones/situacion-06-cantidad', 1200, 1200),
    illustrationAfterAnswer: true,
    description: 'Cuenta los materiales entregados y los que faltan.',
    context: 'Preparas materiales para las personas de un taller.',
    objectives: ['Elegir el número que representa el total.', 'Indicar una unidad pendiente.'], rewardXp: SITUATION_XP,
    scenes: [
      { id: 'total', title: 'Hojas para el taller', dialogue: 'camera',
        context: 'Se ocupan cuatro sillas. Justo antes de repartir los materiales llega otra persona y se sienta al fondo.',
        question: 'Daremos una hoja por persona. ¿Cuántas saco?', optionIds: ['LSP-001', 'LSP-004', 'LSP-005'],
        expectedSignId: 'LSP-005', explanation: 'Cuenta a las cuatro personas que ya estaban y a quien acaba de llegar. Necesitas cinco hojas.',
        reply: 'Te paso las cinco hojas. Yo reparto los lápices mientras tú entregas el papel.' },
      { id: 'faltante', title: 'La última hoja',
        context: 'Ves hojas en las primeras cuatro mesas. La persona del fondo todavía tiene la mesa vacía.',
        question: 'Voy hacia el fondo. ¿Cuántas hojas quedan por repartir?', optionIds: ['LSP-005', 'LSP-001', 'cero'],
        expectedSignId: 'LSP-001', explanation: 'Cuatro personas ya recibieron su hoja. Falta la de quien se sentó al fondo.',
        reply: 'Le llevo la que falta. Ya podemos comenzar.' },
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
