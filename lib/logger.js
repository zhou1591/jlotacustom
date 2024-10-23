const canIUseLogManage = wx.canIUse("getLogManager");
const logger = canIUseLogManage ? wx.getLogManager({ level: 1 }) : null;
function formatLog(msg) {
    let date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const mill = date.getMilliseconds();
    let timeString = `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second, mill].map(formatNumber).join(':')}`;
    return timeString + ":" + "-->" + msg;
}
const formatNumber = (n) => {
    n = n.toString();
    return n[1] ? n : `0${n}`;
};
var logGrade = 1;
var logEnable = false;
export function getLogger() {
    const log = {
        logv: (tag, ...args) => {
            logv(tag, ...args);
        },
        logd: (tag, ...args) => {
            logd(tag, ...args);
        },
        logi: (tag, ...args) => {
            logi(tag, ...args);
        },
        logw: (tag, ...args) => {
            logw(tag, ...args);
        },
        loge: (tag, ...args) => {
            loge(tag, ...args);
        },
    };
    return log;
}
export function getLogGrade() {
    return logGrade;
}
export function setLogGrade(grade) {
    logGrade = grade;
}
export function getLogEnable() {
    return logEnable;
}
export function setLogEnable(enable) {
    logEnable = enable;
}
function logv(tag, ...args) {
    if (logEnable && logGrade <= 1) {
        console.log(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.log(tag, ...args);
        }
    }
}
function logd(tag, ...args) {
    if (logEnable && logGrade <= 2) {
        console.debug(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.debug(tag, ...args);
        }
    }
}
function logi(tag, ...args) {
    if (logEnable && logGrade <= 3) {
        console.info(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.info(tag, ...args);
        }
    }
}
function logw(tag, ...args) {
    if (logEnable && logGrade <= 4) {
        console.warn(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) {
            logger.warn(tag, ...args);
        }
    }
}
function loge(tag, ...args) {
    if (logEnable && logGrade <= 5) {
        console.error(formatLog(tag), ...args);
        if (canIUseLogManage && logger != null) { //LogManager没有error方法，只能用warn代替
            logger.warn(tag, ...args);
        }
    }
}
