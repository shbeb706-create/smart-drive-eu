import { useState, useRef, useCallback, useEffect } from 'react';

export interface SimPosition {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  altitude: number;
  accuracy: number;
  timestamp: number;
}

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface TurnInstruction {
  id: string;
  instruction: string;
  detail: string;
  distance: number;
  icon: string;
  triggered: boolean;
}

const TURN_TYPES = [
  { icon: 'straight', instruction: 'Continue straight', detail: 'Follow the road' },
  { icon: 'slight-right', instruction: 'Slight right', detail: 'Keep right' },
  { icon: 'right', instruction: 'Turn right', detail: 'Turn right onto' },
  { icon: 'sharp-right', instruction: 'Sharp right', detail: 'Turn sharply right' },
  { icon: 'slight-left', instruction: 'Slight left', detail: 'Keep left' },
  { icon: 'left', instruction: 'Turn left', detail: 'Turn left onto' },
  { icon: 'sharp-left', instruction: 'Sharp left', detail: 'Turn sharply left' },
  { icon: 'roundabout', instruction: 'Roundabout', detail: 'Take the exit' },
  { icon: 'merge', instruction: 'Merge', detail: 'Merge onto' },
  { icon: 'exit', instruction: 'Take exit', detail: 'Exit onto' },
];

const ROAD_NAMES = ['A9', 'A8', 'A3', 'A99', 'A92', 'B2', 'B13', 'Leopoldstrasse', 'Ludwigstrasse', 'Rosenheimer Str'];

function bearingBetween(from: RoutePoint, to: RoutePoint): number {
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function distanceBetween(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sin1 = Math.sin(dLat / 2) ** 2;
  const sin2 = Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(sin1 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sin2), Math.sqrt(1 - sin1 - Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sin2));
  return R * c;
}

function interpolateRoute(route: RoutePoint[], stepsPerSegment: number): RoutePoint[] {
  const result: RoutePoint[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      result.push({ lat: route[i].lat + (route[i + 1].lat - route[i].lat) * t, lng: route[i].lng + (route[i + 1].lng - route[i].lng) * t });
    }
  }
  result.push(route[route.length - 1]);
  return result;
}

function generateTurnInstructions(route: RoutePoint[]): TurnInstruction[] {
  if (route.length < 3) return [];
  const instructions: TurnInstruction[] = [];
  const interpolated = interpolateRoute(route, 5);

  for (let i = 1; i < interpolated.length - 1; i++) {
    const prevBearing = bearingBetween(interpolated[i - 1], interpolated[i]);
    const nextBearing = bearingBetween(interpolated[i], interpolated[i + 1]);
    let turnAngle = nextBearing - prevBearing;
    if (turnAngle > 180) turnAngle -= 360;
    if (turnAngle < -180) turnAngle += 360;
    const absAngle = Math.abs(turnAngle);
    if (absAngle < 5) continue;

    let turnType;
    if (absAngle < 15) turnType = TURN_TYPES[0];
    else if (turnAngle > 0 && absAngle < 30) turnType = TURN_TYPES[1];
    else if (turnAngle > 0 && absAngle < 90) turnType = TURN_TYPES[2];
    else if (turnAngle >= 90) turnType = TURN_TYPES[3];
    else if (turnAngle < 0 && absAngle < 30) turnType = TURN_TYPES[4];
    else if (turnAngle < 0 && absAngle < 90) turnType = TURN_TYPES[5];
    else turnType = TURN_TYPES[6];

    const roadName = ROAD_NAMES[Math.floor(Math.random() * ROAD_NAMES.length)];
    const distToNext = distanceBetween(interpolated[i], interpolated[i + 1]) * 1000;

    instructions.push({
      id: `turn-${i}`,
      instruction: turnType.instruction,
      detail: `${turnType.detail} ${roadName}`,
      distance: Math.round(distToNext),
      icon: turnType.icon,
      triggered: false,
    });
  }

  return instructions.slice(0, 12);
}

export function useDrivingSimulation() {
  const [position, setPosition] = useState<SimPosition | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState<TurnInstruction | null>(null);
  const [upcomingInstructions, setUpcomingInstructions] = useState<TurnInstruction[]>([]);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [speedProfile, setSpeedProfile] = useState<'city' | 'highway' | 'autobahn'>('highway');

  const routeRef = useRef<RoutePoint[]>([]);
  const smoothRouteRef = useRef<RoutePoint[]>([]);
  const stepIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const instructionsRef = useRef<TurnInstruction[]>([]);
  const headingRef = useRef(0);
  const speedRef = useRef(100);
  const targetSpeedRef = useRef(100);

  const startSimulation = useCallback((route: RoutePoint[]) => {
    routeRef.current = route;
    smoothRouteRef.current = interpolateRoute(route, 20);
    stepIndexRef.current = 0;
    instructionsRef.current = generateTurnInstructions(route);

    const firstPoint = smoothRouteRef.current[0];
    const secondPoint = smoothRouteRef.current[1] ?? firstPoint;
    const initialHeading = bearingBetween(firstPoint, secondPoint);

    headingRef.current = initialHeading;
    speedRef.current = 100;
    targetSpeedRef.current = 100;

    setPosition({ lat: firstPoint.lat, lng: firstPoint.lng, heading: initialHeading, speed: 100, altitude: 520, accuracy: 3, timestamp: Date.now() });
    setRouteProgress(0);
    setUpcomingInstructions(instructionsRef.current);
    setCurrentInstruction(null);

    let totalDist = 0;
    for (let i = 0; i < smoothRouteRef.current.length - 1; i++) {
      totalDist += distanceBetween(smoothRouteRef.current[i], smoothRouteRef.current[i + 1]);
    }
    setDistanceRemaining(Math.round(totalDist * 1000));
    setIsSimulating(true);
  }, []);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setIsSimulating(false);
  }, []);

  useEffect(() => {
    if (!isSimulating) return;
    const tickRate = 80;

    intervalRef.current = setInterval(() => {
      const smooth = smoothRouteRef.current;
      if (stepIndexRef.current >= smooth.length - 1) { stopSimulation(); return; }

      const idx = stepIndexRef.current;
      const current = smooth[idx];
      const next = smooth[Math.min(idx + 1, smooth.length - 1)];

      const targetHeading = bearingBetween(current, next);
      let headingDelta = targetHeading - headingRef.current;
      if (headingDelta > 180) headingDelta -= 360;
      if (headingDelta < -180) headingDelta += 360;
      headingRef.current = (headingRef.current + headingDelta * 0.15 + 360) % 360;

      const distToNextTurn = instructionsRef.current.find((t) => !t.triggered)?.distance ?? 1000;
      if (distToNextTurn < 300) { targetSpeedRef.current = 60 + Math.random() * 20; }
      else if (distToNextTurn < 100) { targetSpeedRef.current = 30 + Math.random() * 15; }
      else {
        const baseSpeed = speedProfile === 'autobahn' ? 140 : speedProfile === 'highway' ? 110 : 60;
        targetSpeedRef.current = baseSpeed + (Math.random() - 0.5) * 20;
      }

      speedRef.current += (targetSpeedRef.current - speedRef.current) * 0.08;

      const moveSpeed = speedRef.current / 3600 / 1000;
      const moveDist = moveSpeed * tickRate;

      let accumulated = 0;
      let newIdx = idx;
      while (newIdx < smooth.length - 1 && accumulated < moveDist) {
        const segDist = distanceBetween(smooth[newIdx], smooth[newIdx + 1]);
        if (accumulated + segDist >= moveDist) break;
        accumulated += segDist;
        newIdx++;
      }

      stepIndexRef.current = newIdx;

      const t = moveDist > 0 && accumulated > 0 ? Math.min(1, (moveDist - accumulated + distanceBetween(smooth[Math.max(idx, newIdx - 1)], smooth[newIdx])) / (distanceBetween(smooth[newIdx], smooth[newIdx + 1]) || 0.001)) : 0;
      const exactLat = smooth[newIdx].lat + (smooth[Math.min(newIdx + 1, smooth.length - 1)].lat - smooth[newIdx].lat) * Math.max(0, Math.min(1, t));
      const exactLng = smooth[newIdx].lng + (smooth[Math.min(newIdx + 1, smooth.length - 1)].lng - smooth[newIdx].lng) * Math.max(0, Math.min(1, t));

      const jitter = 0.00002;
      const jitterLat = exactLat + (Math.random() - 0.5) * jitter;
      const jitterLng = exactLng + (Math.random() - 0.5) * jitter;

      setPosition({ lat: jitterLat, lng: jitterLng, heading: headingRef.current, speed: Math.round(speedRef.current), altitude: 520 + Math.sin(newIdx * 0.05) * 30, accuracy: 3 + Math.random() * 2, timestamp: Date.now() });

      const progress = newIdx / (smooth.length - 1);
      setRouteProgress(progress);

      let remaining = 0;
      for (let i = newIdx; i < smooth.length - 1; i++) { remaining += distanceBetween(smooth[i], smooth[i + 1]); }
      setDistanceRemaining(Math.round(remaining * 1000));

      for (const instr of instructionsRef.current) {
        if (instr.triggered) continue;
        const instrIdx = instructionsRef.current.indexOf(instr);
        const instrProgress = instrIdx / instructionsRef.current.length;
        if (progress >= instrProgress * 0.9) {
          instr.triggered = true;
          setCurrentInstruction(instr);
          setUpcomingInstructions(instructionsRef.current.filter((t) => !t.triggered));
          break;
        }
      }
    }, tickRate);

    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isSimulating, speedProfile, stopSimulation]);

  return { position, isSimulating, routeProgress, currentInstruction, upcomingInstructions, distanceRemaining, speedProfile, startSimulation, stopSimulation, setSpeedProfile };
}
