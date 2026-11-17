import { CheckCircle2, Database, Tags, UsersRound } from 'lucide-react';
import { datasetStatistics } from '../../features/sign-recognition/dataset/datasetStore';
import type { DatasetSnapshot } from '../../features/sign-recognition/dataset/datasetTypes';

export function DatasetStatistics({ snapshot }: { snapshot: DatasetSnapshot }) {
  const stats = datasetStatistics(snapshot);
  const cards = [{ label: 'Participantes', value: stats.participants, icon: UsersRound }, { label: 'Señas configuradas', value: `${stats.configuredSigns} / 10`, icon: Tags },
    { label: 'Muestras guardadas', value: stats.samples, icon: Database }, { label: 'Pendientes de revisión', value: stats.pending, icon: CheckCircle2 }];
  return <section className="dataset-statistics" aria-label="Resumen del dataset">{cards.map(({ label, value, icon: Icon }) => <article key={label}><span><Icon size={23} aria-hidden="true" /></span><div><strong>{value}</strong><p>{label}</p></div></article>)}</section>;
}
