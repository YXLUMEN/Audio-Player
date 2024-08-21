import * as pd from "./audio_player_data_8_20.js";
import * as v from "./audio_player_var_8_20.js";
import {
    debounce,
    generateUniqueRandomNumbers,
    getSlideDirection,
    isMobile,
    throttleTimeOut
} from "./base_utilities_8_20.js";
import createAlert, {createConfirm} from "./base_page_8_20.js";
import baseFetch from "./post_methods_8_20.js";

;(async () => {
    try {
        const res = await baseFetch('/audio/history');
        const json = await res.json();
        const duration = JSON.parse(json['history_duration'] ?? 'null');

        if (!duration ||
            duration[0] === pd.AudioIndex ||
            !await createConfirm('是否同步其他设备上最新的播放记录?')) return;

        localStorage.setItem('_played_time', JSON.stringify(duration));
        pd.switchAudio(Number(duration[0]), {init: true});

        v.AudioEle.addEventListener('loadedmetadata', replayFromPer, {once: true});
    } catch (e) {
        console.error('Error fetching or processing audio history:', e);
    }
})();

// 上一次退出时的播放进度
function replayFromPer() {
    const playedHistory = JSON.parse(localStorage.getItem('_played_time') ?? 'null');

    if (!playedHistory || playedHistory[0] !== pd.AudioIndex) {
        localStorage.removeItem('_played_time');
        return;
    }

    const playedTime = Number(playedHistory[1]);
    if (playedTime <= 0 || playedTime >= v.AudioEle.duration) return;

    v.AudioEle.currentTime = playedTime;
    v.updatePlayingProgress();
}

// 播放模式设置
let PlayMode = 0;

function modeToggle() {
    PlayMode = (PlayMode + 1) % 3;
    v.PlayMode.src = `../img/audio/ico/play_mode_${PlayMode}.svg`;
}

/**
 * 随机播放已播放列表
 * @type {number[]}
 * */
let RandPlayedArray = null;

/**
 * 播放模式
 * @param {number} delta
 * */
function playingMode(delta = 1) {
    const max = pd.MaxAudioCount;

    // 列表循环
    if (PlayMode === 0) {
        const next = (pd.AudioIndex + delta) % max;
        return next < 0 ? max - 1 : next;
    }

    //单曲循环
    if (PlayMode === 1) return pd.AudioIndex;

    // 随机播放
    if (PlayMode === 2) {
        const random = RandPlayedArray.pop();
        if (RandPlayedArray.length % 8 === 0) localStorage.setItem('_random_list', JSON.stringify(RandPlayedArray));

        return random !== undefined ? random : (() => {
            RandPlayedArray = generateUniqueRandomNumbers(max);
            return RandPlayedArray.pop();
        })();
    }
    throw new Error('未知的播放模式');
}

// 更新进度条信号量
let updateProgressSignal = true;

// 延迟更改音乐播放进度
const applyAudioLeap = debounce(rate => {
    v.AudioEle.currentTime = v.AudioEle.duration * rate;
    updateProgressSignal = true
}, 200);

// 拖动进度条更改音乐进度
const progressLeapFn = throttleTimeOut(event => {
    // 只有音乐开始播放后才可以调节,已经播放过但暂停了的也可以
    if (event.pressure === 0 || v.AudioEle.currentTime === 0) return;
    updateProgressSignal = false;

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
    v.AudioList.style.display = 'flex';
    v.CloseList.style.display = 'flex';
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
const reEnableScrollLyric = debounce(() => pd.LyricActions.syncLyricEnable = true, 1E4);

function wheelRollingLyrics(direction = -2) {
    pd.LyricActions.syncLyricEnable = false;

    const currentTransformValue = Number(v.LyricUl.style.transform.match(/-?\d+/) ?? -40);
    let deltaLine = direction * pd.LyricActions.lineOffset + currentTransformValue;

    if (deltaLine > 0) deltaLine = 0;
    if (deltaLine <= pd.LyricActions.maxScrollHeight) deltaLine = pd.LyricActions.maxScrollHeight;

    v.LyricUl.style.transform = `translateY(${deltaLine}px)`;
    reEnableScrollLyric();
}

// 移动端滑动
const LyricBSlPosition = (() => {
    const temp = Object.create(null);
    Object.assign(temp, {
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
    return temp;
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
const ControlFnMap = new Map([
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
    target && ControlFnMap.get(target.getAttribute('id'))?.();
}

// 键盘操作
const keyControlFn = throttleTimeOut(event => ControlFnMap.get(event.code)?.(), 100);

let RetryCount = 0;
let FatalCount = 0;

// 加载出错重试
function audioErrorHandle() {
    if (FatalCount > 5) {
        createAlert('无法重载,请检查网络连接并刷新', 'danger');
        throw new WebTransportError('连接失败');
    }

    RetryCount += 1;
    if (RetryCount <= 3) {
        setTimeout(() => {
            createAlert(`尝试重载... ${RetryCount}/3`, 'message');
            v.AudioEle.load();
            v.pauseToggle();
            pd.highlightChosenSelection();
        }, 2500);
        return;
    }

    FatalCount += 1;

    // 跳过
    pd.switchAudio((pd.AudioIndex + 1) % pd.MaxAudioCount);
    createAlert('无法加载此文件,已跳过', 'warning');
    RetryCount = 0;
}

// 页面刷新时保存播放进度
v.AudioEle.addEventListener('loadedmetadata', replayFromPer, {once: true});

// 音频更新同步显示
v.AudioEle.addEventListener('timeupdate', () => {
    pd.syncLyric();
    updateProgressSignal && v.updatePlayingProgress();
});

// 音频跳跃时
v.AudioEle.addEventListener('seeked', pd.significantLeapFn);

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
v.ListParentUl.addEventListener('click', event => {
    const target = event.target.closest('li');
    if (!target) return;
    pd.switchAudio(Number(target.getAttribute('id').split('-')[1]));
});

// 关闭列表
v.CloseList.addEventListener('click', closeListBoard);

// 点击歌词行跳转
v.LyricUl.addEventListener('click', event => {
    if (pd.LyricActions.lyrArray.length <= 1) return;
    const target = event.target.closest('span');
    if (!target) return;
    v.AudioEle.currentTime = Number(target.getAttribute('time')) + .01;
});

// 监听搜索框按键事件
v.SearchInputBar.addEventListener('keydown', e => {
    e.stopPropagation();
    pd.activeSearchFn(e);
});

// 在切换模式时加载本地随机列表
v.PlayMode.addEventListener('load', () => {
    if (RandPlayedArray) return;
    try {
        const tempArray = JSON.parse(localStorage.getItem('_random_list'));
        RandPlayedArray = Array.isArray(tempArray) ? tempArray : [];
    } catch (e) {
        RandPlayedArray = [];
    }
}, {once: true});

// 用 if else 太丑了 qwq
const mobile = isMobile();

// 滑动更新列表
mobile && v.ListParentUl.addEventListener('scroll', pd.slideToUpdateFn, {passive: true});

// 歌词滚动
mobile && v.LyricBox.addEventListener('touchstart', LyricBSlPosition.touchStartFn, {passive: true});

mobile && v.LyricBox.addEventListener('touchend', LyricBSlPosition.touchedFn, {passive: true});

// 点击下1/3处切换歌词显示
mobile && document.getElementsByClassName('audio-box')[0].addEventListener('click', lyricDisplayFn);

// 滚轮更新列表
!mobile && document.getElementById('music-list-container')
    .addEventListener('wheel', pd.wheelingToUpdateFn, {passive: true});

!mobile && v.LyricBox.addEventListener('wheel',
    event => wheelRollingLyrics(event.deltaY > 0 ? 2 : -2), {passive: true});

// 点击以展示搜索框
document.getElementById('search-ico').addEventListener('click', showSearchBarFn);

// 音频控制按钮
document.getElementById('cb-container').addEventListener('click', audioControlPa);

// 歌词微调
document.getElementsByClassName('lyric-calibration')[0].addEventListener('click', event => {
    const target = event.target.closest('img');
    if (!target) return;

    const offset = target.alt;
    if (offset) pd.LyricActions.lyricOffset += Number(offset);
    else pd.LyricActions.lyricOffset = 0;

    v.LyricOffsetEle.textContent = offset ? pd.LyricActions.lyricOffset.toFixed(1) : '';
});

// 按键操作
document.addEventListener('keydown', keyControlFn);

// 页面刷新时记录
window.addEventListener('beforeunload', () => {
    removeEventListener('keydown', keyControlFn);

    // 记录随机播放剩余
    localStorage.setItem('_random_list', JSON.stringify(RandPlayedArray));

    // 记录当前播放音频的播放时间
    const current = v.AudioEle.currentTime;
    if (!current) return;
    const duration = [pd.AudioIndex, current.toFixed(2)];

    localStorage.setItem('_played_time', JSON.stringify(duration));

    baseFetch('/audio/history', {
        body: JSON.stringify({'audio_index': duration}),
        keepalive: true
    }).catch();
}, {once: true});