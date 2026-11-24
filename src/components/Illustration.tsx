import type { IllustrationAsset } from '../data/illustrations';

export function Illustration({ asset, alt = '', priority = false }: {
  asset: IllustrationAsset;
  alt?: string;
  priority?: boolean;
}) {
  return <img
    src={import.meta.env.BASE_URL + asset.src}
    width={asset.width}
    height={asset.height}
    alt={alt}
    loading={priority ? 'eager' : 'lazy'}
    fetchPriority={priority ? 'high' : undefined}
    decoding="async"
  />;
}
