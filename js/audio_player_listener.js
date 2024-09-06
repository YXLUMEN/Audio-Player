import * as pd from "./audio_player_data.js";
import * as v from "./audio_player_var.js";
import {Pause} from "./audio_player_var.js";
import {debounce, generateUniqueRandomNumbers, getSlideDirection, isMobile, throttleTimeOut} from "utilities.js";
import createAlert from "page.js";

// 上一次退出时的播放进度
function replayFromPer() {
    const playedHistory = JSON.parse(localStorage.getItem('_played_time') || 'null');

    if (!playedHistory || playedHistory[0] !== pd.AUDIO_INDEX) {
        localStorage.removeItem('_played_time');
        return;
    }

    const playedTime = Number(playedHistory[1]);
    if (Number.isNaN(playedTime) || playedTime <= 0 || playedTime >= v.AudioEle.duration) return;

    v.AudioEle.currentTime = playedTime;
    v.updatePlayingProgress();
}

// 播放模式设置
let PLAY_MODE = 0;

function modeToggle() {
    PLAY_MODE = (PLAY_MODE + 1) % 3;
    v.PlayMode.src = `/static/img/audio/ico/play_mode_${PLAY_MODE}.svg`;
}

/**
 * 随机播放已播放列表
 * @type {number[]}
 * */
let RAND_PLAYED_ARRAY = null;

/**
 * 播放模式
 * @param {number} delta
 * */
function playingMode(delta = 1) {
    const max = pd.MAX_AUDIO_COUNT;

    // 列表循环
    if (PLAY_MODE === 0) {
        const next = (pd.AUDIO_INDEX + delta) % max;
        return next < 0 ? max - 1 : next;
    }

    //单曲循环
    if (PLAY_MODE === 1) return pd.AUDIO_INDEX;

    // 随机播放
    if (PLAY_MODE === 2) {
        const random = RAND_PLAYED_ARRAY.pop();
        if (RAND_PLAYED_ARRAY.length % 8 === 0) localStorage.setItem('_random_list', JSON.stringify(RAND_PLAYED_ARRAY));

        return random !== undefined ? random : (() => {
            // 如果数量极大,可以考虑百次分批生成
            RAND_PLAYED_ARRAY = generateUniqueRandomNumbers(max);
            return RAND_PLAYED_ARRAY.pop();
        })();
    }
    throw new Error('未知的播放模式');
}

// 更新进度条信号量
let UPDATE_PROGRESS_SIGNAL = true;

// 延迟更改音乐播放进度
const applyAudioLeap = debounce(rate => {
    v.AudioEle.currentTime = v.AudioEle.duration * rate;
    UPDATE_PROGRESS_SIGNAL = true
}, 200);

// 拖动进度条更改音乐进度
const progressLeapFn = throttleTimeOut((event) => {
    // 只有音乐开始播放后才可以调节,已经播放过但暂停了的也可以
    if (event.pressure === 0 || v.AudioEle.currentTime === 0) return;
    UPDATE_PROGRESS_SIGNAL = false;

    const pgsWidth = parseFloat(window.getComputedStyle(v.ProgressTotal).width);
    const rate = event.offsetX / pgsWidth;
    v.updatePlayingProgress(v.AudioEle.duration * rate);

    applyAudioLeap(rate);
}, 50);

// 点击关闭面板关闭音乐列表
function closeListBoard() {
    v.AudioList.classList.remove('list-card-show');
    v.AudioList.classList.add('list-card-hide');
    v.CloseList.style.display = 'none';
}

// 点击列表展开音乐列表
function listShow() {
    v.AudioList.classList.remove('list-card-hide');
    v.AudioList.classList.add('list-card-show');
    v.AudioList.style.display = v.CloseList.style.display = 'flex';
}

//显示歌词
const lyricDisplayFn = throttleTimeOut(() => {
    let cssList;
    if (v.LyricBox.style.opacity === '0') {
        cssList = [
            'opacity:0;pointer-events:none;',
            'opacity:1;pointer-events:initial;display:block;',
            'brightness(.5) blur(40px)',
            '1'
        ];
        setTimeout(() => v.TextContainer.style.display = 'none', 250);
    } else {
        cssList = [
            'opacity:1;pointer-events:initial;display:block',
            'opacity:0;pointer-events:initial;',
            'blur(40px)',
            '0'
        ];
        setTimeout(() => v.LyricBox.style.display = 'none', 250);
    }
    [v.TextContainer.style.cssText, v.LyricBox.style.cssText, v.Body.style.backdropFilter, v.LyricTitle.style.opacity] = cssList;
}, 600);


// 重启歌词同步
const reEnableScrollLyric = debounce(() => pd.LYRIC_ACTIONS.syncLyricEnable = true, 1E4);

function wheelRollingLyrics(direction = -2) {
    pd.LYRIC_ACTIONS.syncLyricEnable = false;

    const currentTransformValue = Number(v.LyricUl.style.transform.match(/-?\d+/)?.[0] || -40);
    let deltaLine = direction * pd.LYRIC_ACTIONS.lineOffset + currentTransformValue;

    deltaLine = Math.min(deltaLine, 0);
    deltaLine = Math.max(deltaLine, pd.LYRIC_ACTIONS.maxScrollHeight);

    v.LyricUl.style.transform = `translateY(${deltaLine}px)`;
    reEnableScrollLyric();
}

// 移动端滑动
const LyricBSlPosition = (() => {
    const obj = Object.create(null);
    Object.assign(obj, {
        startX: 0,
        startY: 0,
        touchStartFn(event) {
            this.startX = event.changedTouches[0].pageX;
            this.startY = event.changedTouches[0].pageY;
        },
        touchedFn(event) {
            const endX = event.changedTouches[0].pageX;
            const endY = event.changedTouches[0].pageY;

            const direction = getSlideDirection(this.startX, this.startY, endX, endY);

            const moveOffset = Math.floor(Math.log(Math.abs(endY - this.startY)));
            if (direction === 3) return wheelRollingLyrics(moveOffset);
            if (direction === 4) return wheelRollingLyrics(-1 * moveOffset);
        }
    });
    return obj;
})();

// 显示搜索框
const showSearchBarFn = throttleTimeOut(() => {
    v.SearchInputBar.style.cssText = v.SearchInputBar.style.opacity === '0'
        ? 'opacity:1;left:8%;width:80%;height:50px;pointer-events:initial;'
        : 'opacity:0;left:100%;width:0;height:0;pointer-events:none;';
}, 300);

/**
 * 操作映射
 * @type {Map<string, NewableFunction>}
 * */
const CONTROL_MAP = new Map([
    ['Space', v.pauseToggle],
    ['ArrowRight', () => pd.switchAudio(playingMode(1))],
    ['ArrowLeft', () => pd.switchAudio(playingMode(-1))],
    ['ArrowUp', () => wheelRollingLyrics(-4)],
    ['ArrowDown', () => wheelRollingLyrics(4)],
    ['KeyR', modeToggle],
    ['KeyM', v.setMuted],
    ['KeyH', () => pd.highlightChosenSelection()],
    ['KeyS', showSearchBarFn],
    ['KeyL', lyricDisplayFn],
    ['Escape', () => v.CloseList.style.display === 'none' ? listShow() : closeListBoard()],
    ['lyric', lyricDisplayFn],
    ['playMode', modeToggle],
    ['skipForward', () => pd.switchAudio(playingMode(-1), {scroll: false})],
    ['playPause', v.pauseToggle],
    ['skipBackward', () => pd.switchAudio(playingMode(1), {scroll: false})],
    ['volume', v.setMuted],
]);

/**
 * 音频操作按钮
 * @param {PointerEvent} event
 * */
function audioControlPa(event) {
    event.stopPropagation();
    const target = event.target.closest('.center-icon');
    target && CONTROL_MAP.get(target.getAttribute('id'))?.();
}

// 键盘操作
const keyControlFn = throttleTimeOut((event) => CONTROL_MAP.get(event.code)?.(), 100);

const audioErrorHandle = (() => {
    const _MAX_RETRY = 3;
    const _MAX_FATAL = 6;
    const _RETRY_DELAY = 2500;

    let retryCount = 0;
    let fatalCount = 0;

    const retry = () => {
        setTimeout(() => {
            createAlert(`尝试重载... ${retryCount}/${_MAX_RETRY}`, 'message');
            v.AudioEle.load();
            v.pauseToggle();
            pd.highlightChosenSelection();
        }, _RETRY_DELAY);
    };

    return () => {
        if (fatalCount > _MAX_FATAL) {
            createAlert('无法重载,请检查网络连接并刷新', 'danger');
            throw new WebTransportError('连接失败');
        }

        retryCount += 1;
        if (retryCount <= _MAX_RETRY) {
            retry();
            return;
        }

        fatalCount += 1;
        pd.switchAudio((pd.AUDIO_INDEX + 1) % pd.MAX_AUDIO_COUNT);
        createAlert('无法加载此文件,已跳过', 'warning');
        retryCount = 0;
    };
})();

// 监听暂停已切换图标
v.AudioEle.addEventListener('pause', () => {
    Pause.classList.remove('icon-pause');
    Pause.classList.add('icon-play');
});

// 页面刷新时保存播放进度
v.AudioEle.addEventListener('loadedmetadata', replayFromPer, {once: true});

// 音频更新同步显示
v.AudioEle.addEventListener('timeupdate', () => {
    pd.syncLyric();
    if (UPDATE_PROGRESS_SIGNAL) v.updatePlayingProgress();
});

// 音频跳跃时
v.AudioEle.addEventListener('seeked', () => {
    pd.LYRIC_ACTIONS.syncLyricEnable = true;
    pd.significantLeapFn();
});

// 监听音乐文件加载完成
v.AudioEle.addEventListener('canplaythrough', () => {
    if (v.AudioEle.readyState === 4) v.ProgressLoading.style.display = 'none';
});

// 音频结束后下一曲
v.AudioEle.addEventListener('ended', () => pd.switchAudio(playingMode(1), {scroll: false}));

// 音频出错监听
v.AudioEle.addEventListener('error', audioErrorHandle);

// 在拖到时修改音量
v.VolumeToggle.addEventListener('input', () => {
    if (v.AudioEle.muted || v.AudioEle.volume === v.VolumeToggle.value / 100) return;
    v.AudioEle.volume = v.VolumeToggle.value / 100;
});

// 进度条拖动
v.ProgressTotal.addEventListener('pointermove', progressLeapFn, {passive: true});

// 进度条点击
v.ProgressTotal.addEventListener('pointerdown', progressLeapFn);

// 展示列表
document.getElementById('list').addEventListener('click', listShow);

// 音乐列表父级列表代理子级选中
v.ListParentUl.addEventListener('click', (event) => {
    const target = event.target.closest('li');
    if (!target) return;
    pd.switchAudio(Number(target.getAttribute('id').split('-')[1]));
});

// 关闭列表
v.CloseList.addEventListener('click', closeListBoard);

// 点击歌词行跳转
v.LyricUl.addEventListener('click', (event) => {
    if (pd.LYRIC_ACTIONS.lyrArray.length <= 1) return;
    const target = event.target.closest('span');
    if (!target) return;
    const leap = Number(target.getAttribute('time'));
    if (Number.isNaN(leap)) return;
    v.AudioEle.currentTime = leap;
});

// 监听搜索框按键事件
v.SearchInputBar.addEventListener('keydown', (event) => {
    event.stopPropagation();
    pd.activeSearchFn(event);
});

// 在切换模式时加载本地随机列表
v.PlayMode.addEventListener('load', () => {
    if (RAND_PLAYED_ARRAY) return;
    try {
        const tempArray = JSON.parse(localStorage.getItem('_random_list'));
        RAND_PLAYED_ARRAY = Array.isArray(tempArray) ? tempArray : [];
    } catch (err) {
        RAND_PLAYED_ARRAY = [];
    }
}, {once: true});

// 设备类型决定
if (isMobile()) {
    // 滑动更新列表
    v.ListParentUl.addEventListener('scroll', pd.slideToUpdateFn, {passive: true});

    // 歌词滚动
    v.LyricBox.addEventListener('touchstart', LyricBSlPosition.touchStartFn, {passive: true});

    v.LyricBox.addEventListener('touchend', LyricBSlPosition.touchedFn, {passive: true});

    // 移动端切换歌词显示
    document.getElementById('mobile-lyric').addEventListener('click', lyricDisplayFn);
} else {
    // 滚轮更新列表
    document.getElementById('music-list-container')
        .addEventListener('wheel', pd.wheelingToUpdateFn, {passive: true});

    v.LyricBox.addEventListener('wheel',
        event => wheelRollingLyrics(event.deltaY > 0 ? 2 : -2), {passive: true});
}

// 点击以展示搜索框
document.getElementById('search-ico').addEventListener('click', showSearchBarFn);

// 音频控制按钮
document.getElementById('cb-container').addEventListener('click', audioControlPa);

// 歌词微调
document.getElementsByClassName('lyric-calibration')[0].addEventListener('click', (event) => {
    const target = event.target.closest('img');
    if (!target) return;

    const offset = target.alt;
    if (offset) pd.LYRIC_ACTIONS.lyricOffset += Number(offset);
    else pd.LYRIC_ACTIONS.lyricOffset = 0;

    v.LyricOffsetEle.textContent = offset ? pd.LYRIC_ACTIONS.lyricOffset.toFixed(1) : '';
});

// 按键操作
document.addEventListener('keydown', keyControlFn);

// 页面刷新时记录
window.addEventListener('beforeunload', () => {
    removeEventListener('keydown', keyControlFn);

    // 记录随机播放剩余
    localStorage.setItem('_random_list', JSON.stringify(RAND_PLAYED_ARRAY));

    // 记录当前播放音频的播放时间
    const current = v.AudioEle.currentTime;
    if (!current) return;
    const duration = [pd.AUDIO_INDEX, current.toFixed(2)];

    localStorage.setItem('_played_time', JSON.stringify(duration));
}, {once: true});