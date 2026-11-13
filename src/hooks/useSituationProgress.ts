import { useEffect, useState } from 'react';
import { situations } from '../data/situations';

type SceneAnswer = { choiceId: string; checked: boolean };
type SituationSession = { currentSceneId: string; answers: Record<string, SceneAnswer> };
type SituationSessions = Record<string, SituationSession>;

const STORAGE_KEY = 'senaverse-situation-answers-v1';

function readSessions(): SituationSessions {
  const sessions: SituationSessions = {};
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return sessions;

    for (const situation of situations) {
      const saved: unknown = (stored as Record<string, unknown>)[situation.id];
      if (!saved || typeof saved !== 'object') continue;
      const { currentSceneId, answers: savedAnswers } = saved as Record<string, unknown>;
      if (!savedAnswers || typeof savedAnswers !== 'object') continue;

      const answers: Record<string, SceneAnswer> = {};
      for (const scene of situation.scenes) {
        const answer: unknown = (savedAnswers as Record<string, unknown>)[scene.id];
        if (!answer || typeof answer !== 'object') continue;
        const { choiceId, checked } = answer as Record<string, unknown>;
        if (typeof choiceId === 'string' && scene.optionIds.includes(choiceId)) {
          answers[scene.id] = { choiceId, checked: checked === true };
        }
      }

      if (Object.keys(answers).length > 0) {
        const current = situation.scenes.find(scene => scene.id === currentSceneId) ?? situation.scenes[0];
        sessions[situation.id] = { currentSceneId: current.id, answers };
      }
    }
  } catch { /* Las respuestas se conservan en memoria cuando el almacenamiento no está disponible. */ }
  return sessions;
}

export function useSituationProgress() {
  const [sessions, setSessions] = useState(readSessions);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { /* Continuar durante esta sesión. */ }
  }, [sessions]);

  function saveAnswer(situationId: string, sceneId: string, choiceId: string, checked: boolean) {
    const situation = situations.find(item => item.id === situationId);
    const scene = situation?.scenes.find(item => item.id === sceneId);
    if (!scene?.optionIds.includes(choiceId)) return;

    setSessions(previous => ({
      ...previous,
      [situationId]: {
        currentSceneId: sceneId,
        answers: { ...previous[situationId]?.answers, [sceneId]: { choiceId, checked } },
      },
    }));
  }

  function resetSituation(situationId: string) {
    setSessions(previous => {
      const next = { ...previous };
      delete next[situationId];
      return next;
    });
  }

  return { sessions, saveAnswer, resetSituation };
}

export type SituationProgress = ReturnType<typeof useSituationProgress>;
