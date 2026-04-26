import type { Config, FloorState, FundingState, RoomState, RoomStatus } from './types';

export function totalGoal(config: Config): number {
  return config.floors
    .flatMap(f => f.rooms)
    .reduce((sum, r) => sum + r.price, 0);
}

export function computeFundingState(totalRaised: number, config: Config): FundingState {
  const goal = totalGoal(config);

  const orderedRooms = config.floors.flatMap(floor =>
    [...floor.rooms]
      .sort((a, b) => a.order - b.order)
      .map(room => ({ room, floorId: floor.id }))
  );

  let cumulative = 0;
  const statusMap = new Map<string, RoomStatus>();
  for (const { room, floorId } of orderedRooms) {
    const start = cumulative;
    cumulative += room.price;
    statusMap.set(
      `${floorId}:${room.id}`,
      totalRaised >= cumulative
        ? { kind: 'funded' }
        : totalRaised > start
          ? { kind: 'active', progress: (totalRaised - start) / room.price }
          : { kind: 'unfunded' }
    );
  }

  const floors: readonly FloorState[] = config.floors.map(floor => ({
    id: floor.id,
    name: floor.name,
    caption: floor.caption,
    rooms: floor.rooms.map(room => ({
      ...room,
      status: statusMap.get(`${floor.id}:${room.id}`) ?? { kind: 'unfunded' as const },
    })),
  }));

  const activeRoom: RoomState | null =
    floors.flatMap(f => f.rooms).find(r => r.status.kind === 'active') ?? null;

  const activeFloorId =
    floors.find(f => f.rooms.some(r => r.status.kind === 'active'))?.id ??
    config.floors[config.floors.length - 1]?.id ??
    1;

  return {
    totalRaised,
    totalGoal: goal,
    globalProgress: goal > 0 ? Math.min(totalRaised / goal, 1) : 0,
    activeFloorId,
    floors,
    activeRoom,
  };
}

export function floorImagePath(floorId: number): string {
  return `assets/floors/${floorId}.png`;
}

export function maskPath(floorId: number, roomId: string): string {
  return `assets/masks/${floorId}/${roomId}.png`;
}
