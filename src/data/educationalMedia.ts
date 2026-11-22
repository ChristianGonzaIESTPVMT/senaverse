export type Finger = 'thumb' | 'index' | 'middle' | 'ring' | 'little';
export type HandDiagram = { extended: readonly Finger[]; description: string };
export type MediaValidation = 'pending' | 'validated';
export type MediaLink = { title: string; url: string };

export type MediaSource = {
  title: string;
  publisher: string;
  url: string;
  page?: number;
};

export type Usage = { label: string; url?: string };

type Location = { type: 'local'; url: `/${string}` } | { type: 'external'; url: `https://${string}` };
type ImageFile = { location: Location; width: number; height: number; alt: string };
type Identified = { id: string; signId: string; validation: MediaValidation };
type Available = Identified & {
  availability: 'available';
  source: MediaSource;
  usage: Usage;
  alt: string;
};

export type IllustratedReference = Available & {
  kind: 'document';
  location: { type: 'external'; url: string };
  link: MediaLink;
  locator: string;
};
export type DiagramResource = Available & {
  kind: 'diagram';
  location: { type: 'embedded'; module: 'SignHandDiagram' };
  diagram: HandDiagram;
  quizSafe: true;
};
export type IndividualImage = Available & ImageFile & { kind: 'image'; quizSafe?: boolean };
export type IllustratedSequence = Available & { kind: 'sequence'; frames: readonly [ImageFile, ImageFile, ...ImageFile[]] };
export type EducationalVideo = Available & {
  kind: 'video';
  location: Location;
  captionsUrl?: `/${string}`;
};
export type PublishableMedia = IndividualImage | IllustratedSequence | EducationalVideo;
export type EducationalVisual = DiagramResource | IndividualImage | IllustratedSequence;
type PendingMedia = Identified & { kind: 'video' | 'visual'; availability: 'pending' };

export type SignMedia = {
  document?: IllustratedReference;
  visual: EducationalVisual | (PendingMedia & { kind: 'visual' });
  video: EducationalVideo | (PendingMedia & { kind: 'video' });
};

export function getQuizVisual(media: SignMedia) {
  const { visual } = media;
  return visual.availability === 'available' && visual.kind !== 'sequence' && visual.quizSafe ? visual : undefined;
}

export function hasEducationalMedia({ document, visual, video }: SignMedia) {
  return !!document || visual.availability === 'available' || video.availability === 'available';
}
