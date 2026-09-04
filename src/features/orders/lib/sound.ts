/**
 * Synthesizes an elegant, non-intrusive 2-tone chime using native Web Audio API.
 * Frequency notes: D5 (587.33 Hz) -> A5 (880.00 Hz) with gentle exponential decay.
 */
export function playOrderChime(explicitContext?: AudioContext): boolean {
  try {
    let ctx = explicitContext;
    if (!ctx && typeof window !== 'undefined') {
      const AudioCtxConstructor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxConstructor) {
        ctx = new AudioCtxConstructor();
      }
    }

    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.15, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    gainNode.connect(ctx.destination);

    // Tone 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: A5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.12);
    osc2.connect(gainNode);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.8);

    return true;
  } catch {
    return false;
  }
}
