/**
 * Multi-Modal Audio & Whisper / Speech Detection Engine
 * 
 * Uses Web Audio API and Fast Fourier Transform (FFT) spectrum analysis
 * to isolate human vocal speech and whisper frequencies from ambient background noise.
 */

export class AudioSpeechDetector {
  constructor({ onSpeechDetected, onVolumeChange, onStatusChange }) {
    this.onSpeechDetected = onSpeechDetected || (() => {});
    this.onVolumeChange = onVolumeChange || (() => {});
    this.onStatusChange = onStatusChange || (() => {});

    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.bandpass = null;
    this.animationFrameId = null;
    this.stream = null;
    this.isActive = false;

    // Detection Parameters
    this.backgroundNoiseFloor = 0.015;
    this.speechThreshold = 0.055;
    this.whisperThreshold = 0.032;

    // Temporal smoothing and debouncing
    this.speechStreak = 0;
    this.whisperStreak = 0;
    this.currentStatus = 'QUIET'; // 'QUIET' | 'WHISPER' | 'SPEECH'
    this.lastTriggerTime = 0;
  }

  async start(existingStream = null) {
    try {
      if (this.isActive) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) {
        console.warn("Web Audio API not supported in this browser.");
        return false;
      }

      this.audioContext = new AudioCtx();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      if (existingStream && existingStream.getAudioTracks().length > 0) {
        this.stream = existingStream;
      } else {
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false, // keep natural dynamics to detect subtle whispers
            autoGainControl: false
          }
        });
      }

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.65;

      // Bandpass Filter centered on human vocal range (120 Hz to 4500 Hz)
      this.bandpass = this.audioContext.createBiquadFilter();
      this.bandpass.type = 'bandpass';
      this.bandpass.frequency.value = 1600; // center frequency
      this.bandpass.Q.value = 0.85; // bandwidth covers speech and whisper harmonics

      this.source.connect(this.bandpass);
      this.bandpass.connect(this.analyser);

      this.isActive = true;
      this.processAudio();
      return true;
    } catch (err) {
      console.error("Failed to start AudioSpeechDetector:", err);
      return false;
    }
  }

  processAudio() {
    if (!this.isActive || !this.analyser) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);

    this.analyser.getByteFrequencyData(dataArray);
    this.analyser.getByteTimeDomainData(timeDomainArray);

    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;

    // 1. Calculate RMS Volume (0 to 1)
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeDomainArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / bufferLength);

    // 2. Frequency Band Energy Distribution
    // Fundamental Vocal: ~100Hz - 400Hz
    // Formant Speech: ~400Hz - 2500Hz
    // Whisper / Sibilance Fricatives: ~2500Hz - 5500Hz
    let vocalEnergy = 0;
    let whisperEnergy = 0;
    let totalEnergy = 0;

    let vocalBins = 0;
    let whisperBins = 0;

    for (let i = 0; i < bufferLength; i++) {
      const freq = i * binSize;
      const energy = dataArray[i] / 255;
      totalEnergy += energy;

      if (freq >= 120 && freq <= 2400) {
        vocalEnergy += energy;
        vocalBins++;
      } else if (freq > 2400 && freq <= 5500) {
        whisperEnergy += energy;
        whisperBins++;
      }
    }

    const avgVocal = vocalBins > 0 ? vocalEnergy / vocalBins : 0;
    const avgWhisper = whisperBins > 0 ? whisperEnergy / whisperBins : 0;

    // Dynamically update background noise baseline
    if (rms < this.backgroundNoiseFloor * 1.5) {
      this.backgroundNoiseFloor = this.backgroundNoiseFloor * 0.98 + rms * 0.02;
    }

    const snr = rms - this.backgroundNoiseFloor;
    const decibel = Math.round(rms * 100);

    // 3. Speech & Whisper Classification Logic
    let detectedState = 'QUIET';

    // Normal Vocal Speech: High vocal energy + sufficient volume
    if (rms > this.speechThreshold && avgVocal > 0.12) {
      detectedState = 'SPEECH';
      this.speechStreak++;
      this.whisperStreak = 0;
    }
    // Whisper Detection: Lower RMS volume but significant energy in 2.5kHz - 5.5kHz speech fricative band
    else if (
      (rms > this.whisperThreshold || snr > 0.018) &&
      avgWhisper > 0.08 &&
      avgVocal > 0.04
    ) {
      detectedState = 'WHISPER';
      this.whisperStreak++;
      this.speechStreak = 0;
    } else {
      this.speechStreak = Math.max(0, this.speechStreak - 1);
      this.whisperStreak = Math.max(0, this.whisperStreak - 1);
      detectedState = 'QUIET';
    }

    // Trigger state change
    if (detectedState !== this.currentStatus) {
      this.currentStatus = detectedState;
      this.onStatusChange({
        status: detectedState,
        decibel,
        vocalEnergy: avgVocal,
        whisperEnergy: avgWhisper
      });
    }

    // Trigger formal incident when speech/whisper sustains for > 4 consecutive frames (~300ms)
    const now = Date.now();
    if (
      (this.speechStreak >= 4 || this.whisperStreak >= 5) &&
      now - this.lastTriggerTime > 5000
    ) {
      this.lastTriggerTime = now;
      this.onSpeechDetected({
        type: detectedState === 'SPEECH' ? 'SPEECH_DETECTED' : 'WHISPER_DETECTED',
        decibel,
        status: detectedState,
        vocalEnergy: avgVocal,
        whisperEnergy: avgWhisper,
        timestamp: new Date().toISOString()
      });
    }

    this.onVolumeChange({
      rms,
      decibel,
      dataArray,
      timeDomainArray,
      status: this.currentStatus
    });

    this.animationFrameId = requestAnimationFrame(() => this.processAudio());
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.source) {
      try { this.source.disconnect(); } catch (e) {}
      this.source = null;
    }
    if (this.bandpass) {
      try { this.bandpass.disconnect(); } catch (e) {}
      this.bandpass = null;
    }
    if (this.analyser) {
      try { this.analyser.disconnect(); } catch (e) {}
      this.analyser = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try { this.audioContext.close(); } catch (e) {}
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getAudioTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }
}
