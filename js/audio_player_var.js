import SpectrumDiagram from "./SpectrumDiagram.js";

/**
 * 获取主题背景
 * @type {HTMLBodyElement}
 * */
export const Body = document.getElementById('body');
/**
 * 获取音频播放器对象
 * @type {HTMLAudioElement}
 * */
export const AudioEle = document.getElementById('audio-player');
AudioEle.loop = false;
AudioEle.volume = .7;

/**
 * 基本信息显示框
 * @type {HTMLDivElement}
 * */
export const TextContainer = document.getElementById('text-container');

/**
 * 歌词框架
 * @type {HTMLDivElement}
 * */
export const LyricBox = document.getElementById('lyric-box');
/**
 * 歌词列表
 * @type {HTMLUListElement}
 * */
export const LyricUl = document.getElementById('lyric-ul');
/**
 * 歌词标题
 * @type {HTMLHeadingElement}
 * */
export const LyricTitle = document.getElementById('lyric-title');
/**
 * 歌词偏移量显示
 * @type {HTMLSpanElement}
 * */
export const LyricOffsetEle = document.getElementById('lyric-offset');

/**
 * 歌曲名
 * @type {HTMLDivElement}
 * */
export const AudioTitle = document.getElementById('music-title');
/**
 * 歌曲作者
 * @type {HTMLSpanElement}
 * */
export const Author = document.getElementById('author-name');
/**
 * 专辑
 * @type {HTMLSpanElement}
 * */
export const Album = document.getElementById('album-name');

/**
 * 进度条
 * @type {HTMLDivElement}
 * */
export const Progress = document.getElementById('progress');
/**
 * 总进度条
 * @type {HTMLDivElement}
 * */
export const ProgressTotal = document.getElementById('progress-total');
/**
 * 加载光效
 * @type {HTMLDivElement}
 * */
export const ProgressLoading = document.getElementById('progress-loading');

/**
 * 已进行时长元素
 * @type {HTMLSpanElement}
 * */
export const PlayedTime = document.getElementById('playedTime');
/**
 * 总时长元素
 * @type {HTMLSpanElement}
 * */
export const AudioTime = document.getElementById('audioTime');

/**
 * 播放模式按钮
 * @type {HTMLImageElement}
 * */
export const PlayMode = document.getElementById('playMode');
/**
 * 暂停按钮
 * @type {HTMLDivElement}
 * */
export const Pause = document.getElementById('playPause');
/**
 * 音量调节
 * @type {HTMLDivElement}
 * */
export const Volume = document.getElementById('volume');
/**
 * 音量调节滑块
 * @type {HTMLInputElement}
 * */
export const VolumeToggle = document.getElementById('volume-toggle');

/**
 * 搜索框
 * @type {HTMLInputElement}
 * */
export const SearchInputBar = document.getElementById('search-input');
/**
 * 加载图标
 * @type {HTMLImageElement}
 * */
export const LoadingIco = document.getElementById('loading');
/**
 * 左侧关闭面板
 * @type {HTMLDivElement}
 * */
export const CloseList = document.getElementById('close-list');
/**
 * 音乐列表面板
 * @type {HTMLDivElement}
 * */
export const AudioList = document.getElementById('music-list');
/**
 * 音乐列表Ul
 * @type {HTMLUListElement}
 * */
export const ListParentUl = document.getElementById('all-list');
/**
 * @type {HTMLDivElement}
 * */
export const MoreSelectionsContainer = document.getElementById('unique-selections-container');
/**
 * @type {HTMLCollectionOf<Element>}
 * */
export const MoreSelections = document.getElementsByClassName('more-selections');
/**
 * @type {SpectrumDiagram}
 * */
export const DSD = new SpectrumDiagram(
    document.getElementById('audio-canvas'), window.innerWidth, 400);

/**
 * 音频播放时间换算
 * @param {number} value
 * */
export function transTime(value) {
    const h = Math.floor(value / 3600);
    value %= 3600;
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);

    const timeString = h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
    return timeString.split(':').map(unit => unit.padStart(2, '0')).join(':');
}

// 更新进度条
export function updatePlayingProgress(current = AudioEle.currentTime) {
    const value = current / AudioEle.duration;
    if (value > 1) return;
    Progress.style.width = value * 100 + '%';
    PlayedTime.textContent = transTime(AudioEle.currentTime);
}

// 切换播放状态
export function pauseToggle() {
    if (AudioEle.paused) AudioEle.play()
        .then(() => {
            DSD.audioContext?.resume().catch();
            Pause.classList.remove('icon-play');
            Pause.classList.add('icon-pause');
        })
        .catch(err => {
            console.error('Error playing audio:', err);
        });
    else {
        AudioEle.pause();
        DSD.audioContext?.suspend().catch();
    }
}

/**
 * 设置静音
 * 原来用闭包的,后面export了就不用了
 * @type {string}
 * */
let LAST_VOLUME = '70';

export function setMuted() {
    // 存储上一次的音量
    if (VolumeToggle.value === '0') {
        if (LAST_VOLUME === '0') LAST_VOLUME = '70';
        VolumeToggle.value = LAST_VOLUME;
        AudioEle.muted = false;
        Volume.style.backgroundImage = "url('/static/img/audio/ico/volume.svg')";
    } else {
        LAST_VOLUME = VolumeToggle.value;
        VolumeToggle.value = '0';
        AudioEle.muted = true;
        Volume.style.backgroundImage = "url('/static/img/audio/ico/mute.svg')";
        }
}

export function toggleDraw(e) {
    if (e.target.checked) {
        DSD.startDraw();
        DSD.canvas.style.display = 'block';
    } else {
        DSD.stopDraw();
        DSD.canvas.style.display = 'none';
    }
}

export function switchDrawMode() {
    DSD.stopDraw();
    requestAnimationFrame(() => {
        const selectedRadio = document.querySelector('input[name="draw-mode"]:checked');
        if (selectedRadio) DSD.startDraw(selectedRadio.value)
    });
}

export function changeFFTSize() {
    const value = document.querySelector('input[name="change-fftSize"]').value;
    const n = value === '' ? 256 : Number(value);
    if (isNaN(n) || n < 32 || n > 32768 || (n & (n - 1)) !== 0) {
        alert('必须为2的次方并且满足[32,32768]');
        return false;
    }
    DSD.setAnalyser({fftSize: n});
}

export function changeDrawInterval() {
    const value = document.querySelector('input[name="change-draw-interval"]').value;
    const n = value === '' ? 10 : Number(value);
    if (isNaN(n)) return;
    DSD.drawInterval = n;
}

export function changeDecibels() {
    const minV = document.querySelector('input[name="min-decibels"]').value;
    const maxV = document.querySelector('input[name="max-decibels"]').value;
    const [min, max] = [minV === '' ? -100 : Number(minV), maxV === '' ? -10 : Number(maxV)];
    if (isNaN(min) || isNaN(max) || min >= max) return;
    DSD.setAnalyser({
        minDecibels: min,
        maxDecibels: max,
    });
}