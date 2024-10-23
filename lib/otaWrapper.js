import { RcspOTAManager, OTAImpl, OTAError, getErrorDesc, ab2hex, logv, logd, logi, loge } from "./jl_lib/jl_ota_2.1.1";
import { Reconnect } from "./reconnect";
import { Auth } from "./jl_lib/jl_auth_2.0.0";
import * as RCSPProtocol from "./jl_lib/jl_rcsp_ota_2.1.1";
// 可能在上层有一个回连机制，需要兼容处理两个回连机制
export class BluetoothDevice {
    constructor(deviceId) {
        /** 当前蓝牙设备的信号强度，单位 dBm */
        this.RSSI = 0;
        /** 当前蓝牙设备是否可连接（ Android 8.0 以下不支持返回该值 ） */
        this.connectable = true;
        /** 蓝牙设备 id */
        this.deviceId = "";
        /** 当前蓝牙设备的广播数据段中的 LocalName 数据段 */
        this.localName = "";
        this.deviceId = deviceId;
    }
    equals(o) {
        if (o == null)
            return false;
        if (this == o)
            return true;
        return this.deviceId == o.deviceId;
    }
}
export class OTAWrapperListenner extends RCSPProtocol.OnRcspCallback {
}
export class OTAUpgradeCallback {
    /** OTA开始*/
    onStartOTA() { }
    /**需要回连的回调
     * <p>
     * 注意: 1.仅连接通讯通道（BLE or  SPP）
     * 2.用于单备份OTA</p>
     *
     * @param reConnectMsg 回连设备信息
     * @param reconnectCallback 回连结果。
     */
    onNeedReconnect(reConnectMsg, reconnectCallback) { }
    /** 进度回调
     *
     * @param type     类型
     * @param progress 进度
     */
    onProgress(type, progress) { }
    /** OTA结束*/
    onStopOTA() { }
    /** OTA取消*/
    onCancelOTA() { }
    /** OTA失败
     * @param error   错误码
     * @param message 错误信息
     */
    onError(error, message) { }
}
export class OTAWrapper {
    constructor(otaWrapperOption) {
        this._RcspOTAManagerMap = new Map();
        this._RcspImplMap = new Map();
        this._ReconnectMap = new Map();
        this._AuthMap = new Map();
        this._RcspCallbackManager = new RCSPProtocol.RcspCallbackManager();
        this._OTAWrapperOption = otaWrapperOption;
    }
    /**初始化成功**/
    isRCSPInit(device) {
        return new Promise((resolve, reject) => {
            const rcspImpl = this._getRCSPImpl(device.deviceId);
            if (rcspImpl) {
                if (rcspImpl.getDeviceInfo(device)) {
                    resolve(true);
                }
                else {
                    reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No DeviceInfo."));
                }
            }
            else {
                reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No has RCSPImpl."));
            }
        });
    }
    /**是否需要强制升级**/
    isNeedMandatoryUpgrade(device) {
        return new Promise((resolve, reject) => {
            const rcspImpl = this._getRCSPImpl(device.deviceId);
            if (rcspImpl) {
                const deviceInfo = rcspImpl.getDeviceInfo(device);
                if (deviceInfo) {
                    resolve(deviceInfo.mandatoryUpgradeFlag == RCSPProtocol.CmdGetTargetInfo.FLAG_MANDATORY_UPGRADE);
                }
                else {
                    reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No DeviceInfo."));
                }
            }
            else {
                reject(new RCSPProtocol.RCSPError(RCSPProtocol.RCSPErrorCode.ERR_OTHER, "No has RCSPImpl."));
            }
        });
    }
    /**
     * 开始升级
     */
    startOTA(device, otaConfig, onUgradeCallback) {
        const rcspImpl = this._getRCSPImpl(device.deviceId);
        if (rcspImpl == undefined) {
            loge('rcspImpl undefined');
            return;
        }
        const usingDevice = rcspImpl.getUsingDevice();
        loge('rcspImpl usingDevice');
        if (usingDevice == null)
            return;
        // fixme 考虑到后续开发人员可能不会注意有没有初始化成功，可能需要处理
        if (rcspImpl.getDeviceInfo(usingDevice) == undefined) {
            loge('rcspImpl 没有初始化成功');
            return;
        }
        if (otaConfig.updateFileData == undefined || otaConfig.updateFileData.length == 0) {
            return;
        }
        const OTAManager = new RcspOTAManager(rcspImpl);
        this._RcspOTAManagerMap.set(device.deviceId, OTAManager);
        try {
            OTAManager.startOTA(otaConfig, {
                onStartOTA: () => {
                    onUgradeCallback.onStartOTA();
                },
                onNeedReconnect: (reConnectMsg) => {
                    const reconnectResultCallback = {
                        onResult: (deviceId) => {
                            // 回连成功应该把新设备和连接状态同步给 rcspOTA
                            this._ReconnectMap.delete(deviceId);
                            const rcspImpl = this._getRCSPImpl(deviceId);
                            if (rcspImpl) {
                                OTAManager.updateRcspOpImpl(rcspImpl);
                            }
                        },
                        onError: (code, message) => {
                        }
                    };
                    onUgradeCallback.onNeedReconnect(reConnectMsg, reconnectResultCallback);
                    logi("onNeedReconnect: " + JSON.stringify(reConnectMsg));
                    logd(" reConnectMsg.isSupportNewReconnectADV : " + reConnectMsg.isSupportNewReconnectADV);
                    if (this._OTAWrapperOption.isInnerReconnect()) { //使用内部回连
                        // const oldDeviceMac = OTAManager?.getCurrentOTADeviceMac()?.toUpperCase().replace(/:/g, "")
                        const oldDeviceMac = reConnectMsg.deviceBleMac?.toUpperCase().replace(/:/g, "");
                        const oldDeviceMacReverse = oldDeviceMac?.split('')?.reverse()?.join(''); //mac反转
                        const oldDeviceMacPrefix = oldDeviceMac?.substring(0, 10);
                        logd(" oldDeviceMac " + oldDeviceMac);
                        //###实现回连，这一部分可以自己实现
                        const op = {
                            startScanDevice: () => {
                                this.sanDevice();
                            },
                            isReconnectDevice: (scanDevice) => {
                                let result = false;
                                const oldDevice = OTAManager?.getCurrentOTADevice();
                                if (reConnectMsg.isSupportNewReconnectADV) { //使用新回连方式，需要通过rcsp协议获取到设备的ble地址
                                    if (oldDeviceMac != undefined && oldDeviceMac !== "") {
                                        const advertisStr = ab2hex(scanDevice.advertisData).toUpperCase();
                                        const index = advertisStr.indexOf("D60541544F4C4A");
                                        if (index != -1 && scanDevice.advertisData) {
                                            const unit8Array = new Uint8Array(scanDevice.advertisData);
                                            const macArray = unit8Array.slice((index / 2) + 8, (index / 2) + 14).reverse();
                                            // logd("新回连广播包 newMAC : " + ab2hex(macArray).toUpperCase())
                                            result = oldDeviceMac == hex2Mac(macArray).toUpperCase();
                                        }
                                        //优化打印
                                        if (advertisStr.includes(oldDeviceMac) || (oldDeviceMacReverse != undefined && advertisStr.includes(oldDeviceMacReverse))) { //模糊匹配(广播包中包含旧设备地址)，回连打印太多有问题
                                            logv("newReconnect,mac:" + scanDevice.deviceId + ", result: " + result + ",rawData:" + ab2hex(scanDevice.advertisData));
                                        }
                                        else if (oldDeviceMacPrefix != undefined && scanDevice.deviceId.toUpperCase().includes(oldDeviceMacPrefix)) { //模糊匹配(mac地址中部分相似)，回连打印太多有问题
                                            logv("newReconnect,mac:" + scanDevice.deviceId + ", result: " + result + ",rawData:" + ab2hex(scanDevice.advertisData));
                                        }
                                        // logd("新回连广播包 oldMAC : " + oldDeviceMac + " scanMAC: " + scanDevice.deviceId + " result: " + result + " rawData: " + ab2hex(scanDevice.advertisData));
                                    }
                                    else {
                                        // loge("RCSP协议未拿到设备的BLE地址")
                                    }
                                }
                                else { //旧回连方式，deviceId相同即可
                                    // result = oldDevice!.deviceId == scanDevice.deviceId
                                    if (oldDevice != undefined) {
                                        if (oldDevice.deviceId == scanDevice.deviceId) {
                                            result = true;
                                        }
                                        const oldDeviceDeviceIdPrefix = oldDevice.deviceId.substring(0, 10);
                                        if (oldDeviceDeviceIdPrefix != undefined && scanDevice.deviceId.toUpperCase().includes(oldDeviceDeviceIdPrefix)) { //模糊匹配(mac地址中部分相似)，回连打印太多有问题
                                            logv("oldReconnect,mac:" + scanDevice.deviceId + ", result: " + result);
                                        }
                                    }
                                    // logd("旧方式回连 : oldMAC: " + oldDevice!.deviceId + " scanMAC: " + scanDevice.deviceId + " result: " + result);
                                }
                                return result;
                            },
                            connectDevice: (device) => {
                                this.connectDevice(device);
                            }
                        };
                        const callback = {
                            onReconnectSuccess: (device) => {
                                logi("onReconnectSuccess : " + device);
                                reconnectResultCallback.onResult(device.deviceId);
                            },
                            onReconnectFailed: () => {
                                loge("onReconnectFailed : ");
                                this._ReconnectMap.delete(device.deviceId);
                                reconnectResultCallback.onError(OTAError.ERROR_OTA_RECONNECT_DEVICE_TIMEOUT, getErrorDesc(OTAError.ERROR_OTA_RECONNECT_DEVICE_TIMEOUT, ""));
                            },
                            onDeviceConnectFailed: (dev) => {
                                this.sanDevice();
                            },
                            onDeviceConnectDisconnected: (dev) => {
                                this.sanDevice();
                            }
                        };
                        const reconnect = new Reconnect(op, callback);
                        this._ReconnectMap.set(device.deviceId, reconnect);
                        reconnect.startReconnect(OTAImpl.RECONNECT_DEVICE_TIMEOUT);
                    }
                },
                onProgress: (type, progress) => {
                    onUgradeCallback.onProgress(type, progress);
                },
                onStopOTA: () => {
                    onUgradeCallback.onStopOTA();
                    OTAManager.release();
                    //重新扫描设备
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId;
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId));
                    }
                    this.sanDevice();
                    this._RcspOTAManagerMap.delete(device.deviceId);
                },
                onCancelOTA: () => {
                    onUgradeCallback.onCancelOTA();
                    OTAManager.release();
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId;
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId));
                    }
                    this.sanDevice();
                    this._RcspOTAManagerMap.delete(device.deviceId);
                },
                onError: (error, message) => {
                    onUgradeCallback.onError(error, message);
                    const reconnect = this._ReconnectMap.get(device.deviceId);
                    reconnect?.stopReconnect();
                    loge('升级失败: 错误code：' + RCSPProtocol.toHexWithPrefix(error) + " 信息：" + message);
                    const deviceId = OTAManager.getCurrentOTADevice()?.deviceId;
                    if (deviceId) {
                        this.disconnectDevice(new BluetoothDevice(deviceId));
                    }
                    OTAManager.release();
                    this._RcspOTAManagerMap.delete(device.deviceId);
                }
            });
        }
        catch (error) {
            let errorString = error.stack;
            loge('升级异常闪退，' + errorString);
        }
    }
    /**
     * 取消升级（仅双备份支持）
     */
    cancelOTA(device) {
        const OTAManager = this._RcspOTAManagerMap.get(device.deviceId);
        OTAManager?.cancelOTA();
    }
    /**
     * 是否正在升级
     */
    isOTA(device) {
        const OTAManager = this._RcspOTAManagerMap.get(device.deviceId);
        return OTAManager?.isOTA();
    }
    /**
     * 发自定义命令
     */
    sendCustomCmd(device, data, callback) {
        const rcspImpl = this._getRCSPImpl(device.deviceId);
        if (rcspImpl == undefined) {
            return false;
        }
        const usingDevice = rcspImpl.getUsingDevice();
        if (usingDevice == null)
            return false;
        if (rcspImpl.getDeviceInfo(usingDevice) == undefined) {
            loge('rcspImpl 没有初始化成功');
            return false;
        }
        const customParam = new RCSPProtocol.ParamBase();
        customParam.setData(data);
        const customCmd = new RCSPProtocol.CmdCustom(customParam);
        rcspImpl.sendRCSPCommand(usingDevice, customCmd, 20 * 1000, callback);
        return true;
    }
    /**获取设备信息**/
    getDeviceInfo(device) {
        const rcspImpl = this._getRCSPImpl(device.deviceId);
        return rcspImpl?.getDeviceInfo(device);
    }
    /**
    * 注册RCSP回调
    */
    registerRcspCallback(callback) {
        this._RcspCallbackManager.registerRcspCallback(callback);
    }
    /**
     * 注销RCSP回调
     */
    unregisterRcspCallback(callback) {
        this._RcspCallbackManager.unregisterRcspCallback(callback);
    }
    /**
     * 释放
     */
    release() {
        this._RcspOTAManagerMap.forEach(element => {
            element.release();
        });
        this._RcspOTAManagerMap.clear();
        if (this._OTAWrapperOption.getRCSPImpl == undefined) { //内部实现管理RCSPImpl
            this._RcspImplMap.forEach(element => {
                element.destroy();
            });
            this._RcspImplMap.clear();
        }
        this._ReconnectMap.forEach(element => {
            element.stopReconnect();
        });
        this._ReconnectMap.clear();
        this._AuthMap.clear();
        this._RcspCallbackManager.release();
    }
    /**************************** OTAWrapperOption  ****************************/
    /**是否需要认证**/
    isUseAuth() {
        return this._OTAWrapperOption.isUseAuth();
    }
    /**是否需要回连。 在上层进行回连，就不需要内部回连。**/
    isInnerReconnect() {
        return this._OTAWrapperOption.isInnerReconnect();
    }
    /**扫描设备**/
    sanDevice() {
        this._OTAWrapperOption.sanDevice();
    }
    /**连接设备**/
    connectDevice(device) {
        this._OTAWrapperOption.connectDevice(device);
    }
    /**断开设备**/
    disconnectDevice(device) {
        this._OTAWrapperOption.disconnectDevice(device);
    }
    /**发送数据**/
    sendData(device, data) {
        this._OTAWrapperOption.sendData?.(device, data);
    }
    /**************************** 事件触发  ****************************/
    /**扫描设备停止**/
    onSanDeviceStop() {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onScanStop();
        });
    }
    /**发现设备**/
    onScanFound(devices) {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDiscoveryDevices(devices);
        });
    }
    /**蓝牙连接成功**/
    onConnectStateSuccess(dev) {
        if (this.isUseAuth()) {
            const cacheAuth = this._AuthMap.get(dev.deviceId);
            if (cacheAuth == undefined) { //没有缓存
                let auth = new Auth();
                this._AuthMap.set(dev.deviceId, auth);
                let authListener = {
                    onSendData: (deviceId, data) => {
                        this.sendData(new BluetoothDevice(deviceId), new Uint8Array(data));
                    },
                    onAuthSuccess: () => {
                        logi(" 认证成功");
                        // @note 等设备初始化成功
                        this._onDeviceConnected(dev);
                        this._AuthMap.delete(dev.deviceId);
                    },
                    onAuthFailed: () => {
                        this._onDeviceConnected(dev);
                        this._AuthMap.delete(dev.deviceId);
                    },
                };
                auth.startAuth(dev.deviceId, authListener);
            }
        }
        else {
            this._onDeviceConnected(dev);
        }
    }
    /**蓝牙连接断开**/
    onConnectStateDisconnect(dev) {
        this._onDeviceDisconnected(dev);
        if (this._OTAWrapperOption.getRCSPImpl == undefined) { //内部实现管理RCSPImpl
            Array.from(this._RcspImplMap.values()).forEach(element => {
                element.transmitDeviceStatus(new RCSPProtocol.Device(dev.deviceId), RCSPProtocol.Connection.CONNECTION_DISCONNECT);
            });
        }
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDeviceConnectDisconnected(dev);
        });
    }
    /**蓝牙连接失败**/
    onConnectStateFailed(dev) {
        this._ReconnectMap.forEach(reconnect => {
            reconnect.onDeviceConnectFailed(dev);
        });
    }
    /**RCSP初始化成功**/
    onRcspInitSuccess(dev) {
        if (this._OTAWrapperOption.getRCSPImpl != undefined) { //外部实现管理RCSPImpl
            this._getRCSPImpl(dev.deviceId)?.addOnRcspCallback(this._RcspCallbackManager);
            this._onRcspInit(dev, true);
        }
    }
    /**收到数据**/
    onReceiveData(dev, data) {
        this._AuthMap.forEach(auth => {
            auth.handlerAuth(dev.deviceId, data);
        });
        this._getRCSPImpl(dev.deviceId)?.transmitDeviceData(new RCSPProtocol.Device(dev.deviceId), new Uint8Array(data));
    }
    _getRCSPImpl(deviceId) {
        if (this._OTAWrapperOption.getRCSPImpl == undefined) { //内部实现管理RCSPImpl
            return this._RcspImplMap.get(deviceId);
        }
        else {
            return this._OTAWrapperOption.getRCSPImpl(new BluetoothDevice(deviceId));
        }
    }
    _onDeviceConnected(device) {
        if (this._OTAWrapperOption.getRCSPImpl == undefined) { //内部实现管理RCSPImpl
            const rcspImpl = new RCSPProtocol.RcspImpl();
            this._RcspImplMap.set(device.deviceId, rcspImpl);
            rcspImpl.setOnSendDataCallback({
                sendDataToDevice: (device, data) => {
                    this.sendData(new BluetoothDevice(device.deviceId), data);
                    return true;
                }
            });
            const onRcspCallback = new RCSPProtocol.OnRcspCallback();
            onRcspCallback.onRcspInit = (device, isInit) => {
                this._onRcspInit(device, isInit);
            };
            rcspImpl.addOnRcspCallback(onRcspCallback);
            rcspImpl.addOnRcspCallback(this._RcspCallbackManager);
            rcspImpl.transmitDeviceStatus(new RCSPProtocol.Device(device.deviceId, device.name), RCSPProtocol.Connection.CONNECTION_CONNECTED);
        }
        else {
            // 这里有异步问题可能不一定能addOnRcspCallback。如果getRCSPImpl 是空。
            //有一种情况，OTAWrapper和 外面sdk一直被初始化。另一边还没把RcspImpl初始化，这边就调用了
            // rcspImpl.addOnRcspCallback(this._RcspCallbackManager)
            // this._getRCSPImpl(device.deviceId)?.addOnRcspCallback(this._RcspCallbackManager)
        }
    }
    _onDeviceDisconnected(device) {
        if (this._OTAWrapperOption.getRCSPImpl == undefined) { //内部实现管理RCSPImpl
            const rcspImpl = this._RcspImplMap.get(device.deviceId);
            if (rcspImpl) {
                rcspImpl.transmitDeviceStatus(new RCSPProtocol.Device(device.deviceId, device.name), RCSPProtocol.Connection.CONNECTION_DISCONNECT);
                rcspImpl.setOnSendDataCallback(undefined);
                rcspImpl.destroy();
                this._RcspImplMap.delete(device.deviceId);
            }
            this._AuthMap.delete(device.deviceId);
        }
        else {
        }
    }
    // Rcsp回调-初始化成功
    _onRcspInit(device, isInit) {
        const deviceId = device?.deviceId;
        if (deviceId && device) {
            const dev = new BluetoothDevice(deviceId);
            if (isInit == true) {
                // const rcspImpl = this._RcspImplMap.get(deviceId)
                const rcspImpl = this._getRCSPImpl(deviceId);
                if (rcspImpl) {
                    const deviceInfo = rcspImpl?.getDeviceInfo(device);
                    logi(" Rcsp回调-初始化成功" + JSON.stringify(deviceInfo));
                    this._ReconnectMap.forEach(reconnect => {
                        reconnect.onDeviceConnected(dev);
                    });
                    // const rcspImpl = this._getRCSPImpl(device.deviceId)
                    //                 if (rcspImpl) {
                    //                     OTAManager.updateRcspOpImpl(rcspImpl)
                    // }
                }
                else { //没有设备信息
                    loge(" Rcsp初始化失败，没有设备信息,断开设备");
                    this.disconnectDevice(dev);
                }
            }
            else { //未初始化成功
                loge(" Rcsp初始化失败，断开设备");
                this.disconnectDevice(dev);
            }
        }
    }
}
export function hex2Mac(buffer) {
    const hexArr = Array.prototype.map.call(new Uint8Array(buffer), function (bit) {
        return ('00' + bit.toString(16)).slice(-2);
    });
    return hexArr.join('');
}
