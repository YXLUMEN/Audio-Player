import createAlert from "./page.js";

/**
 * 封装的fetch方法
 * @param {string} url
 * @param {IBaseFetch} opts
 * */
export default async function baseFetch(url, opts = {}) {
    const defaultOpts = {
        method: 'POST',
        body: '',
        headers: {
            'Content-Type': 'application/json',
        },
        referrer: "about:client",
        cache: 'default',
        async: false,
        ignore_err: [],
        ...opts
    };

    const response_promise = fetch(url, defaultOpts);
    if (defaultOpts.async) return response_promise;

    const response = await response_promise;
    const status = response.status;

    if (!response.ok && !defaultOpts.ignore_err.includes(status)) _statusAlert(status);
    return response;
}

/**
 * 获取URL中的Get信息
 * @param {string} par
 * */
export function getPar(par) {
    const localUrl = document.location.href;
    const paramIndex = localUrl.indexOf(`${par}=`);

    if (paramIndex === -1) return '';

    let paramValue = localUrl.slice(paramIndex + par.length + 1);
    const nextParamIndex = paramValue.indexOf("&");

    if (nextParamIndex !== -1) paramValue = paramValue.slice(0, nextParamIndex);

    return paramValue;
}


// 默认的错误处理
const _errors = new Map([
    [400, ['不支持的请求', 'warning']],
    [401, ['您还没有登录', 'warning']],
    [404, ['访问资源不存在', 'warning']],
    [405, ['不允许的请求', 'danger']],
    [429, ['请求速率限制', 'danger']],
    [500, ['服务器未能处理请求', 'danger']]
]);

function _statusAlert(statusCode = 404) {
    const msg = _errors.get(statusCode) ?? [`未知错误: ${statusCode}`, 'danger'];
    createAlert(...msg);
}