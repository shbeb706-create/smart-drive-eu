/**
 * OSRM (Open Source Routing Machine) integration
 * Free public demo server: https://router.project-osrm.org
 * Returns real turn-by-turn routes with instructions.
 */

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  name: string;
  maneuver: {
    type: string;
    modifier: string;
    location: [number, number];
  };
}

export interface RouteResult {
  geometry: Array<{ lat: number; lng: number }>;
  distance: number;
  duration: number;
  steps: RouteStep[];
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let byte;
    let shift = 0;
    let result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

function mapManeuverToIcon(type: string, modifier: string): string {
  if (type === 'depart' || type === 'arrive') return 'straight';
  if (type === 'roundabout' || type === 'rotary') return 'roundabout';
  if (type === 'merge') return 'merge';
  if (type === 'off ramp' || type === 'on ramp' || type === 'fork') return 'exit';

  const mod = modifier?.toLowerCase() ?? '';
  if (mod.includes('sharp') && mod.includes('right')) return 'sharp-right';
  if (mod.includes('sharp') && mod.includes('left')) return 'sharp-left';
  if (mod.includes('right') && mod.includes('slight')) return 'slight-right';
  if (mod.includes('left') && mod.includes('slight')) return 'slight-left';
  if (mod.includes('right')) return 'right';
  if (mod.includes('left')) return 'left';
  if (mod.includes('straight')) return 'straight';
  if (mod.includes('uturn')) return 'sharp-left';

  return 'straight';
}

function formatInstruction(step: { maneuver: { type: string; modifier: string }; name: string }): string {
  const { type, modifier } = step.maneuver;
  const road = step.name || 'the road';

  if (type === 'depart') return `Head out on ${road}`;
  if (type === 'arrive') return 'Arrive at destination';
  if (type === 'roundabout' || type === 'rotary') return `Enter roundabout, exit onto ${road}`;
  if (type === 'merge') return `Merge onto ${road}`;
  if (type === 'off ramp') return `Take the exit onto ${road}`;
  if (type === 'on ramp') return `Take the ramp onto ${road}`;
  if (type === 'fork') return `Keep ${modifier ?? 'left'} onto ${road}`;

  const mod = modifier?.toLowerCase() ?? '';
  if (mod.includes('uturn')) return `Make a U-turn onto ${road}`;
  if (mod.includes('sharp') && mod.includes('right')) return `Sharp right onto ${road}`;
  if (mod.includes('sharp') && mod.includes('left')) return `Sharp left onto ${road}`;
  if (mod.includes('slight') && mod.includes('right')) return `Slight right onto ${road}`;
  if (mod.includes('slight') && mod.includes('left')) return `Slight left onto ${road}`;
  if (mod.includes('right')) return `Turn right onto ${road}`;
  if (mod.includes('left')) return `Turn left onto ${road}`;

  return `Continue on ${road}`;
}

export async function fetchRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteResult | null> {
  try {
    const url = `${OSRM_BASE}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=polyline&steps=true`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) return null;

    const route = data.routes[0];
    const leg = route.legs?.[0];

    const geometry = decodePolyline(route.geometry);

    const steps: RouteStep[] = (leg?.steps ?? []).map((step: Record<string, unknown>) => ({
      instruction: formatInstruction({
        maneuver: step.maneuver as { type: string; modifier: string },
        name: (step.name as string) ?? '',
      }),
      distance: (step.distance as number) ?? 0,
      duration: (step.duration as number) ?? 0,
      name: (step.name as string) ?? '',
      maneuver: step.maneuver as RouteStep['maneuver'],
    }));

    return {
      geometry,
      distance: route.distance,
      duration: route.duration,
      steps,
    };
  } catch {
    return null;
  }
}

export function mapStepsToTurnInstructions(
  steps: RouteStep[]
): Array<{
  id: string;
  instruction: string;
  detail: string;
  distance: number;
  icon: string;
  triggered: boolean;
}> {
  return steps
    .filter((s) => s.maneuver.type !== 'depart' && s.maneuver.type !== 'arrive')
    .map((step, i) => ({
      id: `osrm-turn-${i}`,
      instruction: step.instruction,
      detail: step.name || 'Continue',
      distance: Math.round(step.distance),
      icon: mapManeuverToIcon(step.maneuver.type, step.maneuver.modifier),
      triggered: false,
    }));
}
