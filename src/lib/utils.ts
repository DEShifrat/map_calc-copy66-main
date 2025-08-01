import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Polygon from 'ol/geom/Polygon';
import LineString from 'ol/geom/LineString';
import { Coordinate } from 'ol/coordinate';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to check if a point is inside any of the given barriers
export const isPointInsideAnyBarrier = (point: Coordinate, barriers: Coordinate[][][]): boolean => {
  return barriers.some(barrierCoords => {
    const polygon = new Polygon(barrierCoords); // barrierCoords теперь Coordinate[][]
    return polygon.intersectsCoordinate(point);
  });
};

// Helper function to find the closest segment of a LineString to a given point
export const findClosestSegment = (lineString: LineString, point: Coordinate, tolerance: number = 0.5): { segmentIndex: number; distance: number; } | null => {
  const coords = lineString.getCoordinates();
  if (coords.length < 2) return null;

  let minDistance = Infinity;
  let closestSegmentIndex = -1;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];

    // Calculate distance from point to segment (p1, p2)
    // This is a standard geometric calculation for point-to-segment distance
    const l2 = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
    if (l2 === 0) continue; // p1 and p2 are the same point

    const t = ((point[0] - p1[0]) * (p2[0] - p1[0]) + (point[1] - p1[1]) * (p2[1] - p1[1])) / l2;
    const projection = [
      p1[0] + t * (p2[0] - p1[0]),
      p1[1] + t * (p2[1] - p1[1])
    ];

    let dist;
    if (t < 0) {
      dist = Math.sqrt(Math.pow(point[0] - p1[0], 2) + Math.pow(point[1] - p1[1], 2));
    } else if (t > 1) {
      dist = Math.sqrt(Math.pow(point[0] - p2[0], 2) + Math.pow(point[1] - p2[1], 2));
    } else {
      dist = Math.sqrt(Math.pow(point[0] - projection[0], 2) + Math.pow(point[1] - projection[1], 2));
    }

    if (dist < minDistance) {
      minDistance = dist;
      closestSegmentIndex = i;
    }
  }

  if (closestSegmentIndex !== -1 && minDistance <= tolerance) { // Only consider if within tolerance
    return { segmentIndex: closestSegmentIndex, distance: minDistance };
  }
  return null;
};