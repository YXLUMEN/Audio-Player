import * as v from "./audio_player_var_8_20.js";
import baseFetch, {getPar} from "./post_methods_8_20.js";
import {debounce, isEmpty} from "./base_utilities_8_20.js";
import createAlert from "./base_page_8_20.js";

export {
    AudioIndex,
    MaxAudioCount,
    LyricActions,
}

/**
 * 存储当前播放的音乐序号,优先从地址栏获取,其次是本地存储
 * @type number
 * */
let AudioIndex = (() => {
    let num = Number(getPar('audio_index'));
    if (num <= 0) num = Number(localStorage.getItem('audio_index'));
    return num < 0 || !Number.isInteger(num) ? 0 : num;
})();

v.SearchInputBar.value = getPar('search');

// 后台音乐列表
let AudioObject = Object.create(null);

/**
 * 用于记录本地保存音频序号极值
 * @type {number[],null}
 * */
let AudioIndexRange = [];

let MaxAudioCount = 0;

const POST_DATA = (() => {
    const temp = Object.create(null);
    Object.assign(temp, {
        'audio_lists': 1,
        'audio_index': AudioIndex,
        'search_string': v.SearchInputBar.value.toString()
    });
    Object.preventExtensions(temp);
    return temp;
})();

// 初始化
updateData({init: true, newIndex: AudioIndex})
    .then(initAudio)
    .catch(() => createAlert('初始化失败', 'danger'));


/**
 * 从后台获取音乐列表;
 *
 * 注意,不要随意调用此函数, 您应该尽可能使用switchAudio
 * @param {IUpdateData,{}} opts
 * */
async function updateData(opts = {}) {
    const defaultOpts = {
        init: false,
        newIndex: 0,
        ...opts
    }

    // 检查
    if ((!defaultOpts.init && defaultOpts.newIndex >= MaxAudioCount) || defaultOpts.newIndex < 0) {
        AudioIndex = POST_DATA['audio_index'];
        throw RangeError('超出最大获取范围');
    }

    // 发送的信息
    POST_DATA['audio_index'] = defaultOpts.newIndex;
    POST_DATA['search_string'] = v.SearchInputBar.value.toString().trim();

    // 显示加载图标
    v.LoadingIco.style.display = 'block';

    // 后台获取
    const response = await baseFetch('/audio/audio_lists', {
        body: JSON.stringify(POST_DATA)
    });
    const json = await response.json();

    if (!json) {
        POST_DATA['audio_index'] = AudioIndex;
        throw Error('Fetch fail');
    }

    // 隐藏加载图标
    setTimeout(() => v.LoadingIco.style.display = 'none', 2000);

    // 更新所有全局信息, 并启动后续任务
    if (json['status'] !== 1009) {
        createAlert(json['msg'], 'danger');
        throw Error('Error fetching data');
    }

    Object.assign(AudioObject, json['audio_dict']);

    MaxAudioCount = Number(json['item_counts']);

    if (AudioIndexRange) {
        const tempArray = Object.keys(AudioObject);
        AudioIndexRange = tempArray.length === MaxAudioCount ? null : [Number(tempArray[0]), Number(tempArray.pop())];
        if (AudioIndex >= MaxAudioCount) AudioIndex = AudioIndexRange[1];
    }

    createChildLi(AudioObject).catch();
}

// 背景图片数量
const AllImgCount = 29;

let NewImgUrl = '';
let ImgNum = 0;

/**
 * @type {HTMLImageElement}
 * */
const TempImgEle = document.getElementById('pre-load');

TempImgEle.addEventListener('load', () => v.Body.style.backgroundImage = `url('${NewImgUrl}')`);

// 加载音乐数据
function initAudio() {
    // 本地保存当前Audio index
    localStorage.setItem('audio_index', AudioIndex.toString());

    // 加载图标
    v.ProgressLoading.style.display = 'block';

    // 设置背景图片
    NewImgUrl = `../img/audio/webp/audio-${ImgNum}.webp`;
    ImgNum = (ImgNum + 1) % AllImgCount;

    // 预加载图片
    TempImgEle.src = NewImgUrl;

    // 设置音频信息
    ;[v.Author.textContent, v.AudioTitle.textContent, v.Album.textContent] = [...AudioObject[AudioIndex]];
    v.LyricTitle.textContent = v.AudioTitle.textContent;

    v.AudioTitle.removeAttribute('class');
    if (v.AudioTitle.clientWidth >= v.TextContainer.clientWidth) v.AudioTitle.className = 'scroll-item';

    // 更改URL
    const href = new URL(window.location.href);
    const params = new URLSearchParams(href.search);
    params.set('audio_index', AudioIndex.toString());
    params.set('search', v.SearchInputBar.value.toString());
    href.search = params.toString();
    history.replaceState(null, '', href.href);

    // 设置音乐, 并在加载后播放
    v.AudioEle.src = `/audio/play/${AudioObject[AudioIndex][4]}`;
    v.AudioEle.load();
}

// 更新显示的音频信息
v.AudioEle.addEventListener('loadedmetadata', () => {
    // 重置进度条
    v.AudioTime.textContent = v.transTime(v.AudioEle.duration);
    v.AudioEle.currentTime = 0;
    v.updatePlayingProgress();

    // 重置歌词
    v.LyricUl.innerHTML = '<li>加载歌词中 . . .</li>';

    // 获取歌词
    resetLyricPos();
    fetchLyricFn();
});

/**
 * 查看本地是否存在音乐
 * @param {number} newIndex
 * */
function localAudioExistence(newIndex) {
    if (newIndex < 0 || newIndex >= MaxAudioCount) return false;
    return Object.hasOwn(AudioObject, newIndex);
}

/**
 * 切换音频
 * @param {number} newIndex
 * @param {ISwitchAudio,{}} opts
 * */
export function switchAudio(newIndex = 0, opts = {}) {
    v.AudioEle.pause();
    const defaultOpts = {
        newIndex: newIndex,
        refresh: true,
        scroll: true,
        ...opts
    }

    const switchFn = () => {
        AudioIndex = newIndex;
        initAudio();
        v.pauseToggle();
        highlightChosenSelection(defaultOpts.scroll);
    };

    if (defaultOpts.refresh && localAudioExistence(newIndex)) {
        switchFn();
        return;
    }

    // 更新列表
    updateData(defaultOpts)
        .then(() => {
            if (defaultOpts.refresh && localAudioExistence(newIndex)) switchFn();
        })
        .catch();
}

/**
 * 选中高亮
 * @param {boolean} scroll
 * */
export function highlightChosenSelection(scroll = true) {
    const selectedElement = document.getElementById(`li-${AudioIndex}`);
    if (!selectedElement) return;

    const activeElements = document.getElementsByClassName('all-list-li-activate');
    for (let element of activeElements) {
        element.classList.remove('all-list-li-activate');
    }

    if (scroll) {
        v.ListParentUl.scrollTo({top: selectedElement.offsetTop - 150, behavior: 'smooth'});
    }
    selectedElement.classList.add('all-list-li-activate');
}


/**
 * 创建音乐列表
 * @param {Object} obj 标准音频列表格式
 * */
async function createChildLi(obj) {
    if (v.ListParentUl.children.length === MaxAudioCount) return;

    if (isEmpty(obj)) {
        v.ListParentUl.textContent = '无结果';
        return;
    }

    const frag = document.createDocumentFragment();

    const paragraph = (value) => {
        const p = document.createElement('p');
        p.textContent = `${value[0]} - ${value[1]} - ${value[2]}.${value[3]}`;
        return p;
    }

    const entries = Object.entries(obj);
    const len = entries.length;
    let index = 0;

    const updateBatch = () => {
        // 每次更新20个元素
        const batchSize = 20;
        for (let i = 0; i < batchSize && index < len; i++, index++) {
            const [key, value] = entries[index];
            const liElement = document.createElement('li');
            liElement.setAttribute('id', `li-${key}`);
            liElement.appendChild(paragraph(value));
            frag.appendChild(liElement);
        }

        if (index < len) {
            requestAnimationFrame(updateBatch);
            return;
        }
        v.ListParentUl.textContent = '';
        v.ListParentUl.appendChild(frag);
        highlightChosenSelection(false);
    }
    requestAnimationFrame(updateBatch);
}

// 滚动音乐列表加载新音乐
const ScrollUConfig = (() => {
    const temp = Object.create(null);
    Object.assign(temp, {
        threshold: 20,
        beforeScrollTop: 0
    });
    Object.preventExtensions(temp);
    return temp;
})();

export const slideToUpdateFn = debounce(() => {
    if (!AudioIndexRange) return;

    const scrollTop = v.ListParentUl.scrollTop;
    const clientHeight = v.ListParentUl.offsetHeight;
    const scrollHeight = v.ListParentUl.scrollHeight;

    // 判断滚动方向
    const directionDown = ScrollUConfig.beforeScrollTop <= scrollTop;

    ScrollUConfig.beforeScrollTop = scrollTop;

    const [first, last] = AudioIndexRange;

    const shouldUpdateDown = directionDown &&
        (scrollTop + clientHeight + ScrollUConfig.threshold >= scrollHeight) &&
        (last + 1 < MaxAudioCount);

    const shouldUpdateUp = scrollTop <= ScrollUConfig.threshold && first - 1 >= 0;

    if (shouldUpdateDown) switchAudio(last + 1, {refresh: false, scroll: false});
    else if (shouldUpdateUp) switchAudio(first - 1, {refresh: false, scroll: false});
}, 100);

export const wheelingToUpdateFn = debounce((event) => {
    if (!AudioIndexRange) return;

    const scrollTop = v.ListParentUl.scrollTop;
    const clientHeight = v.ListParentUl.offsetHeight;
    const scrollHeight = v.ListParentUl.scrollHeight;

    const directionDown = event.deltaY > 0;

    const [first, last] = AudioIndexRange;

    const shouldUpdateDown = directionDown && last + 1 < MaxAudioCount && scrollTop + clientHeight + 20 >= scrollHeight;
    const shouldUpdateUp = !directionDown && first - 1 >= 0 && scrollTop === 0;

    if (shouldUpdateDown) switchAudio(last + 1, {refresh: false, scroll: false});
    else if (shouldUpdateUp) switchAudio(first - 1, {refresh: false, scroll: false});
}, 200);

// Enter 搜索激活
export const activeSearchFn = debounce((event) => {
    if (event.key !== 'Enter') return;
    const searchStr = v.SearchInputBar.value;

    if (searchStr === '') {
        updateData({init: true}).catch();
        return;
    }
    AudioIndex = 0;

    const filteredResults = Object.create(null);

    Object.entries(AudioObject).forEach(([key, value]) => {
        const thisHas = value.some((each, i) => {
            if (i > 2) return false;
            if (each.search(searchStr) !== -1) return true;
        });
        if (thisHas) filteredResults[Number(key)] = value;
    });

    if (Object.keys(filteredResults).length > 1) {
        v.ListParentUl.textContent = '';
        createChildLi(filteredResults).catch();
        return;
    }

    AudioObject = Object.create(null);
    updateData({init: true}).catch();
}, 500);

// 获取歌词
const fetchLyricFn = debounce(async () => {
    const response = await baseFetch('/audio/lyrics', {
        body: JSON.stringify({
            'audio_lyrics': true,
            'audio_hash': AudioObject[AudioIndex][4]
        })
    });

    let json;
    try {
        json = await response.json();
    } catch (err) {
        json = {"lyric": [{"text": "暂无歌词", "time": 0.0}]};
    }

    formatLyrics(json);
    highlightLine();
}, 3000);

const LyricActions = (() => {
    const temp = Object.create(null);
    Object.assign(temp, {
        currentLine: 0,
        centralPos: 0,
        lineOffset: -50,
        lyricOffset: 0,
        maxScrollHeight: 0,
        lyrArray: [],
        syncLyricEnable: true
    });
    Object.preventExtensions(temp);
    return temp;
})();

/**
 * 格式化歌词
 * @param {{}} lyrics
 * */
function formatLyrics(lyrics) {
    LyricActions.lyrArray = lyrics['lyric'];
    LyricActions.lyricOffset = lyrics['offset'] ?? 0;

    v.LyricOffsetEle.textContent = lyrics['offset']?.toFixed(1) ?? '';

    const lyrArray = LyricActions.lyrArray
    const length = lyrArray.length;

    const frag = document.createDocumentFragment();

    lyrArray.forEach(itemObj => {
        const li = document.createElement('li');
        const exText = itemObj['ex'] ?? '';

        li.innerHTML = `<span time="${itemObj['time']}">${itemObj['text']}<span>${exText}</span></span>`;
        frag.appendChild(li);
    });

    v.LyricUl.textContent = '';
    v.LyricUl.appendChild(frag);

    LyricActions.maxScrollHeight = (length - 1) * LyricActions.lineOffset;
}

// 高亮当前播放行
function highlightLine() {
    const childLi = v.LyricUl.getElementsByTagName('li');
    if (childLi.length <= 1) return;

    const {currentLine: current, centralPos: central, syncLyricEnable, lineOffset} = LyricActions;

    if (current > 0) {
        childLi[current - 1].className = 'near-line';
        if (childLi[current - 3]) childLi[current - 3].classList.remove('near-line');

        for (let i = 4; i--;) {
            const liElement = childLi[current + i];
            if (!liElement) break;
            liElement.classList.add('near-line');
        }
    }

    childLi[current].classList.add('highlight-line');

    if (syncLyricEnable && current > central) v.LyricUl.style.transform = `translateY(${(current - central) * lineOffset}px)`;
}

// 同步歌词
export function syncLyric() {
    const {currentLine, lyrArray, lyricOffset} = LyricActions;

    if (currentLine === lyrArray.length || lyrArray.length <= 1) return;

    const currentTime = v.AudioEle.currentTime;
    const lyrTime = Number(lyrArray[currentLine].time);

    if (lyrTime * 3 <= currentTime + lyricOffset) {
        significantLeapFn();
        return;
    }

    if (lyrTime <= currentTime + lyricOffset) {
        highlightLine();
        LyricActions.currentLine += 1;
    }
}

// 重置滚动
function resetLyricPos() {
    const highLighted = document.querySelector('.highlight-line');
    highLighted?.removeAttribute('class');
    v.LyricUl.style.transform = 'translateY(0)';
    LyricActions.currentLine = 0;
}

// 跨度较大时快速跳转歌词
export const significantLeapFn = debounce(significantLeap, 100);

function significantLeap() {
    LyricActions.syncLyricEnable = true;

    const {lyrArray, currentLine, centralPos} = LyricActions;
    const length = lyrArray.length;
    if (length <= 1) return;

    const currentTime = v.AudioEle.currentTime;
    const liElements = v.LyricUl.children;

    if (liElements) {
        const startLine = currentLine - 4;
        const endLine = currentLine + 4;
        for (let i = startLine; i < endLine; i++) liElements.item(i)?.classList.remove('highlight-line', 'near-line');
    }

    if (lyrArray[1].time >= currentTime) {
        v.LyricUl.style.transform = 'translateY(0)';
        LyricActions.currentLine = 0;
        highlightLine();
        return;
    }

    for (let i = 0; i < length; i++) {
        if (lyrArray[i].time <= currentTime && (i === length - 1 || lyrArray[i + 1].time > currentTime)) {
            LyricActions.currentLine = i;
            if (i < centralPos * 2) v.LyricUl.style.transform = 'translateY(0)';
            break;
        }
    }

    highlightLine();
    v.updatePlayingProgress();
}
