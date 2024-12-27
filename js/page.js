/**
 * 元素延迟删除
 * @param {HTMLElement} ele Try to remove ele passed.
 * @param {number} delay
 * */
export function removeElement(ele, delay = 200) {
    if (!ele) return;
    ele.style.opacity = '0';
    setTimeout(() => ele?.remove(), delay);
}

/**
 * @param {HTMLElement} ele
 * @param {{}} attributes example:
 *
 *      {
 *          'class': 'sth',
 *          'src': '/example/good.png',
 *      }
 * */
export function setAttributes(ele, attributes) {
    Object.entries(attributes).forEach(([attr, value]) => ele.setAttribute(attr, value));
}

/**
 * @param element {HTMLElement}
 * @param removeClass {string[]}
 * @param addClass {string[]}
 * */
export function toggleClass(element, removeClass, addClass) {
    element.classList.remove(...removeClass);
    element.classList.add(...addClass);
}

/**
 * @param {HTMLElement} ele
 * @param {HTMLElement} children
 * */
export function appendChildren(ele, ...children) {
    children.forEach(item => ele.appendChild(item));
}

/**
 * 用于移除 base-alert-box 中的通知
 * @param element {HTMLDivElement}
 * @param animation {boolean}
 * */
function removeNote(element, animation) {
    element.classList.remove('show');

    if (animation) {
        element.classList.add('close');
        if (document.startViewTransition) document.startViewTransition(() => element.remove());
        else element.addEventListener('animationend', () => element.remove(), {once: true});
        return;
    }
    removeElement(element);
}

/**
 * 创建通用提示框
 * @param {string} message Any strings.
 * @param category {'info' | 'success' | 'warning' | 'danger'}
 * @param {IAlert,{}} opts
 * */
export default function createAlert(message, category = 'info', opts = {}) {
    const {autoRemoveDelay = 2500, animation = true} = opts;

    const baseAlertBox = document.querySelector('.base-alert-box');
    const boxChildren = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChildren.length > 6) for (let i = boxChildren.length - 6; i--;) removeNote(boxChildren[i], false);

    const alert = document.createElement('div');
    alert.className = `note ${category || 'info'} alert${animation ? ' show' : ''}`;
    if (animation) alert.style.viewTransitionName = `note-animate-${Math.random().toString(36).substring(2, 9)}`;

    const p = document.createElement('p');
    p.textContent = message;

    const img = document.createElement('img');
    setAttributes(img, {
        class: 'close',
        src: '/img/ico/shutdown.svg',
        alt: 'close',
        width: '20'
    });

    appendChildren(alert, p, img);

    // 手动关闭
    alert.addEventListener('click', function alertAction(event) {
        const target = event.target.closest('.close');
        if (!target) return;
        this.removeEventListener('click', alertAction);
        removeNote(this, animation);
    });

    // add to DOM
    baseAlertBox.appendChild(alert);

    // 自动移除
    if (!alert || !autoRemoveDelay) return;

    const totalDelay = Math.min(
        autoRemoveDelay * boxChildren.length,
        10000 // Cap maximum delay at 10 seconds
    );

    const timeoutId = setTimeout(() => {
        removeNote(alert, animation);
        clearTimeout(timeoutId);
    }, totalDelay);
}

/**
 * 创建确认提示框
 * @param {string} message 提示信息
 * @param {IConfirm,{}} opts
 * @return {Promise<boolean>}
 */
export function createConfirm(message = '是否确认操作?', opts) {
    const defaultOpt = {
        timeout: 0,
        flag: 'default',
        category: 'info',
        defaultReturn: false,
        strictTimeout: false,
        animation: true,
        ...opts
    };

    const {timeout, flag, category, defaultReturn, strictTimeout, animation} = defaultOpt;
    const id = `confirm_${flag}`;

    if (document.getElementById(id)) return Promise.resolve(defaultReturn);

    const confirm = document.createElement('div');
    confirm.id = id;
    confirm.className = `note ${category} confirm${animation ? ' show' : ''}`;
    if (animation) confirm.style.viewTransitionName = id;

    const agreeImg = document.createElement('img');
    setAttributes(agreeImg, {
        class: 'action',
        src: '/img/ico/yes.svg',
        alt: 'agree',
        width: '20',
        action: 'agree'
    });

    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = message;

    const disagreeImg = document.createElement('img');
    setAttributes(disagreeImg, {
        class: 'action',
        src: '/img/ico/shutdown.svg',
        alt: 'disagree',
        width: '20',
        action: 'disagree'
    });

    appendChildren(confirm, agreeImg, messageParagraph, disagreeImg);

    // 默认的提示框box
    const baseAlertBox = document.getElementsByClassName('base-alert-box')[0];
    if (baseAlertBox.firstChild) baseAlertBox.insertBefore(confirm, baseAlertBox.firstChild);
    else baseAlertBox.appendChild(confirm);

    const {promise, resolve, reject} = Promise.withResolvers();

    let timeoutId;
    if (timeout) {
        timeoutId = setTimeout(() => {
            strictTimeout ? reject(defaultReturn) : resolve(defaultReturn);
            console.warn(`Confirm timeout timeout: ${flag}`);
            removeNote(confirm, animation);
            clearTimeout(timeoutId);
        }, timeout);
    }

    confirm.addEventListener('click', function confirmAction(event) {
        const action = event.target.closest('.action')?.getAttribute('action');
        if (!action) return;
        clearTimeout(timeoutId);
        resolve(action === 'agree');
        this.removeEventListener('click', confirmAction);
        removeNote(this, animation);
    });

    return promise;
}