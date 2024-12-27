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
 * @param {number} startX - Starting X coordinate
 * @param {number} startY - Starting Y coordinate
 * @param {number} endX - Ending X coordinate
 * @param {number} endY - Ending Y coordinate
 * @param {number} threshold=2 - Minimum distance threshold for movement
 * @returns {number} Direction code: 0(click), 1(left), 2(right), 3(up), 4(down), -1(click)
 * */
export function getSlideDirection(startX, startY, endX, endY, threshold = 2) {
    const deltaX = endX - startX;
    const deltaY = endY - startY;

    const distanceSquared = deltaX ** 2 + deltaY ** 2;
    if (distanceSquared < threshold) return 0;

    // click
    if (Math.abs(deltaX) < 2 && Math.abs(deltaY) < 2) return 0;

    // 180/PI ≈ 57.29577951308232
    const angle = Math.atan2(deltaX, deltaY) * 57.29577951308232;

    if (angle <= -45) {
        return (angle >= -135) ? 1 : 3; // left: up
    }
    if (angle >= 45) {
        return (angle <= 135) ? 2 : 3; // right: up
    }
    return 4; // down
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
 * 生成随机数组; 使用Fisher-Yates算法; 未来可能会针对大数进行优化, 如使用Promise.
 * @param {number} max Maximum value (exclusive)
 * @param {number} count Number of values to generate (defaults to max)
 * @return {number[]}
 * @throws {RangeError} If count is less than one or greater than max
 * */
export function generateUniqueRandomNumbers(max, count = max) {
    if (!Number.isInteger(max) || !Number.isInteger(count)) {
        throw new TypeError('Parameters must be integers');
    }
    if (max < 0) throw new RangeError('Max must be non-negative');
    if (count < 1) throw new RangeError('Count must be larger than 1');
    if (count > max) throw new RangeError(`Count (${count}) cannot exceed max value (${max})`);

    const allNumbers = Array.from({length: max}, (_, i) => i);
    return shuffleArray(allNumbers).slice(0, count);
}

export function isMobile() {
    return /Mobile|Android|iPhone/.test(navigator.userAgent);
}