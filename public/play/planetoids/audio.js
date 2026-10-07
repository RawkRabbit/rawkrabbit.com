class SoundSynthesizer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.volume = 0.5;
        this.thrustOsc = null;
        this.thrustGain = null;
        this.shieldOsc = null;
        this.shieldGain = null;
        this.isMuted = false;
        
        // Generate a simple white noise buffer for explosions
        this.noiseBuffer = null;
    }

    init() {
        if (this.ctx) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
            
            this.createNoiseBuffer();
            this.setupContinuousSounds();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser", e);
        }
    }

    createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        this.noiseBuffer = buffer;
    }

    setupContinuousSounds() {
        // Thrust synth
        this.thrustOsc = this.ctx.createOscillator();
        this.thrustOsc.type = 'sawtooth';
        this.thrustOsc.frequency.value = 45;
        
        // Filter out high frequencies of thrust to make it a deep hum
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 80;
        
        this.thrustGain = this.ctx.createGain();
        this.thrustGain.gain.value = 0;
        
        this.thrustOsc.connect(lowpass);
        lowpass.connect(this.thrustGain);
        this.thrustGain.connect(this.masterGain);
        this.thrustOsc.start(0);

        // Shield hum synth
        this.shieldOsc = this.ctx.createOscillator();
        this.shieldOsc.type = 'sine';
        this.shieldOsc.frequency.value = 180;
        
        // Frequency modulation (vibrato) for shield
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        mod.frequency.value = 35; // Fast warble
        modGain.gain.value = 40;  // Warble range +/- 40Hz
        
        this.shieldGain = this.ctx.createGain();
        this.shieldGain.gain.value = 0;
        
        mod.connect(modGain);
        modGain.connect(this.shieldOsc.frequency);
        
        this.shieldOsc.connect(this.shieldGain);
        this.shieldGain.connect(this.masterGain);
        
        mod.start(0);
        this.shieldOsc.start(0);
    }

    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx ? this.ctx.currentTime : 0);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playLaser() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Sweep frequency down rapidly for retro laser shoot sound
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);

        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    playLaserP2() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);

        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.19);
    }

    playExplosion(type = 'medium') {
        this.init();
        this.resume();
        if (!this.ctx || !this.noiseBuffer || this.isMuted) return;

        const now = this.ctx.currentTime;
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        const gainNode = this.ctx.createGain();

        filter.type = 'bandpass';

        let duration = 0.3;
        let volume = 0.5;
        let startFreq = 800;
        let endFreq = 60;

        if (type === 'large') {
            duration = 0.7;
            volume = 0.8;
            startFreq = 400;
            endFreq = 40;
        } else if (type === 'small') {
            duration = 0.15;
            volume = 0.3;
            startFreq = 1200;
            endFreq = 150;
        } else if (type === 'explosive') {
            duration = 1.2;
            volume = 1.0;
            startFreq = 600;
            endFreq = 20;
        }

        filter.frequency.setValueAtTime(startFreq, now);
        filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.masterGain);

        noiseSource.start(now);
        noiseSource.stop(now + duration);
    }

    setThrust(active) {
        this.init();
        this.resume();
        if (!this.ctx || !this.thrustGain || this.isMuted) return;

        const now = this.ctx.currentTime;
        if (active) {
            // Smooth ramp to prevent clicking sounds
            this.thrustGain.gain.setTargetAtTime(0.25, now, 0.05);
        } else {
            this.thrustGain.gain.setTargetAtTime(0, now, 0.05);
        }
    }

    setShield(active) {
        this.init();
        this.resume();
        if (!this.ctx || !this.shieldGain || this.isMuted) return;

        const now = this.ctx.currentTime;
        if (active) {
            this.shieldGain.gain.setTargetAtTime(0.18, now, 0.05);
        } else {
            this.shieldGain.gain.setTargetAtTime(0, now, 0.05);
        }
    }

    playHyperspace() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(2200, now + 0.4);

        // Add a tremolo/vibrato LFO effect
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 25;
        lfoGain.gain.value = 100;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        lfo.start(now);
        osc.start(now);
        
        lfo.stop(now + 0.41);
        osc.stop(now + 0.41);
    }

    playLevelUp() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const start = now + (idx * 0.08);
            const duration = 0.25;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.setValueAtTime(0.2, start);
            gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
            
            osc.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            osc.start(start);
            osc.stop(start + duration + 0.05);
        });
    }

    playCollect() {
        this.init();
        this.resume();
        if (!this.ctx || this.isMuted) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);

        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.26);
    }
}

const audio = new SoundSynthesizer();
window.gameAudio = audio;
