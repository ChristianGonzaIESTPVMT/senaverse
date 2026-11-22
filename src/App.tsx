import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { StudentLayout } from './components/StudentLayout';
import { getLessonPath } from './data/curriculum';
import { summarizeProgress } from './data/progress';
import { StudentProgressProvider } from './components/StudentProgressProvider';
import { StudentProfileProvider } from './components/StudentProfileProvider';
import { useStudentProgress } from './hooks/progressContext';
import { ProgressPage } from './pages/ProgressPage';
import { AcademyPage } from './pages/AcademyPage';
import { ProfilePage } from './pages/ProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { LibraryPage } from './pages/LibraryPage';
import { MinigamesPage } from './pages/MinigamesPage';
import { SituationResultsPage } from './pages/SituationResultsPage';
import { SituationsPage } from './pages/SituationsPage';
import { useLearningActivity } from './hooks/useLearningActivity';
import './App.css';
import './components/StudentLayout.css';
import './pages/DashboardPage.css';
import './pages/LibraryPage.css';
import './pages/CameraPage.css';
import './pages/SituationsPage.css';

const CameraPage = lazy(() => import('./pages/CameraPage').then(module => ({ default: module.CameraPage })));
const FreePracticePage = lazy(() => import('./pages/FreePracticePage').then(module => ({ default: module.FreePracticePage })));
const SignChallengePage = lazy(() => import('./pages/SignChallengePage').then(module => ({ default: module.SignChallengePage })));
const MinigameRunPage = lazy(() => import('./pages/MinigameRunPage').then(module => ({ default: module.MinigameRunPage })));
const SituationScenePage = lazy(() => import('./pages/SituationScenePage').then(module => ({ default: module.SituationScenePage })));
const DatasetStudioPage = import.meta.env.DEV && import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_DATA_COLLECTION === 'true'
  ? lazy(() => import('./pages/DatasetStudioPage')) : null;
const RecognitionLabPage = import.meta.env.DEV && import.meta.env.MODE === 'development' && import.meta.env.VITE_ENABLE_RECOGNITION_LAB === 'true'
  ? lazy(() => import('./pages/RecognitionLabPage')) : null;

function StudentApp() {
  const learning = useLearningActivity();
  const { progress, recordActivity } = useStudentProgress();
  const { completed } = summarizeProgress(progress);
  const completeLesson = (lessonId: string) => recordActivity({ type: 'lesson', lessonId });

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {DatasetStudioPage && <Route path="/herramientas/dataset" element={<Suspense fallback={<p role="status">Abriendo Dataset Studio…</p>}><DatasetStudioPage /></Suspense>} />}
        {RecognitionLabPage && <Route path="/herramientas/reconocimiento" element={<Suspense fallback={<p role="status">Abriendo el laboratorio…</p>}><RecognitionLabPage /></Suspense>} />}
        <Route path="/" element={<StudentLayout><DashboardPage completed={completed} lastLessonId={learning.activity.lastLessonId}/></StudentLayout>} />
        <Route path="/panel" element={<Navigate to="/" replace />} />
        <Route path="/presentacion" element={<HomePage />} />
        <Route path="/academia" element={<StudentLayout><AcademyPage completed={completed} activity={learning.activity}/></StudentLayout>} />
        <Route path="/academia/unidad/:unitId" element={<StudentLayout><AcademyPage completed={completed} activity={learning.activity}/></StudentLayout>} />
        <Route path="/academia/unidad/:unitId/leccion/:lessonId" element={<StudentLayout><LessonPage completed={completed} activity={learning.activity} onVisit={learning.visitLesson} onComplete={completeLesson}/></StudentLayout>} />
        <Route path="/academia/*" element={<Navigate to="/academia" replace />} />
        <Route path="/leccion/saludos" element={<Navigate to={getLessonPath(1, 'saludos')} replace />} />
        <Route path="/biblioteca" element={<StudentLayout><LibraryPage /></StudentLayout>} />
        <Route path="/camara" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo Cámara…</p>}><CameraPage /></Suspense></StudentLayout>} />
        <Route path="/camara/libre" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo la práctica…</p>}><FreePracticePage /></Suspense></StudentLayout>} />
        <Route path="/camara/desafio" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo el desafío…</p>}><SignChallengePage /></Suspense></StudentLayout>} />
        <Route path="/camara/*" element={<Navigate to="/camara" replace />} />
        <Route path="/minijuegos" element={<StudentLayout><MinigamesPage /></StudentLayout>} />
        <Route path="/minijuegos/:gameId" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo la partida…</p>}><MinigameRunPage /></Suspense></StudentLayout>} />
        <Route path="/minijuegos/*" element={<Navigate to="/minijuegos" replace />} />
        <Route path="/simulador" element={<StudentLayout><SituationsPage /></StudentLayout>} />
        <Route path="/simulador/:situationId" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo la situación…</p>}><SituationScenePage /></Suspense></StudentLayout>} />
        <Route path="/simulador/:situationId/escena/:sceneId" element={<StudentLayout><Suspense fallback={<p role="status">Abriendo la situación…</p>}><SituationScenePage /></Suspense></StudentLayout>} />
        <Route path="/simulador/:situationId/resultados" element={<StudentLayout><SituationResultsPage /></StudentLayout>} />
        <Route path="/simulador/*" element={<Navigate to="/simulador" replace />} />
        <Route path="/progreso" element={<StudentLayout><ProgressPage /></StudentLayout>} />
        <Route path="/perfil" element={<StudentLayout><ProfilePage /></StudentLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return <StudentProgressProvider><StudentProfileProvider><StudentApp /></StudentProfileProvider></StudentProgressProvider>;
}

export default App;
