export type SocketAdapterMode = 'redis' | 'memory';

let adapterMode: SocketAdapterMode = 'memory';

export const setSocketAdapterMode = (mode: SocketAdapterMode): void => {
  adapterMode = mode;
};

export const getSocketAdapterMode = (): SocketAdapterMode => adapterMode;
