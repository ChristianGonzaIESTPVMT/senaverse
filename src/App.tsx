import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StudentLayout } from './components/StudentLayout';
import { initialCompletedLessonIds } from './data/curriculum';
import { AcademyPage } from './pages/AcademyPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import './App.css';

const PROGRESS_KEY = 'senaverse-demo-completed-v1';

function App() {
  const [completed, setCompleted] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(id => typeof id === 'string')) return [...new Set([...initialCompletedLessonIds, ...parsed])];
      }
    } catch { /* Usar valores demostrativos cuando no hay almacenamiento */ }
    return initialCompletedLessonIds;
  });

  useEffect(() => { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed)); } catch { /* Modo sin persistencia */ } }, [completed]);
  const completeLesson = (id: string) => setCompleted(prev => prev.includes(id) ? prev : [...prev,id]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/panel" element={<StudentLayout><DashboardPage completed={completed}/></StudentLayout>} />
        <Route path="/academia" element={<StudentLayout><AcademyPage completed={completed}/></StudentLayout>} />
        <Route path="/leccion/saludos" element={<StudentLayout><LessonPage completed={completed} onComplete={completeLesson}/></StudentLayout>} />
        <Route path="/biblioteca" element={<StudentLayout><ComingSoonPage title="Biblioteca de señas"/></StudentLayout>} />
        <Route path="/minijuegos" element={<StudentLayout><ComingSoonPage title="Minijuegos educativos"/></StudentLayout>} />
        <Route path="/simulador" element={<StudentLayout><ComingSoonPage title="Simulador de situaciones"/></StudentLayout>} />
        <Route path="/progreso" element={<StudentLayout><ComingSoonPage title="Mi progreso"/></StudentLayout>} />
        <Route path="/perfil" element={<StudentLayout><ComingSoonPage title="Mi perfil"/></StudentLayout>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
