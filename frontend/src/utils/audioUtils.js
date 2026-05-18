/**
 * Premium Web Audio API Sound Chimes for Enterprise Logistics Scanning
 * Synthesizes pure synth wave tones to give instant acoustic confirmations.
 */

export const playSuccessBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sine";
    // E6 then A6 (a high-quality enterprise scanner chime)
    osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime); // E6
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.start();
    
    setTimeout(() => {
      osc.frequency.setValueAtTime(1760.00, audioCtx.currentTime); // A6
    }, 85);
    
    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 150);
    }, 170);
  } catch (e) {
    console.warn("Audio Context blocked or not supported by browser security policies", e);
  }
};

export const playErrorBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, audioCtx.currentTime); // Low buzz
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    osc.start();
    
    setTimeout(() => {
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.25);
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 250);
    }, 45);
  } catch (e) {
    console.warn("Audio Context blocked or not supported by browser security policies", e);
  }
};
