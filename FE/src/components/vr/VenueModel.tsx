import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

interface VenueModelProps {
  path: string;
}

export function VenueModel({ path }: VenueModelProps) {
  const { scene } = useGLTF(path);
  const model = useMemo(() => scene.clone(), [scene]);
  return <primitive object={model} />;
}

export function preloadVenueModel(path: string) {
  useGLTF.preload(path);
}
