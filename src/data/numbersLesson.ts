import type { LessonPlan, Question, StudyStep } from './lessonPlan.ts';
import { getEducationalSign, numbersReference as reference } from './library.ts';

const signs = ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005'].map(id => {
  const entry = getEducationalSign(id);
  if (!entry?.instructions) throw new Error(`Falta la descripción educativa de ${id}.`);
  return { id, name: entry.word, explanation: entry.instructions };
});

const options = signs.map(({ id, name }) => ({ id, label: name }));
const configurations = [
  { id: 'LSP-003', label: 'Pulgar, índice y medio' },
  { id: 'LSP-001', label: 'Solo índice' },
  { id: 'LSP-005', label: 'Los cinco dedos' },
  { id: 'LSP-002', label: 'Índice y medio' },
  { id: 'LSP-004', label: 'Índice, medio, anular y meñique' },
];
function question(id: string, prompt: string, correctId: string): Question {
  return { id, activity: { type: 'choice', question: prompt, correctId, options, success: 'Respuesta correcta.' } };
}

export const numbersLesson: LessonPlan = {
  objectives: [
    'Distinguir las configuraciones de Uno a Cinco en la lámina del MINEDU.',
    'Relacionar cada seña con una cantidad en situaciones cotidianas.',
    'Repasar las cinco configuraciones con práctica dirigida o con ejercicios sin cámara.',
  ],
  steps: [
    { id: 'inicio', kind: 'intro', title: 'Objetivos de la lección', text: 'Aprende a expresar cantidades del uno al cinco en Lengua de Señas Peruana.' },
    { id: 'observar', kind: 'study', title: 'Observa las cinco señas', signs, reference,
      text: 'Mira la primera fila de la figura 2. Para estos cinco números, observa qué dedos se extienden hacia arriba en una sola mano. Compara dónde queda el pulgar en Dos y Tres.' },
    { id: 'comprension', kind: 'question', title: 'Elige una cantidad',
      questions: [question('botellas', 'Llevas una botella para ti y otra para tu compañero. ¿Qué cantidad expresas?', 'LSP-002')] },
    { id: 'asociacion', kind: 'question', title: 'Relaciona las configuraciones',
      questions: [{ id: 'configuraciones', activity: { type: 'association', question: 'Asocia cada configuración con su número.',
        options, pairs: [
          { id: 'pulgar', label: 'Pulgar, índice y medio extendidos', answerId: 'LSP-003' },
          { id: 'mano-abierta', label: 'Los cinco dedos extendidos', answerId: 'LSP-005' },
          { id: 'indice', label: 'Solo el índice extendido', answerId: 'LSP-001' },
        ], success: 'Relacionaste las tres configuraciones.' } }] },
    ...signs.map<StudyStep>(({ id, name, explanation }, index) => ({
      id: `practica-${index + 1}`, kind: 'practice', title: `Practica «${name}»`, targetId: id, reference,
      instruction: explanation,
      alternative: [{ id: 'reconocer-configuracion', activity: {
        type: 'choice', question: `Según la lámina, ¿qué dedos se extienden para hacer «${name}»?`,
        options: configurations, correctId: id, success: 'Identificaste la configuración de la lámina.',
      } }],
    })),
    { id: 'evaluacion', kind: 'assessment', title: 'Evaluación final', questions: [
      question('a', 'Si necesitas expresar una sola ficha, ¿qué número usarías?', 'LSP-001'),
      question('b', '¿Qué número se muestra con el índice y el medio extendidos?', 'LSP-002'),
      question('c', 'Al extender pulgar, índice y medio, ¿qué número muestra la lámina?', 'LSP-003'),
      question('d', '¿Qué número tiene cuatro dedos extendidos y el pulgar recogido?', 'LSP-004'),
      question('e', 'Para indicar una cantidad de cinco cuadernos, ¿qué número usarías?', 'LSP-005'),
    ] },
  ],
};
