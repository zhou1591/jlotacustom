import { logv, logi, loge, ab2hex } from "./log";
export var BTBean;
(function (BTBean) {
    class BluetoothDevice {
        constructor() {
            /** 当前蓝牙设备的信号强度，单位 dBm */
            this.RSSI = 0;
            /** 当前蓝牙设备是否可连接（ Android 8.0 以下不支持返回该值 ） */
            this.connectable = true;
            /** 蓝牙设备 id */
            this.deviceId = "";
            /** 当前蓝牙设备的广播数据段中的 LocalName 数据段 */
            this.localName = "";
            /** 是不是系统已连接设备 */
            this.isSystem = false;
        }
        equals(o) {
            if (o == null)
                return false;
            if (this == o)
                return true;
            return this.deviceId == o.deviceId;
        }
    }
    BTBean.BluetoothDevice = BluetoothDevice;
    class BluetoothError {
        constructor(errorCode, errMsg) {
            this.errCode = BluetoothErrorConstant.ERROR_NONE;
            this.errCode = errorCode;
            this.errMsg = errMsg;
        }
    }
    BTBean.BluetoothError = BluetoothError;
    let BluetoothErrorConstant;
    (function (BluetoothErrorConstant) {
        //微信的api错误
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NONE"] = 0] = "ERROR_NONE";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_CONNECTED"] = -1] = "ERROR_CONNECTED";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_ADAPTER_NOT_INIT"] = 10000] = "ERROR_ADAPTER_NOT_INIT";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_ADAPTER_NOT_AVAILABLE"] = 10001] = "ERROR_ADAPTER_NOT_AVAILABLE";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NO_DEV"] = 10002] = "ERROR_NO_DEV";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_CONNECTION_FAIL"] = 10003] = "ERROR_CONNECTION_FAIL";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NO_SERVICE"] = 10004] = "ERROR_NO_SERVICE";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NO_CHARACTERISTIC"] = 10005] = "ERROR_NO_CHARACTERISTIC";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NO_CONNECTION"] = 10006] = "ERROR_NO_CONNECTION";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_PROPERTY_NOT_SUPOORT"] = 10007] = "ERROR_PROPERTY_NOT_SUPOORT";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_SYSTEM_ERROR"] = 10008] = "ERROR_SYSTEM_ERROR";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_SYSTEM_NOT_SUPPORT"] = 10009] = "ERROR_SYSTEM_NOT_SUPPORT";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_EPERATE_TIME_OUT"] = 10012] = "ERROR_EPERATE_TIME_OUT";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_INVALID_DATA"] = 10013] = "ERROR_INVALID_DATA";
        //自定义的蓝牙错误
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_INIT_MTU_FAIL"] = 20000] = "ERROR_INIT_MTU_FAIL";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_GET_SERVICE_FAIL"] = 20001] = "ERROR_GET_SERVICE_FAIL";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL"] = 20002] = "ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL";
        BluetoothErrorConstant[BluetoothErrorConstant["ERROR_IS_CONNECTING"] = 20003] = "ERROR_IS_CONNECTING";
    })(BluetoothErrorConstant = BTBean.BluetoothErrorConstant || (BTBean.BluetoothErrorConstant = {}));
})(BTBean || (BTBean = {}));
export var BTConnect;
(function (BTConnect) {
    class ConnectSettingConfigure {
        constructor() {
            /**mtu 23~512*/
            this.mtu = 512;
            /**使能的service*/
            this.notifyServiceArray = new Array();
            // /**必须使能的service*/
            // necessaryNotifyServiceArray: Array<BluetoothService> = new Array()
        }
    }
    BTConnect.ConnectSettingConfigure = ConnectSettingConfigure;
    class BluetoothService {
        constructor() {
            this.UUID = "";
            this.isPrimary = false;
            this.characteristicInfos = new Array();
        }
    }
    BTConnect.BluetoothService = BluetoothService;
    class BluetoothCharacteristic {
        constructor() {
            this.UUID = "";
            this.properties = {
                indicate: false,
                /** 该特征是否支持 notify 操作 */
                notify: false,
                /** 该特征是否支持 read 操作 */
                read: false,
                /** 该特征是否支持 write 操作 */
                write: false,
                /** 该特征是否支持有回复写操作 */
                writeDefault: false,
                /** 该特征是否支持无回复写操作 */
                writeNoResponse: false
            };
            /** 该特征值是否 启用notify*/
            this.isNotify = false;
            /** 该特征值是否 必须使能。必须使能的特征值使能失败时，即连接失败*/
            this.isNecessary = false;
        }
    }
    BTConnect.BluetoothCharacteristic = BluetoothCharacteristic;
    class BluetoothDeviceInfo {
        constructor() {
            this.mtu = -1;
            this.bluetoothServices = new Array();
        }
    }
    BTConnect.BluetoothDeviceInfo = BluetoothDeviceInfo;
    class ConnectImplCallback {
    }
    BTConnect.ConnectImplCallback = ConnectImplCallback;
    class ConnectCallback {
    }
    BTConnect.ConnectCallback = ConnectCallback;
    class ConnectImpl {
        constructor(platform) {
            this._platform = 'android';
            this._connectConfigure = new ConnectSettingConfigure();
            this._callbacks = new Array();
            this._connectingDeviceArray = new Array();
            this._connectedDeviceArray = new Array();
            this._bluetoothDeviceInfoMap = new Map();
            this._platform = platform;
            this._registerConnStatusListener();
            this._registerMTUChangeListener();
        }
        /**设置连接配置*/
        setConnectSettingConfigure(config) {
            this._connectConfigure = config;
        }
        /*添加回调*/
        addConnectCallback(callback) {
            if (this._callbacks.indexOf(callback) == -1) {
                this._callbacks.push(callback);
            }
        }
        /*移除回调*/
        removeConnectCallback(callback) {
            var index = this._callbacks.indexOf(callback);
            if (index != -1) {
                this._callbacks.splice(index, 1);
            }
        }
        connect(option) {
            const device = option.device;
            if (this.isConnected(device)) { //已连接
                option.success?.(this.getConnectedDeviceInfo(device));
                return;
            }
            if (this.isConnecting(device)) { //正在连接
                const error = {
                    errCode: BTBean.BluetoothErrorConstant.ERROR_IS_CONNECTING,
                    errMsg: 'is connecting'
                };
                option.fail?.(error);
                return;
            }
            this._addConnectingDeviceId(device);
            const connectOption = {
                deviceId: device.deviceId
            };
            if (this._connectConfigure.timeout) {
                connectOption.timeout = this._connectConfigure.timeout;
            }
            const initBluetooth = (res) => {
                if (this._updateDeviceIdMtu(device.deviceId, res.mtu)) {
                    this._onMTUChange(device, res.mtu);
                }
                this._getBLEDeviceServices(device).then((value) => {
                    this._updateDeviceBluetoothService(device.deviceId, value);
                    option.success?.(this.getConnectedDeviceInfo(device));
                    this._onConnectSuccess(device);
                }).catch((e) => {
                    this.disconnect(device);
                    option.fail?.(e);
                    this._onConnectFailed(device, e);
                });
            };
            const getBLEMTU = () => {
                const bleMTUOption = {
                    deviceId: device.deviceId, success: (res) => {
                        logv('调节MTU成功，' + JSON.stringify(res.mtu));
                        initBluetooth(res);
                    }, fail: (res) => {
                        loge('调节MTU失败，' + JSON.stringify(res));
                        this.disconnect(device);
                        const error = {
                            errCode: BTBean.BluetoothErrorConstant.ERROR_INIT_MTU_FAIL,
                            errMsg: 'init mtu fail'
                        };
                        option.fail?.(error);
                        this._onConnectFailed(device, error);
                    }
                };
                if (this._platform !== 'android') {
                    bleMTUOption.writeType = "writeNoResponse";
                }
                wx.getBLEMTU(bleMTUOption);
            };
            connectOption.success = () => {
                if (this._platform == 'android') { //Android获取MTU
                    wx.setBLEMTU({
                        deviceId: device.deviceId,
                        mtu: this._connectConfigure.mtu,
                        success: res => {
                            logv('调节MTU成功，' + res.mtu);
                            initBluetooth(res);
                        },
                        fail: (_res) => {
                            getBLEMTU();
                        }
                    });
                }
                else { //iOS获取MTU
                    setTimeout(() => {
                        getBLEMTU();
                    }, 100);
                }
            };
            connectOption.fail = (e) => {
                loge('连接失败，' + e.errCode);
                if (this.isConnecting(device)) {
                    option.fail?.(e);
                    this._onConnectFailed(device, e);
                }
            };
            wx.createBLEConnection(connectOption);
        }
        /** 断开已连接设备 */
        disconnect(device) {
            //todo 大概率三星手机有问题，蓝牙断开不会回调
            // if (this.isConnected(device)) {
            // }
            wx.closeBLEConnection({
                deviceId: device.deviceId,
            });
        }
        getConnectedDeviceInfo(device) {
            return this._getBluetoothDeviceInfo(device.deviceId);
        }
        /** 获取已连接设备列表*/
        getConnectedDevice() {
            return this._connectedDeviceArray;
        }
        /** 获取设备MTU*/
        getMTU(device) {
            if (this.isConnected(device)) {
                return this._bluetoothDeviceInfoMap.get(device.deviceId)?.mtu;
            }
            return undefined;
        }
        /** 是否正在连接*/
        isConnecting(device) {
            var position = -1;
            for (let index = 0; index < this._connectingDeviceArray.length; index++) {
                const element = this._connectingDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index;
                    break;
                }
            }
            // logv("isConnecting : " + (position != -1));
            return position != -1;
        }
        /** 是否已连接*/
        isConnected(device) {
            var position = -1;
            for (let index = 0; index < this._connectedDeviceArray.length; index++) {
                const element = this._connectedDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index;
                    break;
                }
            }
            // logv("isConnected : " + (position != -1));
            return position != -1;
        }
        _registerConnStatusListener() {
            // logv("注册连接状态回调");
            let that = this;
            //@ts-ignore
            let resFun = (res) => {
                // 该方法回调中可以用于处理连接意外断开等异常情况
                logv("蓝牙连接状态变化" + JSON.stringify(res));
                if (res.connected == false) {
                    const dev = new BTBean.BluetoothDevice();
                    dev.deviceId = res.deviceId;
                    if (this.isConnected(dev)) {
                        that._onConnectDisconnect(dev);
                    }
                }
            };
            wx.onBLEConnectionStateChange(resFun);
        }
        _registerMTUChangeListener() {
            wx.onBLEMTUChange((res) => {
                const dev = new BTBean.BluetoothDevice();
                dev.deviceId = res.deviceId;
                if (this.isConnected(dev)) {
                    if (this._updateDeviceIdMtu(res.deviceId, res.mtu)) {
                        this._onMTUChange(dev, res.mtu);
                    }
                }
            });
        }
        /**
       * 获取所有服务
       */
        _getBLEDeviceServices(device) {
            logv('获取所有服务的 uuid:' + device.deviceId);
            return new Promise((resolve, reject) => {
                wx.getBLEDeviceServices({
                    deviceId: device.deviceId,
                    success: async (res) => {
                        if (res.services.length <= 0) {
                            reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NO_SERVICE, "no service"));
                            return;
                        }
                        else {
                            const notifyUUIDMap = new Map();
                            const bluetoothServiceInfos = new Array();
                            for (const service of res.services) {
                                const bluetoothServiceInfo = new BluetoothService();
                                bluetoothServiceInfo.UUID = service.uuid;
                                bluetoothServiceInfo.isPrimary = service.isPrimary;
                                let notifyCharacteristicInfos = new Array();
                                // todo 没找对应的服务/特征值
                                for (let index = 0; index < this._connectConfigure.notifyServiceArray.length; index++) {
                                    const element = this._connectConfigure.notifyServiceArray[index];
                                    if (service.uuid.toLowerCase() === element.UUID.toLowerCase()) {
                                        notifyCharacteristicInfos = element.characteristicInfos;
                                        break;
                                    }
                                }
                                try {
                                    const characteristicInfos = await this._getBLEDeviceCharacteristics(device, service.uuid, notifyCharacteristicInfos);
                                    bluetoothServiceInfo.characteristicInfos = characteristicInfos;
                                    for (const characteristicInfo of characteristicInfos) {
                                        const key = service.uuid + "_" + characteristicInfo.UUID;
                                        notifyUUIDMap.set(key.toLocaleUpperCase(), true);
                                    }
                                }
                                catch (error) { //有必须使能的特征没使能
                                    return reject(error);
                                }
                                bluetoothServiceInfos.push(bluetoothServiceInfo);
                            }
                            for (let index = 0; index < this._connectConfigure.notifyServiceArray.length; index++) {
                                const element = this._connectConfigure.notifyServiceArray[index];
                                for (let j = 0; j < element.characteristicInfos.length; j++) {
                                    const characteristicInfo = element.characteristicInfos[j];
                                    if (characteristicInfo.isNecessary) { //该 characteristicInfo 必须使能
                                        const key = element.UUID + "_" + characteristicInfo.UUID;
                                        const isNotify = notifyUUIDMap.get(key.toLocaleUpperCase());
                                        if (isNotify != true) { //没有使能
                                            return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"));
                                        }
                                    }
                                }
                            }
                            resolve(bluetoothServiceInfos);
                        }
                    }, fail: error => {
                        loge('获取设备服务失败，错误码：' + error.errCode);
                        reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_GET_SERVICE_FAIL, "get service fail"));
                    }
                });
            });
        }
        /**
       * 获取某个服务下的所有特征值
       */
        _getBLEDeviceCharacteristics(device, serviceId, characteristics) {
            logv("获取某个服务下的所有特征值" + "\tdeviceId=" + device.deviceId + "\tserviceId=" + serviceId);
            return new Promise((resolve, reject) => {
                const characteristicInfos = new Array();
                wx.getBLEDeviceCharacteristics({
                    // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
                    deviceId: device.deviceId,
                    // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
                    serviceId,
                    success: async (res) => {
                        logv("getBLEDeviceCharacteristics" + "\tlist=" + JSON.stringify(res.characteristics));
                        for (const c of res.characteristics) {
                            const characteristicInfo = new BluetoothCharacteristic();
                            characteristicInfo.UUID = c.uuid;
                            Object.assign(characteristicInfo.properties, c.properties);
                            for (let index = 0; index < characteristics.length; index++) {
                                const charateristic = characteristics[index];
                                if (charateristic.UUID === c.uuid.toLowerCase()) {
                                    const notifyRes = await this._notifyBLECharacteristicValueChange({
                                        deviceId: device.deviceId,
                                        serviceId: serviceId,
                                        characteristicId: c.uuid,
                                    });
                                    characteristicInfo.isNotify = notifyRes;
                                    if (!notifyRes && charateristic.isNecessary == true) { //必须使能的特征使能失败
                                        return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"));
                                    }
                                }
                            }
                            characteristicInfos.push(characteristicInfo);
                        }
                        resolve(characteristicInfos);
                    },
                    fail: e => {
                        loge('获取特征值失败，错误码：' + e.errCode);
                        for (let index = 0; index < characteristics.length; index++) {
                            const charateristic = characteristics[index];
                            if (charateristic.isNecessary == true) { //必须使能的特征使能失败
                                return reject(new BTBean.BluetoothError(BTBean.BluetoothErrorConstant.ERROR_NOTIFY_NECESSRY_CHARATERISTIC_FAIL, "notify necessary charateristic fail"));
                            }
                        }
                        resolve(characteristicInfos);
                    }
                });
            });
        }
        /**
        * 订阅操作成功后需要设备主动更新特征值的 value，才会触发 wx.onBLECharacteristicValueChange 回调。
        */
        _notifyBLECharacteristicValueChange(obj) {
            return new Promise((resolve, reject) => {
                wx.notifyBLECharacteristicValueChange({
                    state: true, // 启用 notify 功能
                    // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
                    deviceId: obj.deviceId,
                    // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
                    serviceId: obj.serviceId,
                    // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
                    characteristicId: obj.characteristicId,
                    success: (res) => {
                        logv('使能通知成功：' + JSON.stringify(res) + " characteristicId : " + obj.characteristicId);
                        resolve(true);
                    },
                    fail: (err) => {
                        loge('使能通知失败' + JSON.stringify(err));
                        resolve(false);
                    }
                });
            });
        }
        _addConnectingDeviceId(device) {
            this._connectingDeviceArray.push(device);
        }
        _deleteConnectingDeviceId(device) {
            var position = -1;
            for (let index = 0; index < this._connectingDeviceArray.length; index++) {
                const element = this._connectingDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index;
                    break;
                }
            }
            if (position != -1) {
                this._connectingDeviceArray.splice(position, 1);
            }
        }
        _addConnectedDeviceId(device) {
            this._connectedDeviceArray.push(device);
        }
        _deleteConnectedDeviceId(device) {
            var position = -1;
            for (let index = 0; index < this._connectedDeviceArray.length; index++) {
                const element = this._connectedDeviceArray[index];
                if (element.deviceId.toLowerCase() === device.deviceId.toLowerCase()) {
                    position = index;
                    break;
                }
            }
            if (position != -1) {
                this._connectedDeviceArray.splice(position, 1);
            }
        }
        _getBluetoothDeviceInfo(deviceId) {
            return this._bluetoothDeviceInfoMap.get(deviceId);
        }
        _updateDeviceBluetoothService(deviceId, bluetoothServices) {
            let info = this._getBluetoothDeviceInfo(deviceId);
            if (info == undefined) {
                info = new BluetoothDeviceInfo();
                this._bluetoothDeviceInfoMap.set(deviceId, info);
            }
            info.bluetoothServices = bluetoothServices;
        }
        _updateDeviceIdMtu(deviceId, mtu) {
            let info = this._getBluetoothDeviceInfo(deviceId);
            if (info == undefined) {
                info = new BluetoothDeviceInfo();
                this._bluetoothDeviceInfoMap.set(deviceId, info);
            }
            else if (info.mtu == mtu) {
                return false; //相同
            }
            info.mtu = mtu;
            return true; //不同
        }
        _deleteDeviceInfo(deviceId) {
            this._bluetoothDeviceInfoMap.delete(deviceId);
        }
        _onMTUChange(device, mtu) {
            this._callbacks.forEach(c => {
                if (c.onMTUChange) {
                    c.onMTUChange(device, mtu);
                }
            });
        }
        _onConnectSuccess(device) {
            logv("_onConnectSuccess : " + device.deviceId);
            this._deleteConnectingDeviceId(device);
            this._addConnectedDeviceId(device);
            this._callbacks.forEach(c => {
                if (c.onConnectSuccess) {
                    c.onConnectSuccess(device);
                }
            });
        }
        _onConnectFailed(device, error) {
            this._deleteConnectingDeviceId(device);
            this._callbacks.forEach(c => {
                if (c.onConnectFailed) {
                    c.onConnectFailed(device, error);
                }
            });
        }
        _onConnectDisconnect(device) {
            this._deleteConnectedDeviceId(device);
            this._deleteDeviceInfo(device.deviceId);
            this._callbacks.forEach(c => {
                if (c.onConnectDisconnect) {
                    c.onConnectDisconnect(device);
                }
            });
        }
    }
    BTConnect.ConnectImpl = ConnectImpl;
})(BTConnect || (BTConnect = {}));
export var BTScan;
(function (BTScan) {
    class ScanCallback {
    }
    BTScan.ScanCallback = ScanCallback;
    class ScanSettingConfigure {
        constructor() {
            /**是否包含系统设备*/
            this.isContainSystemsConnectedDevice = false;
            /** 是否打开扫描超时 todo 后续拓展*/
            this.isOpenScanTimeout = true;
            /** 扫描超时时间*/
            this.scanTimeOut = 30000;
            /** 允许重复上报同一个设备*/
            this.allowDuplicatesKey = true;
            /** 上报设备的间隔，单位 ms。0 表示找到新设备立即上报，其他数值根据传入的间隔上报。*/
            this.interval = 0;
            /** 扫描模式*/
            this.powerLevel = 'medium';
        }
    }
    BTScan.ScanSettingConfigure = ScanSettingConfigure;
    class ScanImpl {
        constructor(platform) {
            this._platform = "android";
            this._isScanning = false;
            this._callbacks = new Array();
            this._scanDevList = new Array();
            this._platform = platform;
            this._scanSettingConfigure = new ScanSettingConfigure();
        }
        /*是否正在扫描*/
        isScanning() {
            return this._isScanning;
        }
        /*添加回调*/
        addScanCallback(callback) {
            if (this._callbacks.indexOf(callback) == -1) {
                this._callbacks.push(callback);
            }
        }
        /*移除回调*/
        removeScanCallback(callback) {
            var index = this._callbacks.indexOf(callback);
            if (index != -1) {
                this._callbacks.splice(index, 1);
            }
        }
        /*开始扫描*/
        startScan(scanTimeOut) {
            if (scanTimeOut) { //更新扫描时间
                this._scanSettingConfigure.scanTimeOut = scanTimeOut;
            }
            if (this._isScanning) { //正在扫描中		
                this.refreshScan();
            }
            else {
                this._scanDevList = new Array();
                this._stopTiming();
                this._startTiming();
                this._startScan();
            }
        }
        /*刷新扫描*/
        refreshScan() {
            if (this._isScanning) { //正在扫描
                this._scanDevList = new Array();
                this._stopTiming();
                this._startTiming();
            }
        }
        /*停止扫描*/
        stopScan() {
            this._stopTiming();
            if (this._scanSystemConnectedDevInterval) {
                clearInterval(this._scanSystemConnectedDevInterval);
            }
            this._stopScan();
        }
        /*获取扫描配置*/
        getScanSettingConfigure() {
            return this._scanSettingConfigure;
        }
        /*设置扫描配置*/
        setScanSettingConfigure(scanSettingConfigure) {
            this._scanSettingConfigure = scanSettingConfigure;
        }
        _startScan() {
            logi("开始搜索蓝牙设备");
            wx.startBluetoothDevicesDiscovery({
                services: this._scanSettingConfigure.filterServic,
                allowDuplicatesKey: this._scanSettingConfigure.allowDuplicatesKey,
                interval: this._scanSettingConfigure.interval,
                powerLevel: this._scanSettingConfigure.powerLevel,
                success: e => {
                    logi('开始搜索蓝牙设备成功:' + e.errMsg);
                    this._isScanning = true;
                    this._onScanStart();
                    this._onBluetoothDeviceFound();
                    if (this._scanSettingConfigure.isContainSystemsConnectedDevice) {
                        this._onSystemConnectedDeviceFound();
                    }
                },
                fail: e => {
                    loge('搜索蓝牙设备失败，错误码：' + e.errCode);
                    this._stopTiming();
                    this._onScanFailed(e);
                }
            });
        }
        _stopScan() {
            this._isScanning = false;
            wx.stopBluetoothDevicesDiscovery();
            //@ts-ignore
            wx.offBluetoothDeviceFound();
            this._onScanFinish();
        }
        _onBluetoothDeviceFound() {
            wx.onBluetoothDeviceFound((res) => {
                // logv(" _onBluetoothDeviceFound 1: " + JSON.stringify(res))
                const scanDevs = new Array();
                res.devices.forEach(device => {
                    scanDevs.push(Object.assign(new BTBean.BluetoothDevice(), device));
                });
                this._handlerFoundDevcie(scanDevs);
            });
        }
        _handlerFoundDevcie(scanDevs) {
            let isChange = false;
            for (let i = 0; i < scanDevs.length; i++) {
                const scanDevice = scanDevs[i];
                let isContain = false;
                for (let y = 0; y < this._scanDevList.length; y++) {
                    const element = this._scanDevList[y];
                    if (scanDevice.deviceId === element.deviceId) {
                        isContain = true;
                        if (scanDevice.RSSI !== element.RSSI || (ab2hex(scanDevice.advertisData) !== ab2hex(element.advertisData))) {
                            this._scanDevList[y] = scanDevice;
                            isChange = true;
                        }
                        break;
                    }
                }
                if (!isContain) {
                    isChange = true;
                    this._scanDevList.push(scanDevice);
                }
            }
            if (isChange) {
                this._onFound(this._scanDevList);
            }
        }
        /** 系统已连接设备*/
        _onSystemConnectedDeviceFound() {
            this._scanSystemConnectedDevInterval = setInterval(() => {
                this._getSystemConnectedDevice({
                    success: (scanDevices) => {
                        this._handlerFoundDevcie(scanDevices);
                    }, fail: (error) => {
                        loge("_onSystemConnectedDeviceFound errCode: " + error.errCode + "  errMsg:" + error.errMsg);
                    }
                });
            }, 500);
        }
        _getSystemConnectedDevice(callback) {
            const obj = { services: [] };
            if (this._scanSettingConfigure.filterServic != undefined) {
                obj.services = this._scanSettingConfigure.filterServic;
            }
            else {
                if (this._platform == 'ios') {
                    obj.services = ['1800'];
                    // obj.services = ['AE00']
                    // obj.services = ['1812']
                }
                else {
                    obj.services = new Array();
                }
            }
            obj.success = (res) => {
                // logv("getConnectedBluetoothDevices : " ,res)
                const resultArray = new Array();
                for (let index = 0; index < res.devices.length; index++) {
                    const device = res.devices[index];
                    const blueToothDevice = new BTBean.BluetoothDevice();
                    blueToothDevice.deviceId = device.deviceId;
                    blueToothDevice.localName = device.name;
                    blueToothDevice.name = device.name;
                    blueToothDevice.serviceData = {};
                    blueToothDevice.advertisData = new ArrayBuffer(0);
                    blueToothDevice.advertisServiceUUIDs = [];
                    blueToothDevice.isSystem = true;
                    resultArray.push(blueToothDevice);
                }
                callback.success(resultArray);
            };
            obj.fail = (res) => {
                callback.fail(res);
            };
            wx.getConnectedBluetoothDevices(obj);
        }
        _stopTiming() {
            if (this._scanTimeoutID) {
                clearTimeout(this._scanTimeoutID);
            }
            this._scanTimeoutID = undefined;
        }
        _startTiming() {
            let result = false;
            if (!this._scanTimeoutID) {
                this._scanTimeoutID = setTimeout(() => {
                    if (this._scanSystemConnectedDevInterval) {
                        clearInterval(this._scanSystemConnectedDevInterval);
                    }
                    this._stopScan();
                }, this._scanSettingConfigure.scanTimeOut);
                result = true;
            }
            else { //扫描定时器不为空
            }
            return result;
        }
        _onScanStart() {
            loge("_onScanStart");
            this._callbacks.forEach(c => {
                if (c.onScanStart) {
                    c.onScanStart();
                }
            });
        }
        _onScanFailed(error) {
            loge("_onScanFailed:" + JSON.stringify(error));
            this._callbacks.forEach(c => {
                if (c.onScanFailed) {
                    c.onScanFailed(error);
                }
            });
        }
        _onScanFinish() {
            loge("_onScanFinish");
            this._callbacks.forEach(c => {
                if (c.onScanFinish) {
                    c.onScanFinish();
                }
            });
        }
        _onFound(devices) {
            this._callbacks.forEach(c => {
                if (c.onFound) {
                    c.onFound(devices);
                }
            });
        }
    }
    BTScan.ScanImpl = ScanImpl;
})(BTScan || (BTScan = {}));
export var BTAdapter;
(function (BTAdapter) {
    class LocationAdapterInfo {
        constructor() {
            /**位置信息是否打开*/
            this.locationEnabled = false;
            /**位置信息-微信App权限*/
            this.locationAuthorized = false;
            /**位置信息-小程序权限*/
            this.locationSetting = false;
        }
    }
    BTAdapter.LocationAdapterInfo = LocationAdapterInfo;
    class BTAdapterInfo {
        constructor(bluetoothEnabled, bluetoothSetting) {
            /**不支持蓝牙功能*/
            this.bluetoothSupport = true;
            /**蓝牙适配器初始化*/
            this.bluetoothInit = true;
            /**蓝牙是否打开*/
            this.bluetoothEnabled = false;
            /**蓝牙小程序权限*/
            this.bluetoothSetting = false;
            this.bluetoothEnabled = bluetoothEnabled;
            this.bluetoothSetting = bluetoothSetting;
        }
    }
    BTAdapter.BTAdapterInfo = BTAdapterInfo;
    //适配器，蓝牙状态，权限
    /**
     * 微信的扫描权限，小程序授权，系统蓝牙有没有打开
     * 有没有打开位置信息
     * 位置信息和蓝牙适配器是分开的
    */
    class BluetoothAdapter {
        constructor() {
            this._availableBluetooth = false;
            this._availableLocation = false;
            this._listeners = new Array();
            //监听蓝牙适配器状态
            this._registerAdapterStatusListener();
        }
        registerBluetoothAdapterListener(listener) {
            if (this._listeners.indexOf(listener) == -1) {
                this._listeners.push(listener);
            }
        }
        unregisterBluetoothAdapterListener(listener) {
            var index = this._listeners.indexOf(listener);
            if (index != -1) {
                this._listeners.splice(index, 1);
            }
        }
        checkBluetoothAdapter() {
            return new Promise((resolve, reject) => {
                const errFun = async () => {
                    const systemInfo = wx.getSystemInfoSync();
                    //蓝牙是否可用
                    systemInfo.bluetoothEnabled;
                    //小程序授权-蓝牙授权
                    const bluetoothSetting = await this._getBluetoothSettingStatus();
                    const info = new BTAdapterInfo(systemInfo.bluetoothEnabled, bluetoothSetting);
                    return info;
                };
                wx.getBluetoothAdapterState({
                    success: async (res) => {
                        if (res.available) {
                            this._onBluetoothAdapter(true);
                            resolve(true);
                        }
                        else {
                            const info = await errFun();
                            this._onBluetoothAdapter(false, info);
                            reject(info);
                        }
                    },
                    fail: async (e) => {
                        // loge("err ", e);
                        const info = await errFun();
                        if (e.errCode == 10000) { //蓝牙未初始化
                            info.bluetoothInit = false;
                        }
                        else if (e.errCode == undefined) { //没有错误code，暗示不支持蓝牙功能
                            info.bluetoothSupport = false;
                        }
                        else {
                        }
                        this._onBluetoothAdapter(false, info);
                        reject(info);
                    }
                });
            });
        }
        /**
         * 打开蓝牙适配器
         */
        openBluetoothAdapter(callback) {
            wx.openBluetoothAdapter({
                success: () => {
                    callback?.success();
                },
                fail: (_error) => {
                    callback?.fail();
                }
            });
        }
        closeBluetoothAdapter(callback) {
            wx.closeBluetoothAdapter({
                success: () => {
                    callback?.success();
                },
                fail: (_error) => {
                    callback?.fail();
                }
            });
        }
        checkLocation() {
            return new Promise((resolve, reject) => {
                wx.getLocation({
                    type: 'wgs84',
                    success: (res) => {
                        resolve(true);
                        this._onLocation(true);
                    }, fail: async (err) => {
                        const systemInfo = wx.getSystemInfoSync();
                        systemInfo.locationAuthorized;
                        const info = new LocationAdapterInfo();
                        //定位权限是否授权
                        info.locationAuthorized = systemInfo.locationAuthorized;
                        //位置信息是否可用
                        info.locationEnabled = systemInfo.locationEnabled;
                        //小程序授权-位置信息授权
                        const locationSetting = await this._getLocationSettingStatus();
                        info.locationSetting = locationSetting;
                        reject(info);
                        this._onLocation(false, info);
                    }
                });
            });
        }
        /**
         * 授权小程序-蓝牙授权
        */
        authorizeBluetooth() {
            return this._authorizeSetting('scope.bluetooth');
        }
        /**
         * 授权小程序-定位授权
        */
        authorizeLocation() {
            return this._authorizeSetting('scope.userLocation');
        }
        _authorizeSetting(setting) {
            return new Promise((resolve, reject) => {
                this._getSettingStatus(setting).then((status) => {
                    if (status == false) { //未授权
                        wx.authorize({
                            scope: setting,
                            success: () => {
                                resolve(true);
                            },
                            fail: (e) => {
                                // loge("授权失败", e);
                                resolve(false);
                            }
                        });
                    }
                    else { //已授权
                        resolve(true);
                    }
                }).catch((e) => {
                    reject(e);
                });
            });
        }
        _registerAdapterStatusListener() {
            //在小程序的设置界面修改权限，这里无法监听到
            wx.onBluetoothAdapterStateChange((res) => {
                // loge("onBluetoothAdapterStateChange, available=" + res.available);
                loge("onBluetoothAdapterStateChange, available=" + res.available);
                if (res.available == false) {
                    this.checkBluetoothAdapter();
                }
                else {
                    this._onBluetoothAdapter(true);
                }
            });
        }
        /**
         * 获取小程序蓝牙授权状态
        */
        _getBluetoothSettingStatus() {
            return this._getSettingStatus("scope.bluetooth");
        }
        /**
         * 获取小程序定位授权状态
        */
        _getLocationSettingStatus() {
            return this._getSettingStatus("scope.userLocation");
        }
        /**
        * 获取小程序授权状态
        */
        _getSettingStatus(setting) {
            return new Promise((resolve, reject) => {
                wx.getSetting({
                    success(res) {
                        //@ts-ignore
                        const status = res.authSetting[setting];
                        if (status) {
                            resolve(status);
                        }
                        else {
                            resolve(false);
                        }
                    }, fail(e) {
                        reject(e);
                    }
                });
            });
        }
        _onBluetoothAdapter(availableBluetooth, btAdapterInfo) {
            if (availableBluetooth == this._availableBluetooth) {
                return;
            }
            this._availableBluetooth = availableBluetooth;
            this._listeners.forEach(element => {
                element.onBluetoothAdapter(availableBluetooth, btAdapterInfo);
            });
        }
        _onLocation(availableLocation, info) {
            if (availableLocation == this._availableLocation) {
                return;
            }
            this._availableLocation = availableLocation;
            this._listeners.forEach(element => {
                element.onLocation(availableLocation, info);
            });
        }
    }
    BTAdapter.BluetoothAdapter = BluetoothAdapter;
})(BTAdapter || (BTAdapter = {}));
export var BTManager;
(function (BTManager) {
    class BluetoothImpl {
        constructor() {
            // wx.getLocation({})//让微信申请扫描权限
            this._platform = wx.getSystemInfoSync().platform;
            this._btScan = new BTScan.ScanImpl(this._platform);
            this._btConnect = new BTConnect.ConnectImpl(this._platform);
            this._btAdapter = new BTAdapter.BluetoothAdapter();
        }
        /************************************  扫描   *********************************/
        /*是否正在扫描*/
        isScanning() {
            return this._btScan.isScanning();
        }
        /*添加回调*/
        addScanCallback(callback) {
            this._btScan.addScanCallback(callback);
        }
        /*移除回调*/
        removeScanCallback(callback) {
            this._btScan.removeScanCallback(callback);
        }
        /*开始扫描*/
        startScan(scanTimeOut) {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btScan.startScan(scanTimeOut);
                }
            }).catch((e) => {
                throw (e);
            });
        }
        /*刷新扫描*/
        refreshScan() {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btScan.refreshScan();
                }
            }).catch((e) => {
                throw (e);
            });
        }
        /*停止扫描*/
        stopScan() {
            this._btScan.stopScan();
        }
        /*获取扫描配置*/
        getScanSettingConfigure() {
            return this._btScan.getScanSettingConfigure();
        }
        /*设置扫描配置*/
        setScanSettingConfigure(scanSettingConfigure) {
            this._btScan.setScanSettingConfigure(scanSettingConfigure);
        }
        /************************************  连接   *********************************/
        /**设置连接配置*/
        setConnectSettingConfigure(config) {
            this._btConnect.setConnectSettingConfigure(config);
        }
        /*添加回调*/
        addConnectCallback(callback) {
            this._btConnect.addConnectCallback(callback);
        }
        /*移除回调*/
        removeConnectCallback(callback) {
            this._btConnect.removeConnectCallback(callback);
        }
        /** 连接设备*/
        connect(option) {
            this._btAdapter.checkBluetoothAdapter().then((res) => {
                if (res) {
                    this._btConnect.connect(option);
                }
            }).catch((e) => {
                throw (e);
            });
        }
        /** 断开已连接设备 */
        disconnect(device) {
            this._btConnect.disconnect(device);
        }
        /** 获取已连接设备列表*/
        getConnectedDevice() {
            return this._btConnect.getConnectedDevice();
        }
        /** 获取设备MTU*/
        getMTU(device) {
            return this._btConnect.getMTU(device);
        }
        /** 是否正在连接*/
        isConnecting(device) {
            return this._btConnect.isConnecting(device);
        }
        /** 是否已连接*/
        isConnected(device) {
            return this._btConnect.isConnected(device);
        }
        /************************************  适配器   *********************************/
        registerBluetoothAdapterListenner(listener) {
            this._btAdapter.registerBluetoothAdapterListener(listener);
        }
        unregisterBluetoothAdapterListenner(listener) {
            this._btAdapter.unregisterBluetoothAdapterListener(listener);
        }
        /** 打开蓝牙适配器*/
        openBluetoothAdapter(callback) {
            return this._btAdapter.openBluetoothAdapter(callback);
        }
        /** 检查蓝牙适配器*/
        checkBluetoothAdapter() {
            return this._btAdapter.checkBluetoothAdapter();
        }
        /** 检查位置信息*/
        checkLocation() {
            return this._btAdapter.checkLocation();
        }
        /** 授权小程序-蓝牙授权*/
        authorizeBluetooth() {
            return this._btAdapter.authorizeBluetooth();
        }
        /** 授权小程序-定位授权*/
        authorizeLocation() {
            return this._btAdapter.authorizeLocation();
        }
        /** 跳转到系统微信授权管理页面*/
        openAppAuthorizeSetting(option) {
            wx.openAppAuthorizeSetting(option);
        }
        /** 跳转到系统微信授权管理页面*/
        openSystemBluetoothSetting(option) {
            wx.openSystemBluetoothSetting(option);
        }
    }
    BTManager.BluetoothImpl = BluetoothImpl;
})(BTManager || (BTManager = {}));
// export var BluetoothInstance = new BTManager.BluetoothImpl()
