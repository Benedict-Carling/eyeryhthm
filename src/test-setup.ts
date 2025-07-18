import '@testing-library/jest-dom';

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn(),
  },
  writable: true,
});

// Mock HTMLVideoElement methods
Object.defineProperty(global.HTMLVideoElement.prototype, 'play', {
  value: vi.fn().mockImplementation(() => Promise.resolve()),
  writable: true,
});

Object.defineProperty(global.HTMLVideoElement.prototype, 'pause', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(global.HTMLVideoElement.prototype, 'load', {
  value: vi.fn(),
  writable: true,
});

// Mock MediaStream
class MockMediaStream {
  tracks: MediaStreamTrack[] = [];
  
  getTracks() {
    return this.tracks;
  }
  
  getVideoTracks() {
    return this.tracks.filter(track => track.kind === 'video');
  }
  
  addTrack(track: MediaStreamTrack) {
    this.tracks.push(track);
  }
}

class MockMediaStreamTrack {
  kind: string;
  enabled = true;
  
  constructor(kind: string) {
    this.kind = kind;
  }
  
  stop() {
    this.enabled = false;
  }
}

global.MediaStream = MockMediaStream as unknown as typeof MediaStream;
global.MediaStreamTrack = MockMediaStreamTrack as unknown as typeof MediaStreamTrack;