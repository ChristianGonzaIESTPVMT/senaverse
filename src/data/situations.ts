export type SituationDifficulty = 'basico' | 'intermedio';
export type SituationFilter = 'todos' | SituationDifficulty;

export type SituationScene = {
  id: string;
  title: string;
  context: string;
  question: string;
  optionIds: [string, string, string];
  expectedSignId: string;
  explanation: string;
};

export type Situation = {
  id: string;
  title: string;
  difficulty: SituationDifficulty;
  description: string;
  illustration: 'institute' | 'meeting' | 'shop' | 'library';
  illustrationSrc?: string;
  scenes: SituationScene[];
};

// Escenarios de demostración. La verificación de las señas está pendiente.
// Para sustituir una ilustración, agrega su ruta local en illustrationSrc.
export const situations: Situation[] = [
  {
    id: 'instituto',
    title: 'Un día en el instituto',
    difficulty: 'basico',
    description: 'Saluda, despídete, agradece y pide ayuda en el instituto.',
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
        optionIds: ['no', 'adios', 'si'],
        expectedSignId: 'si',
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
    id: 'tienda',
    title: 'Comprando en una tienda',
    difficulty: 'intermedio',
    description: 'Pregunta por productos, cantidades y finaliza una compra.',
    illustration: 'shop',
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
        optionIds: ['uno', 'dos', 'tres'],
        expectedSignId: 'dos',
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
  },
  {
    id: 'necesito-ayuda',
    title: 'Necesito ayuda',
    difficulty: 'intermedio',
    description: 'Utiliza expresiones para solicitar orientación y resolver dudas.',
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
        optionIds: ['si', 'no', 'adios'],
        expectedSignId: 'si',
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
