import { ArrowLeft, Hash, LibraryBig, MessagesSquare, School, Store, UserRound, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSituationPath, getSituationsPath, type Situation, type SituationFilter } from '../data/situations';

const sceneryIcons = { institute: School, meeting: MessagesSquare, shop: Store, library: LibraryBig, food: Utensils, numbers: Hash };

export function SituationIllustration({ situation }: { situation: Situation }) {
  const Icon = sceneryIcons[situation.illustration];

  return (
    <div className="situation-illustration" data-setting={situation.illustration} aria-hidden="true">
      {situation.illustrationSrc ? <img src={situation.illustrationSrc} alt="" /> : <>
        <span className="situation-art-cloud" />
        <Icon className="situation-art-setting" strokeWidth={1.5} />
        <span className="situation-art-person situation-art-person-left"><UserRound strokeWidth={1.4} /></span>
        <span className="situation-art-person situation-art-person-right"><UserRound strokeWidth={1.4} /></span>
      </>}
    </div>
  );
}

export function SituationBreadcrumbs({ situation, current, filter }: { situation: Situation; current: string; filter: SituationFilter }) {
  return (
    <nav className="lesson-breadcrumb situation-breadcrumb" aria-label="Ruta del simulador">
      <Link to={getSituationsPath(filter)}><ArrowLeft size={16} aria-hidden="true" /> Situaciones</Link>
      <span aria-hidden="true">/</span>
      <Link to={getSituationPath(situation.id, filter)}>{situation.title}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function SituationDifficultyBadge({ difficulty }: { difficulty: Situation['difficulty'] }) {
  return (
    <span className={`situation-difficulty situation-difficulty-${difficulty}`}>
      <span className="situation-level-bars" aria-hidden="true"><i /><i /><i /></span>
      {difficulty === 'basico' ? 'Básico' : 'Intermedio'}
    </span>
  );
}
