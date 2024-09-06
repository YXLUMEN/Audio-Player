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