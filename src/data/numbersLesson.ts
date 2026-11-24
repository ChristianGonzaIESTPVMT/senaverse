import type { LessonPlan, Question, StudyStep } from './lessonPlan.ts';
import { getEducationalSign, numbersReference as reference } from './library.ts';
import { signQuizMedia } from './signQuizMedia.ts';
import type { QuizMedia } from './educationalMedia.ts';

const signs = ['LSP-001', 'LSP-002', 'LSP-003', 'LSP-004', 'LSP-005'].map(id => {
  const entry = getEducationalSign(id);
  if (!entry?.instructions) throw new Error(`Falta la descripción educativa de ${id}.`);
  return { id, name: entry.word, explanation: entry.instructions };
});

const options = signs.map(({ id, name }) => ({ id, label: name }));
const [one, two, three, four, five] = signs.map(sign => sign.id);

function media(id: string, kind: QuizMedia['kind']) {
  const sign = getEducationalSign(id);
  const resource = sign && signQuizMedia(sign, kind);
  if (!resource) throw new Error(`Falta el recurso ${kind} para el ejercicio de ${id}.`);
  return resource;
}

function question(id: string, prompt: string, correctId: string, kind: QuizMedia['kind'], distractorIds: string[],
  explanation: string, showQuantities = false): Question {
  const candidates = [...options].sort((first, second) =>
    Number(second.id === correctId || distractorIds.includes(second.id)) - Number(first.id === correctId || distractorIds.includes(first.id)));
  return { id, activity: {
    type: 'choice', question: prompt, correctId, media: media(correctId, kind),
    options: candidates.map(option => {
      const quantity = options.indexOf(option) + 1;
      return { ...option, label: showQuantities ? `${quantity} · ${'● '.repeat(quantity).trim()}` : option.label,
        feedback: `${option.label}. ${media(option.id, 'photo').description}` };
    }),
    success: 'Interpretaste la seña.', explanation, reviewSignIds: [correctId, ...distractorIds],
  } };
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
    { id: 'comprension', kind: 'question', title: 'De la seña a la cantidad',
      questions: [question('botellas', 'Observa el video. ¿Cuántas botellas prepararías para este pedido?', two, 'video', [one, three],
        'La seña es Dos. Se extienden el índice y el medio. En Uno solo se extiende el índice y en Tres se añade el pulgar.', true)] },
    { id: 'asociacion', kind: 'question', title: 'Relaciona las configuraciones',
      questions: [{ id: 'configuraciones', activity: { type: 'association', question: 'Asocia cada configuración con su número.',
        options, pairs: [
          { id: 'pulgar', label: 'Fotografía A', answerId: three, media: media(three, 'photo') },
          { id: 'mano-abierta', label: 'Fotografía B', answerId: five, media: media(five, 'photo') },
          { id: 'indice', label: 'Fotografía C', answerId: one, media: media(one, 'photo') },
        ], success: 'Relacionaste las tres configuraciones.',
        explanation: 'A muestra Tres: pulgar, índice y medio. B muestra Cinco: la palma abierta y el pulgar extendido. C muestra Uno: solo el índice extendido.',
        reviewSignIds: [three, five, one] } }] },
    ...signs.map<StudyStep>(({ id, name, explanation }, index) => ({
      id: `practica-${index + 1}`, kind: 'practice', title: `Practica «${name}»`, targetId: id, reference,
      instruction: explanation,
      alternative: [{ id: 'reconocer-configuracion', activity: {
        type: 'choice', question: `¿Qué imagen corresponde a «${name}»?`,
        options: [three, one, five, two, four]
          .map((candidate, position) => {
            const visual = media(candidate, 'photo');
            return { id: candidate, label: `Fotografía ${String.fromCharCode(65 + position)}`, media: visual,
              feedback: `${getEducationalSign(candidate)?.word}. ${visual.description}` };
          }),
        correctId: id, success: 'Identificaste la configuración de la seña.', explanation, reviewSignIds: [id],
      } }],
    })),
    { id: 'evaluacion', kind: 'assessment', title: 'Evaluación final', questions: [
      question('a', 'Observa la fotografía. ¿Qué cantidad comunica la seña?', one, 'photo', [two, three],
        'Es Uno. Solo se extiende el índice. Dos añade el medio y Tres añade también el pulgar.'),
      question('b', 'Observa el video y fíjate en el pulgar. ¿Qué seña ves?', two, 'video', [three],
        'Es Dos. El pulgar se mantiene recogido. En Tres se extiende junto al índice y el medio.'),
      question('c', 'Identifica la seña de la fotografía.', three, 'photo', [two, four],
        'Es Tres. El pulgar está extendido junto con el índice y el medio. En Dos y Cuatro el pulgar está recogido.'),
      question('d', 'Compara la posición del pulgar en este diagrama. ¿Qué seña representa?', four, 'diagram', [five],
        'Es Cuatro. El pulgar está recogido. En Cinco también se extiende, con la palma abierta.'),
      question('e', 'Mira la seña en el video. ¿Qué conjunto de cuadernos prepara la cantidad que indica?', five, 'video', [three, four],
        'Es Cinco. La palma está abierta y se extiende también el pulgar. En Cuatro se recoge y en Tres quedan recogidos el anular y el meñique.', true),
    ] },
  ],
};
