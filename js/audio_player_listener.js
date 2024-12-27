import * as d from "./audio_player_data.js";
import * as v from "./audio_player_var.js";
import {debounce, generateUniqueRandomNumbers, getSlideDirection, isMobile, throttleTimeOut} from "./utilities.js";
import createAlert, {createConfirm, toggleClass} from "./page.js";


;(async () => {
    try {
        const res = await (await import('./post_methods.js')).default('/history', {
            body: JSON.stringify({'get_history': 1})
        });
        const json = await res.json();
        const duration = JSON.parse(json['history_duration'] || 'null');

        if (!duration ||
            duration[0] === d.AUDIO_INDEX ||
            !await createConfirm('是否同步其他设备上最新的播放记录?', {timeout: 8000})) return;

        localStorage.setItem('_played_time', JSON.stringify(duration));
        d.switchAudio(Number(duration[0]), {init: true});

        v.AudioEle.addEventListener('loadedmetadata', replayFromPer, {once: true});
    } catch (err) {
        console.error('Error fetching or processing audio history:', err);
    }
})();

// 上一次退出时的播放进度
function replayFromPer() {
    const playedHistory = JSON.parse(localStorage.getItem('_played_time') || 'null');

    if (!playedHistory || playedHistory[0] !== d.AUDIO_INDEX) {
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
    const max = d.MAX_AUDIO_COUNT;

    // 列表循环
    if (PLAY_MODE === 0) {
        const next = (d.AUDIO_INDEX + delta) % max;
        return next < 0 ? max - 1 : next;
    }

    //单曲循环
    if (PLAY_MODE === 1) return d.AUDIO_INDEX;

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
    if (!event?.pressure || !v.AudioEle?.currentTime) return;
    UPDATE_PROGRESS_SIGNAL = false;

    const pgsWidth = parseFloat(window.getComputedStyle(v.ProgressTotal).width);
    const rate = Math.min(Math.max(event.offsetX / pgsWidth, 0), 1);
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

function showSelections() {
    v.MoreSelectionsContainer.classList.add('show-container');
    v.MoreSelectionsContainer.classList.remove('hide-container');
    v.MoreSelectionsContainer.style.display = 'block';
}

function closeSelections() {
    v.MoreSelectionsContainer.classList.remove('show-container');
    v.MoreSelectionsContainer.classList.add('hide-container');
}

//显示歌词
const lyricDisplayFn = throttleTimeOut(() => {
    const isLyricBoxHidden = v.LyricBox.classList.contains('hide');
    toggleClass(v.TextContainer, [isLyricBoxHidden ? 'show' : 'hide'], [isLyricBoxHidden ? 'hide' : 'show']);
    toggleClass(v.LyricBox, [isLyricBoxHidden ? 'hide' : 'show'], [isLyricBoxHidden ? 'show' : 'hide']);
    toggleClass(v.LyricTitle, [isLyricBoxHidden ? 'hide' : 'show'], [isLyricBoxHidden ? 'show' : 'hide']);

    if (isLyricBoxHidden) {
        v.Body.classList.add('show-lyric');
    } else {
        v.Body.classList.remove('show-lyric');
    }
}, 600);


// 重启歌词同步
const reEnableScrollLyric = debounce(() => {
    d.LYRIC_ACTIONS.syncLyricEnable = true;
    d.significantLeapFn();
}, 1E4);

function wheelRollingLyrics(direction = -2) {
    d.LYRIC_ACTIONS.syncLyricEnable = false;

    const currentTransformValue = Number(v.LyricUl.style.transform.match(/-?\d+/)?.[0] || -40);
    let deltaLine = direction * d.LYRIC_ACTIONS.lineOffset + currentTransformValue;

    deltaLine = Math.min(deltaLine, 0);
    deltaLine = Math.max(deltaLine, d.LYRIC_ACTIONS.maxScrollHeight);

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
    if (v.SearchInputBar.classList.contains('show')) toggleClass(v.SearchInputBar, ['show'], ['hide']);
    else toggleClass(v.SearchInputBar, ['hide'], ['show']);
}, 300);

/**
 * 操作映射
 * @type {Map<string, NewableFunction>}
 * */
const CONTROL_MAP = new Map([
    ['Space', v.pauseToggle],
    ['ArrowRight', () => d.switchAudio(playingMode(1))],
    ['ArrowLeft', () => d.switchAudio(playingMode(-1))],
    ['ArrowUp', () => wheelRollingLyrics(-4)],
    ['ArrowDown', () => wheelRollingLyrics(4)],
    ['KeyR', modeToggle],
    ['KeyM', v.setMuted],
    ['KeyH', () => d.highlightChosenSelection()],
    ['KeyS', showSearchBarFn],
    ['KeyL', lyricDisplayFn],
    ['Escape', () => {
        closeListBoard();
        closeSelections()
    }],
    ['lyric', lyricDisplayFn],
    ['playMode', modeToggle],
    ['skipForward', () => d.switchAudio(playingMode(-1), {scroll: false})],
    ['playPause', v.pauseToggle],
    ['skipBackward', () => d.switchAudio(playingMode(1), {scroll: false})],
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
const keyControlFn = throttleTimeOut(event => CONTROL_MAP.get(event.code)?.(), 100);

const audioErrorHandle = (() => {
    const _MAX_RETRY = 3;
    const _MAX_FATAL = 6;
    const _RETRY_DELAY = 4000;

    let retryCount = 0;
    let fatalCount = 0;

    const retry = () => {
        setTimeout(() => {
            createAlert(`尝试重载... ${retryCount}/${_MAX_RETRY}`);
            v.AudioEle.load();
            v.pauseToggle();
            d.highlightChosenSelection();
        }, _RETRY_DELAY);
    };

    return () => {
        console.error(fatalCount);
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
        d.switchAudio((d.AUDIO_INDEX + 1) % d.MAX_AUDIO_COUNT);
        createAlert('无法加载此文件,已跳过', 'warning');
        retryCount = 0;
    };
})();

// 监听暂停已切换图标
v.AudioEle.addEventListener('pause', () => {
    if (!v.AudioEle.paused) return;
    v.Pause.classList.remove('icon-pause');
    v.Pause.classList.add('icon-play');
});

// 页面刷新时保存播放进度
v.AudioEle.addEventListener('loadedmetadata', replayFromPer, {once: true});

// 音频更新同步显示
v.AudioEle.addEventListener('timeupdate', () => {
    d.syncLyric();
    if (UPDATE_PROGRESS_SIGNAL) v.updatePlayingProgress();
});

// 音频跳跃时
v.AudioEle.addEventListener('seeked', () => {
    d.LYRIC_ACTIONS.syncLyricEnable = true;
    d.significantLeapFn();
});

// 监听音乐文件加载完成
v.AudioEle.addEventListener('canplaythrough', () => {
    if (v.AudioEle.readyState === 4) v.ProgressLoading.style.display = 'none';
});

// 音频结束后下一曲
v.AudioEle.addEventListener('ended', () => d.switchAudio(playingMode(1), {scroll: false}));

// 音频出错监听 脱机下默认关闭
// v.AudioEle.addEventListener('error', audioErrorHandle);

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
    d.switchAudio(Number(target.getAttribute('id').split('-')[1]));
});

// 关闭列表
v.CloseList.addEventListener('click', closeListBoard);

// 点击歌词行跳转
v.LyricUl.addEventListener('click', (event) => {
    if (d.LYRIC_ACTIONS.lyrArray.length <= 1) return;
    const target = event.target.closest('span');
    if (!target) return;
    const leap = Number(target.getAttribute('time'));
    if (Number.isNaN(leap)) return;
    v.AudioEle.currentTime = leap;
});

// 监听搜索框按键事件
v.SearchInputBar.addEventListener('keydown', (event) => {
    event.stopPropagation();
    d.activeSearchFn(event);
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

// 本地文件播放
document.getElementById('local-audio').addEventListener('input', (e) => {
    let audioFile = e.target.files[0];
    if (!audioFile) return;
    e.target.previousElementSibling.textContent = audioFile.name;

    let audioURL = URL.createObjectURL(audioFile);
    v.AudioEle.src = audioURL;
    v.pauseToggle();
    ;[v.Author.textContent, v.AudioTitle.textContent, v.Album.textContent] = ['', audioFile.name, ''];
    audioFile = null;

    v.AudioEle.addEventListener('durationchange', function localAudio() {
        if (v.AudioEle.src === audioURL) return;
        URL.revokeObjectURL(audioURL);
        audioURL = null;
        v.AudioEle.removeEventListener('durationchange', localAudio);
    });
});

// 展示选项框
document.getElementById('more').addEventListener('click', () => {
    v.MoreSelectionsContainer.classList.contains('show-container') ? closeSelections() : showSelections();
});

// 点击以展示搜索框
document.getElementById('search-ico').addEventListener('click', showSearchBarFn);

// 音频控制按钮
document.getElementById('cb-container').addEventListener('click', audioControlPa);

// 歌词微调
document.getElementsByClassName('lyric-calibration')[0].addEventListener('click', (event) => {
    const target = event.target.closest('img');
    if (!target) return;

    const offset = target.alt;
    if (offset) d.LYRIC_ACTIONS.lyricOffset += Number(offset);
    else d.LYRIC_ACTIONS.lyricOffset = 0;

    v.LyricOffsetEle.textContent = offset ? d.LYRIC_ACTIONS.lyricOffset.toFixed(1) : '';
});

// 按键操作
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.stopPropagation();
        e.preventDefault();
    }
    keyControlFn(e);
});

// 初始化频谱分析
document.getElementsByName('toggle-fft')[0].addEventListener('change', () => {
    const resizeDSD = debounce(() => {
        const width = window.innerWidth;
        v.DSD.width = width;
        v.DSD.setAnalyser({
            fftSize: width >= 650 ? 256 : 128
        });
    }, 500);

    v.DSD.initAudioSource(v.AudioEle);
    v.DSD.setAnalyser();
    v.switchDrawMode();
    resizeDSD();

    // 频谱图操作
    v.MoreSelections[0].addEventListener('click', (e) => {
        const target = e.target.closest('input');
        if (!target) return;
        const name = target.getAttribute('name');
        switch (name) {
            case 'toggle-fft':
                return v.toggleDraw(e);
            case 'draw-mode':
                return v.switchDrawMode();
            case 'change-fftSize-btn':
                return v.changeFFTSize();
            case 'change-draw-interval-btn':
                return v.changeDrawInterval();
            case 'min-decibels-btn':
            case 'max-decibels-btn':
                return v.changeDecibels();
        }
    });
    // 自动重绘
    window.addEventListener('resize', resizeDSD);
}, {once: true});

// 屏幕锁, 用于屏幕常亮
let WAKE_LOCK = null;

const requestWakeLock = async () => {
    try {
        WAKE_LOCK = await navigator.wakeLock.request('screen');
        console.debug('Wake Lock is active!');
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
};

// 请求唤醒锁
requestWakeLock().catch(console.error);

// 监听文档可见性变, 重新获取唤醒锁
document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && WAKE_LOCK !== null) await requestWakeLock();
});

;((mobile) => {
    const savePlaybackData = () => {
        // 记录随机播放剩余
        localStorage.setItem('_random_list', JSON.stringify(RAND_PLAYED_ARRAY));

        // 记录当前播放音频的播放时间
        const current = v.AudioEle.currentTime;
        if (!current) return;
        const duration = [d.AUDIO_INDEX, current.toFixed(2)];

        localStorage.setItem('_played_time', JSON.stringify(duration));

        // 考虑到有些设备禁止了sendBeacon
        import('./post_methods.js').then(module => module.default('/audio/history', {
            body: JSON.stringify({'audio_index': duration}),
            keepalive: true
        }).catch());
    };

    if (mobile) {
        // 滑动更新列表
        v.ListParentUl.addEventListener('scroll', d.slideToUpdateFn, {passive: true});

        // 歌词滚动
        v.LyricBox.addEventListener('touchstart', LyricBSlPosition.touchStartFn, {passive: true});

        v.LyricBox.addEventListener('touchend', LyricBSlPosition.touchedFn, {passive: true});

        // 移动端切换歌词显示
        document.getElementById('mobile-lyric').addEventListener('click', lyricDisplayFn);

        // 一般只有移动端不支持pagehide
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') return;
            savePlaybackData();
        });
        return;
    }
    // 滚轮更新列表
    document.getElementById('music-list-container').addEventListener('wheel', d.wheelingToUpdateFn,
        {passive: true});

    v.LyricBox.addEventListener('wheel', (event) =>
        wheelRollingLyrics(event.deltaY > 0 ? 2 : -2), {passive: true});

    // 页面卸载时记录
    window.addEventListener('beforeunload', () => {
        savePlaybackData();
        v.DSD.dispose();
    }, {once: true});
})(isMobile());