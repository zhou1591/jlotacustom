import { BluetoothEventCallback } from "../../lib/bluetoothOTAManager";
import { logv } from "../../lib/log";
// pages/pageConnect/pageConnect.ts
const app = getApp();
var sBluetoothManager;
var sBluetoothEventCallback;
Page({
    /**
     * 页面的初始数据
     */
    data: {
        isScaning: false,
        triggered: false,
        filterDevName: '',
        connectedDevice: null,
        scanDevices: [],
    },
    _freshing: false,
    _foundSrcDevlist: new Array(),
    /**
     * 生命周期函数--监听页面加载
     */
    onLoad() {
        const value = wx.getStorageSync('filterDevName');
        if (value) {
            this.setData({ filterDevName: value });
        }
        sBluetoothManager = app.globalData.bluetoothManager;
        sBluetoothEventCallback = new BluetoothEventCallback();
        sBluetoothEventCallback.onBluetoothAdapter = this._onBluetoothAdapter;
        sBluetoothEventCallback.onLocation = this._onLocation;
        sBluetoothEventCallback.onScanStart = this._onScanStart;
        sBluetoothEventCallback.onScanFailed = this._onScanFailed;
        sBluetoothEventCallback.onScanFinish = this._onScanFinish;
        sBluetoothEventCallback.onFoundDev = this._OnFoundDevs;
        sBluetoothEventCallback.onDevStatusSuccess = this._onDevConnectSuccess;
        sBluetoothEventCallback.onDevStatusDisconnect = this._onDevDisconnect;
        sBluetoothEventCallback.onDevStatusFailed = this._onDevConnectFailed;
        sBluetoothManager.addBluetoothEventCallback(sBluetoothEventCallback);
        // this._scanDevice()
        sBluetoothManager.sanDevice();
    },
    onShow() {
        if (typeof this.getTabBar === 'function' && this.getTabBar()) {
            this.getTabBar().setData({
                selected: 0
            });
        }
    },
    onUnload() {
        sBluetoothManager.removeBluetoothEventCallback(sBluetoothEventCallback);
    },
    onSelectedDevice: function (e) {
        logv(e.currentTarget.dataset.item);
        let device = e.currentTarget.dataset.item;
        let connectedDevices = sBluetoothManager.getConnectedDevice();
        if (connectedDevices != null && connectedDevices.length > 0) { //已连接设备
            if (!sBluetoothManager.isConnected(device)) {
                wx.showToast({
                    title: '请先断开已连接的设备',
                    icon: 'none'
                });
                return;
            }
            else {
                wx.showModal({
                    title: '提示',
                    content: '是否要断开该设备',
                    success(res) {
                        if (res.confirm) {
                            sBluetoothManager.disconnectDevice(device);
                        }
                    }
                });
            }
        }
        else {
            wx.showLoading({
                title: '连接中',
            });
            logv(" 连接中", device);
            sBluetoothManager.connectDevice(device);
        }
    },
    onRefresh() {
        if (this._freshing)
            return;
        this._freshing = true;
        if (!this.data.triggered) {
            this.setData({
                triggered: true
            });
        } //保证刷新状态下，triggered为true  
        sBluetoothManager.sanDevice();
        setTimeout(() => {
            this.setData({
                triggered: false, //触发onRestore，关闭刷新图标  
            });
            this._freshing = false;
        }, 1500);
    },
    onSetFilter() {
        wx.showModal({
            title: "设备过滤条件",
            editable: true,
            content: this.data.filterDevName,
            success: (res) => {
                if (res.confirm) {
                    this.setData({
                        filterDevName: res.content
                    });
                    this._filterDevName(this._foundSrcDevlist);
                    wx.setStorageSync('filterDevName', res.content);
                }
                else if (res.cancel) {
                }
            }
        });
    },
    _onBluetoothAdapter(_availableBluetooth, _btAdapterInfo) {
    },
    _onLocation(_availableLocation, _locationAdapterInfo) {
    },
    _onScanStart() {
        this.setData({ isScaning: true });
    },
    _onScanFailed(_err) {
        this.setData({ isScaning: false });
    },
    _onScanFinish() {
        this.setData({ isScaning: false });
    },
    lastUpDateTime: 0,
    _OnFoundDevs(devices) {
        const time = new Date().getTime();
        if (time - this.lastUpDateTime < 750) {
            return;
        }
        this.lastUpDateTime = time;
        let devicesTemp;
        devicesTemp = devices.sort(function (a, b) { return b.RSSI - a.RSSI; });
        this._foundSrcDevlist = devicesTemp;
        this._filterDevName(this._foundSrcDevlist);
    },
    _filterDevName(devs) {
        const filterDevName = this.data.filterDevName.toLowerCase();
        const tempList = new Array();
        const connectedDevices = sBluetoothManager.getConnectedDevice();
        if (connectedDevices != null) {
            connectedDevices.forEach(element => {
                if (element.name && element.name.toLowerCase().includes(filterDevName)) {
                    tempList.push(element);
                }
            });
        }
        devs.forEach(e => {
            const devName = e.name?.toLowerCase();
            const isConnected = sBluetoothManager.isConnected(e.deviceId); //connectedDevices != null && connectedDevices.deviceId === e.deviceId
            if (e.RSSI <= 0 && devName && devName.includes(filterDevName) && !isConnected) {
                tempList.push(e);
            }
        });
        this.setData({ scanDevices: tempList });
    },
    _onDevDisconnect: function (result) {
        this.setData({
            connectedDevice: null
        });
    },
    _onDevConnectFailed: function (result) {
        this.setData({
            connectedDevice: null
        });
        wx.hideLoading({
            success: () => {
                wx.showToast({
                    title: '连接失败',
                    icon: 'none'
                });
            },
        });
    },
    _onDevConnectSuccess: function (device) {
        this.setData({
            connectedDevice: device
        });
        wx.hideLoading({
            success: () => {
                wx.showToast({
                    title: '连接成功',
                    icon: 'none'
                });
            },
        });
    },
});
