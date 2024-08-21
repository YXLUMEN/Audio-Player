/**
 * 节流函数
 * @param {function} func
 * @param {number} wait
 * */
export function throttleTimeOut(func, wait = 200) {
    let timer = null;
    return function () {
        if (timer) return;
        const context = this, args = [...arguments];
        func.apply(context, args);
        timer = setTimeout(() => timer = null, wait);
    }
}

/**
 * 防抖函数
 * @param {function} func
 * @param {number} wait
 * @param {boolean} immediate
 * */
export function debounce(func, wait = 50, immediate = false) {
    let timer;
    return function () {
        if (immediate) wait = 0;
        if (timer) clearTimeout(timer);
        const context = this, args = [...arguments];
        timer = setTimeout(() => func.apply(context, args), wait);
    }
}

/**
 * 空值判断,
 * 传入参数为 0, '', undefined, null, NaN, 空数组, 空对象 时返回 false;
 * @param {any} obj
 * @return {boolean}
 * */
export function isEmpty(obj) {
    if (typeof obj !== "object") return !obj;
    if (Object.prototype.toString.call(obj) === "[object Array]") return !obj.length;
    if (Object.prototype.toString.call(obj) === "[object Object]") return Object.keys(obj).length === 0;
    return false;
}

/**
 * 触屏端滑动方向
 * @param {number} startX
 * @param {number} startY
 * @param {number} endX
 * @param {number} endY
 * @return {number} number -1: unknown, 0: click, 1: left, 2: right, 3: up, 4: down
 * */
export function getSlideDirection(startX, startY, endX, endY) {
    const angX = endX - startX;
    const angY = endY - startY;

    // click
    if (Math.abs(angX) < 2 && Math.abs(angY) < 2) return 0;

    const angle = Math.atan2(angX, angY) * 180 / Math.PI;
    // left
    if (angle >= -135 && angle <= -45) return 1;
    // right
    if (angle > 45 && angle < 135) return 2;
    // up
    if ((angle >= 135 && angle <= 180) || (angle >= -180 && angle < -135)) return 3
    // down
    if (angle >= -45 && angle <= 45) return 4;
    return -1;
}

/**
 * Fisher-Yates算法
 * @param {number[]} array
 * @return {number[]}
 * */
export function shuffleArray(array) {
    for (let i = array.length; i--;) {
        const j = Math.floor(Math.random() * (i + 1));
        ;[array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * 生成随机数组; 使用Fisher-Yates算法; 未来可能会针对大数进行优化,如使用Promise.
 * @param {number} max 最大值
 * @param {number} count 默认为 max - min
 * @return {number[]}
 * */
export function generateUniqueRandomNumbers(max, count = max) {
    if (count < 1) throw RangeError('Count must lager then 1');
    if (count > max) throw RangeError('Count must smaller then max');

    const allNumbers = Array.from({length: max}, (_, i) => i);
    return shuffleArray(allNumbers).slice(0, count);
}

export function isMobile() {
    return /Mobile|Android|iPhone/.test(navigator.userAgent);
}