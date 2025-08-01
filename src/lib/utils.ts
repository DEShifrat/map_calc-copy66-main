import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Polygon from 'ol/geom/Polygon';
import { Coordinate } from 'ol/coordinate';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to check if a point is inside any of the given barriers
export const isPointInsideAnyBarrier = (point: Coordinate, barriers: Coordinate[][][][]): boolean => {
  return barriers.some(barrierCoords => {
    const polygon = new Polygon(barrierCoords);
    return polygon.intersectsCoordinate(point);
  });
};