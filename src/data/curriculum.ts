export type Lesson = { id: string; title: string; duration: string; description: string; sample?: boolean };
export type Unit = { id: number; title: string; subtitle: string; lessons: Lesson[] };

/** Contenido DEMOSTRATIVO: validar materiales y señas con especialistas en LSP antes de publicar. */
export const units: Unit[] = [
  {
    id: 1,
    title: 'Fundamentos de la LSP',
    subtitle: 'Comienza por comprender la lengua y sus primeras expresiones.',
    lessons: [
      { id: 'introduccion', title: 'Introducción a la LSP', duration: '8 min', description: 'Conoce la Lengua de Señas Peruana y su contexto.' },
      { id: 'abecedario', title: 'Abecedario manual', duration: '12 min', description: 'Identifica la función del alfabeto manual.' },
      { id: 'saludos', title: 'Saludos y despedidas', duration: '10 min', description: 'Identifica expresiones cotidianas para iniciar y terminar un encuentro.', sample: true },
    ],
  },
  {
    id: 2,
    title: 'Comunicación cotidiana',
    subtitle: 'Continúa con vocabulario de uso frecuente.',
    lessons: [
      { id: 'presentaciones', title: 'Presentación personal', duration: '10 min', description: 'Expresiones iniciales para presentarte.' },
      { id: 'familia', title: 'Familia y personas', duration: '11 min', description: 'Vocabulario para hablar de personas cercanas.' },
      { id: 'expresiones', title: 'Expresiones cotidianas', duration: '10 min', description: 'Amplía tus recursos comunicativos.' },
    ],
  },
];

export const initialCompletedLessonIds = ['introduccion', 'abecedario'];
export const totalLessons = units.reduce((sum, unit) => sum + unit.lessons.length, 0);
