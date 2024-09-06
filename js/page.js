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
