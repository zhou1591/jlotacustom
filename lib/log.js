const TAG = "杰理-OTA-App";
var logGrade = 1;
var logger;
export function setLogGrade(grade) {
    logGrade = grade;
}
export function setLogger(log) {
    logger = log;
}
export function logv(...args) {
    if (logGrade <= 1) {
        if (logger != undefined) {
            logger.logv(TAG, ...args);
        }
    }
}
export function logd(...args) {
    if (logGrade <= 2) {
        if (logger != undefined) {
            logger.logd(TAG, ...args);
        }
    }
}
export function logi(...args) {
    if (logGrade <= 3) {
        if (logger != undefined) {
            logger.logi(TAG, ...args);
        }
    }
}
export function logw(...args) {
    if (logGrade <= 4) {
        if (logger != undefined) {
            logger.logw(TAG, ...args);
        }
    }
}
export function loge(...args) {
    if (logGrade <= 5) {
        if (logger != undefined) {
            logger.loge(TAG, ...args);
        }
    }
}
/** arraybuffer 转字符串*/
export function ab2hex(buffer) {
    if (buffer) {
        const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
            return ('00' + bit.toString(16)).slice(-2);
        });
        return hexArr.join('');
    }
    return '';
}
/** 16进制数据转蓝牙地址 */
export function hexDataCovetToAddress(dataArray) {
    let address = "";
    for (let index = 0; index < dataArray.length; index++) {
        const element = dataArray[index];
        address += ('00' + element.toString(16)).slice(-2);
        if (index != dataArray.length - 1) {
            address += ":";
        }
    }
    return address.toUpperCase();
}
