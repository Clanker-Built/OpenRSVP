import type { RsvpApi } from '../preload/preload';

declare global {
  interface Window {
    rsvp: RsvpApi;
  }
}

export {};
