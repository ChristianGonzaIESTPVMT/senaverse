import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StudentLayout } from './components/StudentLayout';
import { getLessonPath } from './data/curriculum';
import { summarizeProgress } from './data/progress';
import { StudentProgressProvider } from './components/StudentProgressProvider';
import { useStudentProgress } from './hooks/progressContext';
import { ProgressPage } from './pages/ProgressPage';
import { AcademyPage } from './pages/AcademyPage';
import { CameraPage } from './pages/CameraPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DashboardPage } from './pages/DashboardPage';
import { FreePracticePage } from './pages/FreePracticePage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { LibraryPage } from './pages/LibraryPage';
import { MinigamesPage } from './pages/MinigamesPage';
import { SignChallengePage } from './pages/SignChallengePage';
import { SituationResultsPage } from './pages/SituationResultsPage';
import { SituationScenePage } from './pages/SituationScenePage';
import { SituationsPage } from './pages/SituationsPage';
import { useSituationProgress } from './hooks/useSituationProgress';
import { useLearningActivity } from './hooks/useLearningActivity';
import './App.css';
import './components/StudentLayout.css';
import './pages/DashboardPage.css';
import './pages/LibraryPage.css';
import './pages/CameraPage.css';
import './pages/SituationsPage.css';

function StudentApp() {
  const situationProgress = useSituationProgress();
  const learning = useLearningActivity();
  const { progress, recordActivity } = useStudentProgress();
  const { completed } = summarizeProgress(progress);
  const completeLesson = (lessonId: string) => recordActivity({ type: 'lesson', lessonId });

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StudentLayout><DashboardPage completed={completed} lastLessonId={learning.activity.lastLessonId}/></StudentLayout>} />
        <Route path="/panel" element={<Navigate to="/" replace />} />
        <Route path="/presentacion" element={<HomePage />} />
        <Route path="/academia" element={<StudentLayout><AcademyPage completed={completed} activity={learning.activity}/></StudentLayout>} />
        <Route path="/academia/unidad/:unitId" element={<StudentLayout><AcademyPage completed={completed} activity={learning.activity}/></StudentLayout>} />
        <Route path="/academia/unidad/:unitId/leccion/:lessonId" element={<StudentLayout><LessonPage completed={completed} activity={learning.activity} onVisit={learning.visitLesson} onComplete={completeLesson}/></StudentLayout>} />
        <Route path="/academia/*" element={<Navigate to="/academia" replace />} />
        <Route path="/leccion/saludos" element={<Navigate to={getLessonPath(1, 'saludos')} replace />} />
        <Route path="/biblioteca" element={<StudentLayout><LibraryPage /></StudentLayout>} />
        <Route path="/camara" element={<StudentLayout><CameraPage /></StudentLayout>} />
        <Route path="/camara/libre" element={<StudentLayout><FreePracticePage /></StudentLayout>} />
        <Route path="/camara/desafio" element={<StudentLayout><SignChallengePage /></StudentLayout>} />
        <Route path="/camara/*" element={<Navigate to="/camara" replace />} />
        <Route path="/minijuegos" element={<StudentLayout><MinigamesPage /></StudentLayout>} />
        <Route path="/simulador" element={<StudentLayout><SituationsPage progress={situationProgress} /></StudentLayout>} />
        <Route path="/simulador/:situationId" element={<StudentLayout><SituationScenePage progress={situationProgress} /></StudentLayout>} />
        <Route path="/simulador/:situationId/escena/:sceneId" element={<StudentLayout><SituationScenePage progress={situationProgress} /></StudentLayout>} />
        <Route path="/simulador/:situationId/resultados" element={<StudentLayout><SituationResultsPage progress={situationProgress} /></StudentLayout>} />
        <Route path="/simulador/*" element={<Navigate to="/simulador" replace />} />
        <Route path="/progreso" element={<StudentLayout><ProgressPage /></StudentLayout>} />
        <Route path="/perfil" element={<StudentLayout><ComingSoonPage title="Mi perfil"/></StudentLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return <StudentProgressProvider><StudentApp /></StudentProgressProvider>;
}

export default App;
