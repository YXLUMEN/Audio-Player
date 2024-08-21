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
            Pause.classList.remove('icon-play');
            Pause.classList.add('icon-pause');
        })
        .catch(err => {
            console.error('Error playing audio:', err);
        });
    else {
        AudioEle.pause();
        Pause.classList.remove('icon-pause');
        Pause.classList.add('icon-play');
    }
}

/**
 * 设置静音
 * 原来用闭包的,后面export了就不用了
 * @type {string}
 * */
let _LastVolume = '70';

export function setMuted() {
    // 存储上一次的音量
    if (VolumeToggle.value === '0') {
        if (_LastVolume === '0') _LastVolume = '70';
        VolumeToggle.value = _LastVolume;
        AudioEle.muted = false;
        Volume.style.backgroundImage = "url('../img/audio/ico/volume.svg')";
    } else {
        _LastVolume = VolumeToggle.value;
        VolumeToggle.value = '0';
        AudioEle.muted = true;
        Volume.style.backgroundImage = "url('../img/audio/ico/mute.svg')";
        }
}