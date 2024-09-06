import * as v from "./audio_player_var.js";
import baseFetch, {getPar} from "post_methods.js";
import {debounce, isEmpty} from "utilities.js";
import createAlert from "page.js";

/**
 * 存储当前播放的音乐序号,优先从地址栏获取,其次是本地存储
 * @type number
 * */
let AUDIO_INDEX = (() => {
    let num = Number(getPar('audio_index'));
    if (num <= 0) num = Number(localStorage.getItem('audio_index'));
    return num < 0 || !Number.isInteger(num) ? 0 : num;
})();

v.SearchInputBar.value = getPar('search');

/**
 * 后台音乐列表, 如果想在本地运行, 除了实现所有路由, 还可以创建一些伪数据
 *
 *     const AUDIO_OBJECT = {
 *          "0": [ // audio index
 *              "author",
 *              "title",
 *              "album",
 *              "mp3", // audio format
 *              "hashes" // like d30b7a3c06d2b
 *          ]
 *      }
 * */
let AUDIO_OBJECT = Object.create(null);

/**
 * 用于记录本地保存音频序号极值
 * @type {number[],null}
 * */
let AUDIO_INDEX_RANGE = [];

let MAX_AUDIO_COUNT = 0;

const POST_DATA = (() => {
    const temp = Object.create(null);
    Object.assign(temp, {
        'audio_lists': 1,
        'audio_index': AUDIO_INDEX,
        'search_string': v.SearchInputBar.value.toString()
    });
    Object.preventExtensions(temp);
    return temp;
})();

// 初始化
updateData({init: true, newIndex: AUDIO_INDEX})
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
    };

    // 检查
    if ((!defaultOpts.init && defaultOpts.newIndex >= MAX_AUDIO_COUNT) || defaultOpts.newIndex < 0) {
        AUDIO_INDEX = POST_DATA['audio_index'];
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
        POST_DATA['audio_index'] = AUDIO_INDEX;
        throw Error('Fetch fail');
    }

    // 隐藏加载图标
    setTimeout(() => v.LoadingIco.style.display = 'none', 2000);

    // 更新所有全局信息, 并启动后续任务
    if (json['status'] !== 1009) {
        createAlert(json['msg'], 'danger');
        throw Error('Error fetching data');
    }

    Object.assign(AUDIO_OBJECT, json['audio_dict']);

    MAX_AUDIO_COUNT = Number(json['item_counts']);

    if (AUDIO_INDEX_RANGE) {
        const tempArray = Object.keys(AUDIO_OBJECT);
        AUDIO_INDEX_RANGE = tempArray.length === MAX_AUDIO_COUNT ? null : [Number(tempArray[0]), Number(tempArray.pop())];
        if (AUDIO_INDEX >= MAX_AUDIO_COUNT) AUDIO_INDEX = AUDIO_INDEX_RANGE[1];
    }

    createChildLi(AUDIO_OBJECT).catch();
}

// 背景图片数量
const ALL_IMG_COUNT = 29;

let NEW_IMG_URL = '';
let IMG_INDEX = 0;

/**
 * @type {HTMLImageElement}
 * */
const TempImgEle = document.getElementById('pre-load');

TempImgEle.addEventListener('load', () => v.Body.style.backgroundImage = `url('${NEW_IMG_URL}')`);

// 加载音乐数据
function initAudio() {
    // 本地保存当前Audio index
    localStorage.setItem('audio_index', AUDIO_INDEX.toString());

    // 加载图标
    v.ProgressLoading.style.display = 'block';

    // 设置背景图片
    NEW_IMG_URL = `/static/img/audio/webp/audio-${IMG_INDEX}.webp`;
    IMG_INDEX = (IMG_INDEX + 1) % ALL_IMG_COUNT;

    // 预加载图片
    TempImgEle.src = NEW_IMG_URL;

    // 设置音频信息
    ;[v.Author.textContent, v.AudioTitle.textContent, v.Album.textContent] = [...AUDIO_OBJECT[AUDIO_INDEX]];
    v.LyricTitle.textContent = v.AudioTitle.textContent;

    v.AudioTitle.removeAttribute('class');
    if (v.AudioTitle.clientWidth >= v.TextContainer.clientWidth) v.AudioTitle.className = 'scroll-item';

    // 更改URL
    const href = new URL(window.location.href);
    const params = new URLSearchParams(href.search);
    params.set('audio_index', AUDIO_INDEX.toString());
    params.set('search', v.SearchInputBar.value.toString());
    href.search = params.toString();
    history.replaceState(null, '', href.href);

    // 设置音乐, 并在加载后播放
    v.AudioEle.src = `/audio/play/${AUDIO_OBJECT[AUDIO_INDEX][4]}`;
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
    resetLyricPos();
    // 获取歌词
    fetchLyricFn();
});

/**
 * 查看本地是否存在音乐
 * @param {number} newIndex
 * */
function localAudioExistence(newIndex) {
    if (newIndex < 0 || newIndex >= MAX_AUDIO_COUNT) return false;
    return Object.hasOwn(AUDIO_OBJECT, newIndex);
}

/**
 * 切换音频
 * @param {number} newIndex
 * @param {ISwitchAudio,{}} opts
 * */
function switchAudio(newIndex = 0, opts = {}) {
    v.AudioEle.pause();
    const defaultOpts = {
        newIndex: newIndex,
        refresh: true,
        scroll: true,
        ...opts
    };

    const switchFn = () => {
        AUDIO_INDEX = newIndex;
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
function highlightChosenSelection(scroll = true) {
    const selectedElement = document.getElementById(`li-${AUDIO_INDEX}`);
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
    if (v.ListParentUl.children.length === MAX_AUDIO_COUNT) return;

    if (isEmpty(obj)) {
        v.ListParentUl.textContent = '无结果';
        return;
    }

    const frag = document.createDocumentFragment();

    const paragraph = (value) => {
        const p = document.createElement('p');
        p.textContent = `${value[0]} - ${value[1]} - ${value[2]}.${value[3]}`;
        return p;
    };

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
    };
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

const slideToUpdateFn = debounce(() => {
    if (!AUDIO_INDEX_RANGE) return;

    const scrollTop = v.ListParentUl.scrollTop;
    const clientHeight = v.ListParentUl.offsetHeight;
    const scrollHeight = v.ListParentUl.scrollHeight;

    // 判断滚动方向
    const directionDown = ScrollUConfig.beforeScrollTop <= scrollTop;

    ScrollUConfig.beforeScrollTop = scrollTop;

    const [first, last] = AUDIO_INDEX_RANGE;

    const shouldUpdateDown = directionDown &&
        (scrollTop + clientHeight + ScrollUConfig.threshold >= scrollHeight) &&
        (last + 1 < MAX_AUDIO_COUNT);

    const shouldUpdateUp = scrollTop <= ScrollUConfig.threshold && first - 1 >= 0;

    if (shouldUpdateDown) switchAudio(last + 1, {refresh: false, scroll: false});
    else if (shouldUpdateUp) switchAudio(first - 1, {refresh: false, scroll: false});
}, 100);

const wheelingToUpdateFn = debounce((event) => {
    if (!AUDIO_INDEX_RANGE) return;

    const scrollTop = v.ListParentUl.scrollTop;
    const clientHeight = v.ListParentUl.offsetHeight;
    const scrollHeight = v.ListParentUl.scrollHeight;

    const directionDown = event.deltaY > 0;

    const [first, last] = AUDIO_INDEX_RANGE;

    const shouldUpdateDown = directionDown && last + 1 < MAX_AUDIO_COUNT && scrollTop + clientHeight + 20 >= scrollHeight;
    const shouldUpdateUp = !directionDown && first - 1 >= 0 && scrollTop === 0;

    if (shouldUpdateDown) switchAudio(last + 1, {refresh: false, scroll: false});
    else if (shouldUpdateUp) switchAudio(first - 1, {refresh: false, scroll: false});
}, 200);

// Enter 搜索激活
const activeSearchFn = debounce((event) => {
    if (event.key !== 'Enter') return;
    const searchStr = v.SearchInputBar.value;

    if (searchStr === '') {
        updateData({init: true}).catch();
        return;
    }
    AUDIO_INDEX = 0;

    const filteredResults = Object.create(null);

    Object.entries(AUDIO_OBJECT).forEach(([key, value]) => {
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

    AUDIO_OBJECT = Object.create(null);
    updateData({init: true}).catch();
}, 500);

/**
 * 获取歌词
 *
 *      {"lyric": [
 *      {"text": "text", "time": 0.0},
 *      {"text": "text", "time": 1.0}
 *      ],
 *      "offset": 1.0 // 可选的初始偏移量
 *      }
 * */
const fetchLyricFn = debounce(async () => {
    const response = await baseFetch('/audio/lyrics', {
        body: JSON.stringify({
            'audio_lyrics': true,
            'audio_hash': AUDIO_OBJECT[AUDIO_INDEX][4]
        }),
        ignore_err: [404]
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

const LYRIC_ACTIONS = (() => {
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
 *
 * 具体的歌词格式可以查看我的另一个项目
 *
 * https://github.com/YXLUMEN/Lyric-to-Json
 *
 * */
function formatLyrics(lyrics) {
    const {lyric, offset = 0} = lyrics;
    LYRIC_ACTIONS.lyrArray = lyric;
    LYRIC_ACTIONS.lyricOffset = offset;

    v.LyricOffsetEle.textContent = offset.toFixed(1) || '';

    const frag = document.createDocumentFragment();

    lyric.forEach(({time, text, ex = ''}) => {
        const li = document.createElement('li');
        li.innerHTML = `<span time="${time}">${text}<span>${ex}</span></span>`;
        frag.appendChild(li);
    });

    v.LyricUl.textContent = '';
    v.LyricUl.appendChild(frag);

    LYRIC_ACTIONS.maxScrollHeight = (lyric.length - 1) * LYRIC_ACTIONS.lineOffset;
}

// 重置滚动
function resetLyricPos() {
    const highLighted = document.querySelector('.highlight-line');
    highLighted?.removeAttribute('class');
    v.LyricUl.style.transform = 'translateY(0)';
    LYRIC_ACTIONS.currentLine = 0;
}

// 高亮当前播放行
function highlightLine() {
    const childLi = v.LyricUl.getElementsByTagName('li');
    if (childLi.length <= 1) return;

    const {currentLine, centralPos, syncLyricEnable, lineOffset} = LYRIC_ACTIONS;

    if (currentLine > 0) {
        childLi[currentLine - 1].className = 'near-line';
        if (childLi[currentLine - 3]) childLi[currentLine - 3].classList.remove('near-line');

        for (let i = 4; i--;) {
            const liElement = childLi[currentLine + i];
            if (!liElement) break;
            liElement.classList.add('near-line');
        }
    }

    childLi[currentLine].classList.add('highlight-line');

    if (syncLyricEnable && currentLine > centralPos) {
        v.LyricUl.style.transform = `translateY(${(currentLine - centralPos) * lineOffset}px)`;
    }
}

// 同步歌词
function syncLyric() {
    const {currentLine, lyrArray, lyricOffset} = LYRIC_ACTIONS;

    if (currentLine === lyrArray.length || lyrArray.length <= 1) return;

    const currentTime = v.AudioEle.currentTime;
    const lyrTime = Number(lyrArray[currentLine].time);

    if (lyrTime * 3 <= currentTime + lyricOffset) {
        significantLeapFn();
        return;
    }

    if (lyrTime <= currentTime + lyricOffset) {
        highlightLine();
        LYRIC_ACTIONS.currentLine += 1;
    }
}

// 跨度较大时快速跳转歌词
const significantLeapFn = debounce(() => {
    const {lyrArray, currentLine, centralPos} = LYRIC_ACTIONS;
    const length = lyrArray.length;
    if (length <= 1) return;

    const currentTime = v.AudioEle.currentTime;
    const liElements = v.LyricUl.children;

    if (liElements) {
        const startLine = Math.max(currentLine - 4, 0);
        const endLine = Math.min(currentLine + 4, length);
        for (let i = startLine; i < endLine; i++) {
            liElements.item(i)?.classList.remove('highlight-line', 'near-line');
        }
    }

    if (lyrArray[1].time >= currentTime) {
        if (LYRIC_ACTIONS.syncLyricEnable) v.LyricUl.style.transform = 'translateY(0)';
        LYRIC_ACTIONS.currentLine = 0;
        highlightLine();
        return;
    }

    for (let i = 0; i < length; i++) {
        if (lyrArray[i].time <= currentTime && (i === length - 1 || lyrArray[i + 1].time > currentTime)) {
            LYRIC_ACTIONS.currentLine = i;
            if (LYRIC_ACTIONS.syncLyricEnable && i < centralPos * 2) v.LyricUl.style.transform = 'translateY(0)';
            break;
        }
    }

    highlightLine();
    v.updatePlayingProgress();
}, 100);


export {
    AUDIO_INDEX,
    MAX_AUDIO_COUNT,
    LYRIC_ACTIONS,
    significantLeapFn,
    activeSearchFn,
    wheelingToUpdateFn,
    slideToUpdateFn,
    switchAudio,
    syncLyric,
    highlightChosenSelection
}