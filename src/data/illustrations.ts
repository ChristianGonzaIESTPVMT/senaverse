export type IllustrationAsset = { src: string; width: number; height: number };

export function localIllustration(file: string, width: number, height: number): IllustrationAsset {
  return { src: `images/illustrations/${file}.webp`, width, height };
}

export const headerIllustrations = {
  presentation: localIllustration('cabeceras/cabecera-presentacion', 1280, 720),
  learningRoute: localIllustration('cabeceras/cabecera-ruta-aprendizaje', 600, 600),
  practice: localIllustration('cabeceras/cabecera-centro-practica', 640, 480),
};
