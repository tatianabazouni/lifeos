/// <reference types="vite/client" />

// React Three Fiber JSX type augmentation
import { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

declare module "use-sound" {
  type PlayFunction = () => void;
  interface Options {
    volume?: number;
    playbackRate?: number;
    interrupt?: boolean;
    soundEnabled?: boolean;
    sprite?: Record<string, [number, number]>;
  }
  export default function useSound(
    url: string,
    options?: Options
  ): [PlayFunction, { stop: () => void; sound: any }];
}
