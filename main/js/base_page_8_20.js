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
 * @param {HTMLElement} ele
 * @param {HTMLElement} children
 * */
export function appendChildren(ele, ...children) {
    children.forEach(item => ele.appendChild(item));
}

/**
 * 创建通用提示框
 * @param {string} message Any strings.
 * @param {'message','success','warning','warn','danger','error'} category Level of this alert.
 * @param {number} autoRemoveDelay Time to remove this alert,set it to 0 to disable, the unit is ms.
 * */
export default function createAlert(message, category = 'message', autoRemoveDelay = 2500) {
    const baseAlertBox = document.getElementsByClassName('base-alert-box')[0];
    const boxChild = baseAlertBox.getElementsByClassName('alert');

    // 清除较旧的警示框
    if (boxChild.length > 6) for (let i = boxChild.length - 6; i--;) removeElement(boxChild[i]);

    const alert = document.createElement('div');
    alert.className = `alert alert-${category} active-alert`;
    alert.role = 'alert';

    const p = document.createElement('p');
    p.textContent = message;

    const img = document.createElement('img');
    setAttributes(img, {
        class: 'close',
        src: '/static/img/svg/shutdown.svg',
        alt: 'close',
        width: '20'
    });

    appendChildren(alert, p, img);

    alert.addEventListener('click', function alertAction(event) {
        const target = event.target.closest('.close');
        if (!target) return;

        this.removeEventListener('click', alertAction);
        removeElement(this);
    }, {once: true});

    baseAlertBox.appendChild(alert);

    // 自动移除
    if (!autoRemoveDelay) return;

    const alertEle = document.getElementsByClassName("active-alert")[0];
    if (!alertEle) return;
    alertEle.classList.remove('active-alert');
    setTimeout(() => removeElement(alertEle), autoRemoveDelay);
}

/**
 * 创建确认提示框
 * @param {string} message 提示信息
 * @param {{}} opts
 * @return {Promise<boolean>}
 */
export function createConfirm(message = '是否确认操作?', opts) {
    const defaultOpt = {
        timeout: 0,
        flag: 'default',
        defaultReturn: false,
        ...opts
    }

    const {timeout, flag, defaultReturn} = defaultOpt;

    const id = `confirm_${flag}`;

    if (document.getElementById(id)) return Promise.resolve(defaultReturn);

    const confirm = document.createElement('div');
    confirm.id = id;
    confirm.className = 'confirm';
    confirm.role = 'confirm';

    const agreeImg = document.createElement('img');
    setAttributes(agreeImg, {
        class: 'action',
        src: '/static/img/svg/yes.svg',
        alt: 'agree',
        width: '20',
        action: 'agree'
    });

    const messageParagraph = document.createElement('p');
    messageParagraph.textContent = message;

    const disagreeImg = document.createElement('img');
    setAttributes(disagreeImg, {
        class: 'action',
        src: '/static/img/svg/shutdown.svg',
        alt: 'disagree',
        width: '20',
        action: 'disagree'
    });

    appendChildren(confirm, agreeImg, messageParagraph, disagreeImg);

    // 默认的提示框box
    document.getElementsByClassName('base-alert-box')[0].appendChild(confirm);

    return new Promise((resolve, reject) => {
        let signal = defaultReturn;

        confirm.addEventListener('click', function confirmAction(event) {
            const action = event.target.closest('.action')?.getAttribute('action');
            if (!action) return;
            signal = action === 'agree';
            resolve(signal);
            this.removeEventListener('click', confirmAction);
            removeElement(this);
        });

        if (timeout) setTimeout(() => {
            removeElement(confirm);
            reject(signal);
        }, timeout);
    });
}