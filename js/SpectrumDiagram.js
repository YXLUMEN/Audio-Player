export default class SpectrumDiagram {
    constructor(canvas, width = window.innerWidth, height = window.innerHeight) {
        this.canvas = canvas;
        this.canvasContext = canvas.getContext('2d');
        this.color = 'rgba(0,185,115,0.3)';

        this._cachedBarWidth = 0;
        this._cachedSliceWidth = 0;

        this.audioContext = null;
        this.analyser = null;
        this.source = null;

        this.width = width;
        this.height = height;

        this.isDrawing = true;
        this.lastDrawTime = 0;
        this.drawInterval = 10;

        this.currentMode = 'bars';

        this._drawBars = this._drawBars.bind(this);
        this._drawLineGraph = this._drawLineGraph.bind(this);
    }

    #setupStyles() {
        // Cache styles
        this.canvasContext.fillStyle = this.color;
        this.canvasContext.strokeStyle = this.color;
        this.canvasContext.lineWidth = 6;
    }

    resizeCanvas() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.#setupStyles();

        if (this.bufferLength) {
            this._cachedBarWidth = (this.width / this.bufferLength) - 1;
            this._cachedSliceWidth = this.width / this.bufferLength;
        }
    }

    initAudioSource(audioElement) {
        if (this.source) this.source.disconnect();

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();

        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
    }

    setAnalyser(analyserOpts = {}) {
        if (!this.source) throw new Error('source is required');

        Object.assign(this.analyser, {
            fftSize: 256,
            minDecibels: -100,
            maxDecibels: -10,
            smoothingTimeConstant: 0.85,
            ...analyserOpts,
        });

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);

        this._cachedBarWidth = (this.width / this.bufferLength) - 1;
        this._cachedSliceWidth = this.width / this.bufferLength;

        this.resizeCanvas();
    }

    startDraw(mode = this.currentMode) {
        this.isDrawing = true;
        this.currentMode = mode;

        const drawFunction = mode === 'lines' ? this._drawLineGraph : this._drawBars;
        requestAnimationFrame(drawFunction);
    }

    stopDraw() {
        this.isDrawing = false;
    }

    _drawBars() {
        if (!this.isDrawing) return;
        requestAnimationFrame(this._drawBars);

        const now = performance.now();
        if (now - this.lastDrawTime < this.drawInterval) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        const [width, height] = [this.width, this.height];
        this.canvasContext.clearRect(0, 0, width, height);

        let x = 0;
        const barWidth = this._cachedBarWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = this.dataArray[i] * 1.5;
            this.canvasContext.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
        this.lastDrawTime = now;
    }


    _drawLineGraph() {
        if (!this.isDrawing) return;
        requestAnimationFrame(this._drawLineGraph);

        const now = performance.now();
        if (now - this.lastDrawTime < this.drawInterval) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        const [width, height] = [this.width, this.height];
        this.canvasContext.clearRect(0, 0, width, height);
        this.canvasContext.beginPath();

        let x = 0;
        const sliceWidth = this._cachedSliceWidth;

        for (let i = 0; i < this.bufferLength; i++) {
            const y = height - (this.dataArray[i] / 255.0 * height);

            i === 0 ? this.canvasContext.moveTo(x, y) : this.canvasContext.quadraticCurveTo((x - sliceWidth / 2), y, x, y);
            x += sliceWidth;
        }
        this.canvasContext.stroke();
        this.lastDrawTime = now;
    }

    dispose() {
        this.isDrawing = false;

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        this.analyser.disconnect();
        this.audioContext.close().catch(console.error);

        this.canvasContext.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvasContext = null;
        this.canvas = null;
        this.dataArray = null;
    }
}
