import { BleDataHandler, BleSendDataHandler } from "./ble-data-handler";
import { loge } from "./log";
import { BTBean, BTConnect, BTScan } from "./bluetooth";
import { BluetoothInstance } from "./bluetoothUI";
import { OTAWrapper } from "./otaWrapper";
export class BluetoothOTAManager {
    /**
     * @param platform 手机系统 android/iOS
    */
    constructor(platform) {
        this._Platform = "android";
        this._BluetoothCallbackManager = new BluetoothCallbackManager();
        this._BluetoothConfigure = new BluetoothConfigure();
        this._ConnectSettingConfigure = new BTConnect.ConnectSettingConfigure();
        this._ScanSettingConfigure = new BTScan.ScanSettingConfigure();
        this._bluetoothInstance = BluetoothInstance;
        this.UUID_SERVICE = "0000ae00-0000-1000-8000-00805f9b34fb";
        this.UUID_WRITE = "0000ae01-0000-1000-8000-00805f9b34fb";
        this.UUID_NOTIFY = "0000ae02-0000-1000-8000-00805f9b34fb";
        this._Platform = platform;
        // 蓝牙接收数据处理器初始化
        BleDataHandler.init();
        { //连接配置
            this._ConnectSettingConfigure.mtu = 512; //mtu默认最大值512
            this._ConnectSettingConfigure.timeout = undefined; //连接超时不打开
            const dataService = new BTConnect.BluetoothService();
            dataService.UUID = this.UUID_SERVICE;
            const notifyCharacteristic = new BTConnect.BluetoothCharacteristic();
            notifyCharacteristic.UUID = this.UUID_NOTIFY;
            notifyCharacteristic.isNecessary = true;
            dataService.characteristicInfos.push(notifyCharacteristic);
            this._ConnectSettingConfigure.notifyServiceArray.push(dataService);
            this._bluetoothInstance.setConnectSettingConfigure(this._ConnectSettingConfigure);
        }
        { //扫描配置
            this._ScanSettingConfigure.isContainSystemsConnectedDevice = true;
            this._bluetoothInstance.setScanSettingConfigure(this._ScanSettingConfigure);
        }
        this._initBluetooth();
        { //OTAWrapper 初始化
            const otaWrapperOption = {
                /**是否需要认证**/
                isUseAuth: () => {
                    return this._BluetoothConfigure.isUseAuth;
                },
                isInnerReconnect: () => {
                    return true;
                },
                /**扫描设备**/
                sanDevice: () => {
                    this.sanDevice();
                },
                /**连接设备**/
                connectDevice: (device) => {
                    const tempDev = new BTBean.BluetoothDevice();
                    Object.assign(tempDev, device);
                    this.connectDevice(tempDev);
                },
                /**断开设备**/
                disconnectDevice: (device) => {
                    const tempDev = new BTBean.BluetoothDevice();
                    Object.assign(tempDev, device);
                    this.disconnectDevice(tempDev);
                },
                /**发送数据**/
                sendData: (device, data) => {
                    const tempDev = new BTBean.BluetoothDevice();
                    Object.assign(tempDev, device);
                    if (this._bluetoothInstance.isConnected(tempDev)) {
                        BleSendDataHandler.sendData(device.deviceId, this.UUID_SERVICE, this.UUID_WRITE, data);
                    }
                }
            };
            this._OTAWrapper = new OTAWrapper(otaWrapperOption);
        }
    }
    _initBluetooth() {
        this._bluetoothInstance.addConnectCallback({
            onMTUChange: (dev, mtu) => {
                BleSendDataHandler.setMtu(dev.deviceId, mtu);
                this._onConnectStateMTUChange(dev, mtu);
            }, onConnectSuccess: (dev) => {
                // 通知 OTAWrapper 蓝牙连接成功
                this._OTAWrapper.onConnectStateSuccess(dev);
                this._onConnectStateSuccess(dev);
            }, onConnectFailed: (dev, _err) => {
                // 通知 OTAWrapper 蓝牙连接失败
                this._OTAWrapper.onConnectStateFailed(dev);
                this._onConnectStateFailed(dev);
            }, onConnectDisconnect: (dev) => {
                // 通知 OTAWrapper 蓝牙连接断开
                this._OTAWrapper.onConnectStateDisconnect(dev);
                this._onConnectStateDisconnect(dev);
            }
        });
        this._bluetoothInstance.addScanCallback({
            onFound: (devs) => {
                // 通知 OTAWrapper 发现设备
                this._OTAWrapper.onScanFound(devs);
                this._onScanFound(devs);
            }, onScanStart: () => {
                this._onScanStart();
            }, onScanFailed: (err) => {
                this._onScanFailed(err);
            }, onScanFinish: () => {
                // 通知 OTAWrapper 扫描设备停止
                this._OTAWrapper.onSanDeviceStop();
                this._onScanFinish();
            }
        });
        this._bluetoothInstance.registerBluetoothAdapterListenner({
            onBluetoothAdapter: (availableBluetooth, btAdapterInfo) => {
                this._BluetoothCallbackManager.onBluetoothAdapter(availableBluetooth, btAdapterInfo);
            },
            onLocation: (availableLocation, locationAdapterInfo) => {
                this._BluetoothCallbackManager.onLocation(availableLocation, locationAdapterInfo);
            }
        });
        const bleDataCallback = {
            onReceiveData: (res) => {
                // 通知 OTAWrapper 收到数据
                this._OTAWrapper.onReceiveData(this._toDevice(res.deviceId), res.value);
            }
        };
        BleDataHandler.addCallbacks(bleDataCallback);
    }
    /**
     * 开始升级
     */
    startOTA(device, otaConfig, onUgradeCallback) {
        this._OTAWrapper.startOTA(device, otaConfig, onUgradeCallback);
    }
    /**
    * 注册RCSP事件回调
    */
    registerRcspCallback(callback) {
        this._OTAWrapper.registerRcspCallback(callback);
    }
    /**
    * 注销RCSP事件回调
    */
    unregisterRcspCallback(callback) {
        this._OTAWrapper.unregisterRcspCallback(callback);
    }
    /**
     * App发送自定义命令
     */
    sendCustomCmd(device, data, callback) {
        return this._OTAWrapper.sendCustomCmd(device, data, callback);
    }
    /**
     * 添加事件回调
     */
    addBluetoothEventCallback(callback) {
        this._BluetoothCallbackManager.addCallbacks(callback);
    }
    /**
     * 移除事件回调
    */
    removeBluetoothEventCallback(callback) {
        this._BluetoothCallbackManager.removeCallbacks(callback);
    }
    /**
     * 设置配置
     */
    setConfigure(bluetoothConfigure) {
        this._BluetoothConfigure = bluetoothConfigure;
        this.UUID_SERVICE = bluetoothConfigure.serviceUUID;
        this.UUID_NOTIFY = bluetoothConfigure.notifyCharacteristicUUID;
        this.UUID_WRITE = bluetoothConfigure.writeCharacteristicUUID;
        this._ConnectSettingConfigure.mtu = bluetoothConfigure.changeMTU;
        this._ConnectSettingConfigure.notifyServiceArray = new Array();
        const dataService = new BTConnect.BluetoothService();
        dataService.UUID = this.UUID_SERVICE;
        const notifyCharacteristic = new BTConnect.BluetoothCharacteristic();
        notifyCharacteristic.UUID = this.UUID_NOTIFY;
        notifyCharacteristic.isNecessary = true;
        dataService.characteristicInfos.push(notifyCharacteristic);
        this._ConnectSettingConfigure.notifyServiceArray.push(dataService);
        this._bluetoothInstance.setConnectSettingConfigure(this._ConnectSettingConfigure);
    }
    /**
     * 获取当前配置
     */
    getConfigure() {
        return this._BluetoothConfigure;
    }
    /**
     * 开始扫描设备
     */
    sanDevice() {
        this._bluetoothInstance.startScan(10000);
    }
    /**
     * 是否已连接
     */
    isConnected(device) {
        return this._bluetoothInstance.isConnected(this._toDevice(device));
    }
    /**
     * 已连接设备
     */
    getConnectedDevice() {
        return this._bluetoothInstance.getConnectedDevice();
    }
    /**
     * 连接设备
     */
    connectDevice(device) {
        return this._bluetoothInstance.connect({
            device: this._toDevice(device), fail: (e) => {
                // loge("连接失败", e)
            }
        });
    }
    /**
     * 断开设备
     */
    disconnectDevice(device) {
        this._bluetoothInstance.disconnect(this._toDevice(device));
    }
    _toDevice(device) {
        let dev;
        if ((typeof device === 'string')) {
            dev = new BTBean.BluetoothDevice();
            dev.deviceId = device;
        }
        else {
            dev = device;
        }
        return dev;
    }
    /***************************扫描回调ScanCallback*******************************/
    _onScanFound(devices) {
        this._BluetoothCallbackManager.onFoundDev(devices);
    }
    _onScanStart() {
        this._BluetoothCallbackManager.onScanStart();
    }
    _onScanFinish() {
        this._BluetoothCallbackManager.onScanFinish();
    }
    _onScanFailed(res) {
        loge(" _onScanFailed _Platform : " + this._Platform);
        this._BluetoothCallbackManager.onScanFailed(res);
    }
    /***************************连接回调ScanCallback*******************************/
    _onConnectStateDisconnect(dev) {
        this._BluetoothCallbackManager.onDevStatusDisconnect(dev);
    }
    _onConnectStateFailed(dev) {
        this._BluetoothCallbackManager.onDevStatusFailed(dev);
    }
    _onConnectStateSuccess(dev) {
        this._BluetoothCallbackManager.onDevStatusSuccess(dev);
    }
    _onConnectStateMTUChange(dev, mtu) {
        this._BluetoothCallbackManager.onDevStatusMTUChange(dev, mtu);
    }
}
export class BluetoothConfigure {
    constructor() {
        this.isUseAuth = true;
        /**暂不支持自动化测试OTA */
        this.isAutoTestOTA = false;
        this.autoTestOTACount = 1;
        this.changeMTU = 512;
        this.serviceUUID = "0000ae00-0000-1000-8000-00805f9b34fb";
        this.notifyCharacteristicUUID = "0000ae02-0000-1000-8000-00805f9b34fb";
        this.writeCharacteristicUUID = "0000ae01-0000-1000-8000-00805f9b34fb";
    }
}
export class BluetoothCallbackManager {
    constructor() {
        this.callbacks = Array();
    }
    addCallbacks(callback) {
        if (this.callbacks.indexOf(callback) == -1) {
            this.callbacks.push(callback);
        }
    }
    removeCallbacks(callback) {
        var index = this.callbacks.indexOf(callback);
        if (index != -1) {
            this.callbacks.splice(index, 1);
        }
    }
    //蓝牙适配器发生变化，外部实现wx.onBluetoothAdapterStateChange，则该回调无效
    onBluetoothAdapter(_availableBluetooth, _btAdapterInfo) {
        this._doAction({
            action: function (c) {
                if (c.onBluetoothAdapter) {
                    c.onBluetoothAdapter(_availableBluetooth, _btAdapterInfo);
                }
            }
        });
    }
    /**位置信息状态发送变化
     * @param availableLocation 位置信息是否可用，true：可用，false:不可用
     * @param locationAdapterInfo 位置信息状态信息
     */
    onLocation(_availableLocation, _locationAdapterInfo) {
        this._doAction({
            action: function (c) {
                if (c.onLocation) {
                    c.onLocation(_availableLocation, _locationAdapterInfo);
                }
            }
        });
    }
    //发现设备
    onFoundDev(devices) {
        this._doAction({
            action: function (c) {
                if (c.onFoundDev) {
                    c.onFoundDev(devices);
                }
            }
        });
    }
    //开始扫描设备
    onScanStart() {
        this._doAction({
            action: function (c) {
                if (c.onScanStart) {
                    c.onScanStart();
                }
            }
        });
    }
    //结束扫描设备
    onScanFinish() {
        this._doAction({
            action: function (c) {
                if (c.onScanFinish) {
                    c.onScanFinish();
                }
            }
        });
    }
    //扫描设备失败
    onScanFailed(err) {
        this._doAction({
            action: function (c) {
                if (c.onScanFailed) {
                    c.onScanFailed(err);
                }
            }
        });
    }
    /** 设备断开 */
    onDevStatusDisconnect(dev) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusDisconnect) {
                    c.onDevStatusDisconnect(dev);
                }
            }
        });
    }
    /** 设备连接失败 */
    onDevStatusFailed(dev) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusFailed) {
                    c.onDevStatusFailed(dev);
                }
            }
        });
    }
    /** 设备连接成功*/
    onDevStatusSuccess(dev) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusSuccess) {
                    c.onDevStatusSuccess(dev);
                }
            }
        });
    }
    /** 设备MTU改变 */
    onDevStatusMTUChange(dev, mtu) {
        this._doAction({
            action: function (c) {
                if (c.onDevStatusMTUChange) {
                    c.onDevStatusMTUChange(dev, mtu);
                }
            }
        });
    }
    _doAction(obj) {
        this.callbacks.forEach(c => {
            obj.action(c);
        });
    }
}
export class BluetoothEventCallback {
    //蓝牙适配器发生变化，外部实现wx.onBluetoothAdapterStateChange，则该回调无效
    // onAdapter(res: WechatMiniprogram.OnBluetoothAdapterStateChangeCallbackResult) { }
    /**蓝牙适配器状态发送变化
     * @param availableBluetooth 蓝牙是否可用，true：可用，false:不可用
     * @param btAdapterInfo 蓝牙适配器信息
     */
    onBluetoothAdapter(_availableBluetooth, _btAdapterInfo) { }
    /**位置信息状态发送变化
     * @param availableLocation 位置信息是否可用，true：可用，false:不可用
     * @param locationAdapterInfo 位置信息状态信息
     */
    onLocation(_availableLocation, _locationAdapterInfo) { }
    //发现设备
    onFoundDev(_devices) { }
    // 开始扫描设备
    onScanStart() { }
    // 开始扫描设备
    onScanFinish() { }
    //扫描设备失败
    onScanFailed(_err) { }
    /** 设备断开 */
    onDevStatusDisconnect(_dev) { }
    /** 设备连接失败 */
    onDevStatusFailed(_dev) { }
    /** 设备连接成功*/
    onDevStatusSuccess(_dev) { }
    /** 设备MTU改变 */
    onDevStatusMTUChange(_dev, _mtu) { }
}
