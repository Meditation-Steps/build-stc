export interface Room {
  readonly id: string;
  readonly name: string;
  readonly price: number;
  readonly order: number;
}

export interface Floor {
  readonly id: number;
  readonly name: string;
  readonly caption: string;
  readonly rooms: readonly Room[];
}

export interface Config {
  readonly donorbox_campaign: string;
  readonly floors: readonly Floor[];
}

export type RoomStatus =
  | { readonly kind: 'funded' }
  | { readonly kind: 'active'; readonly progress: number }
  | { readonly kind: 'unfunded' };

export interface RoomState extends Room {
  readonly status: RoomStatus;
}

export interface FloorState {
  readonly id: number;
  readonly name: string;
  readonly caption: string;
  readonly rooms: readonly RoomState[];
}

export interface FundingState {
  readonly totalRaised: number;
  readonly totalGoal: number;
  readonly globalProgress: number;
  readonly activeFloorId: number;
  readonly floors: readonly FloorState[];
  readonly activeRoom: RoomState | null;
}
