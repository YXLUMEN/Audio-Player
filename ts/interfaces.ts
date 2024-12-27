interface IUpdateData {
    init: boolean,
    newIndex: number
}

interface ISwitchAudio extends IUpdateData {
    refresh: boolean,
    scroll: boolean
}

interface IBaseFetch extends RequestInit {
    async?: boolean,
    ignore_err?: Array<number>,
}

interface IAlert {
    autoRemoveDelay: number,
    animation: boolean,
}

interface IConfirm {
    timeout: number, // timeout: Set this to 0 to disable.
    flag: string,
    category: 'info' | 'warning' | 'error',
    defaultReturn: boolean,
    strictTimeout: boolean,
    animation: boolean,
}