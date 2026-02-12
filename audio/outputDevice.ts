export interface OutputDevice {
  playNote(midi: number, velocity: number, durationMs: number, atTimeSec?: number): void;
}

export class WebAudioOutputDevice implements OutputDevice {
  private context: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext();
    }
    return this.context;
  }

  playNote(midi: number, velocity: number, durationMs: number, atTimeSec?: number): void {
    const ctx = this.getContext();
    const now = ctx.currentTime;
    const start = atTimeSec ? Math.max(now, atTimeSec) : now;
    const durationSec = Math.max(0.03, durationMs / 1000);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const freq = 440 * 2 ** ((midi - 69) / 12);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);

    const maxGain = Math.max(0.03, Math.min(0.45, velocity / 127));
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(maxGain, start + 0.005);
    gain.gain.linearRampToValueAtTime(maxGain * 0.4, start + 0.085);
    gain.gain.linearRampToValueAtTime(0, start + durationSec + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + durationSec + 0.05);
  }
}

export class WebMIDIOutputDevice implements OutputDevice {
  playNote(): void {
    // TODO: wire Web MIDI output in a later milestone.
  }
}
