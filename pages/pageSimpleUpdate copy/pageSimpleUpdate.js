// pages/pageUpdate/pageUpdate.ts
import {
  BluetoothEventCallback
} from "../../lib/bluetoothOTAManager";
import {
  OTAConfig,
  UpgradeType
} from "../../lib/jl_lib/jl_ota_2.1.1";
import {
  loge,
  logv
} from "../../lib/log";
import {
  UpgradeFileUtil
} from "../../lib/upgradeFileUtil";
const app = getApp();
var sBluetoothManager
Page({
  /**
   * 页面的初始数据
   */
  data: {
    connectedDevice: null,
    filterDevName: '',
    isScaning: false,
    scanDevices: [],
    isBleConnect: false,
    fileArray: new Array(),
    fileIndex: -1,
    _freshing: false,
    fileSize: 0,
    showOta: false,
    isShowProgress: false, //展示OTA升级界面
    mValue: 0, //进度 0-100
    mOtaFile: "otaUpdate.ufw", //OTA文件名
    mFailReason: "ota Fail", //失败原因 
    mOtaResult: 0, //0:成功 1:失败
    mStatus: 0, //0:检验中 1:升级中 2:回连设备 3:升级成功 4:升级失败
    isShowLoading: false,
    mLoadingText: "加载升级文件",
    routerQuery: '',
    binUrl: ''
  },
  upgradeData: new Uint8Array(0),
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(query) {
    // const q = decodeURIComponent(query.q) // 获取到二维码原始链接内容
    const q = 'http://hqx2.zhoujingsong.com?ble=BleSmartC9C0&url=https://download2.haoqixingstem.com/hardware/ST01/35.bin'
    this.setData({
      routerQuery: decodeURIComponent(q),
    })
    const queryBleAfter = q.split('?ble=').pop()
    let [ble, binUrl] = queryBleAfter.split('&url=')
    binUrl = decodeURIComponent(binUrl)
    console.log(ble, binUrl)
    if (ble.startsWith('BleSmart') && binUrl.startsWith('http')) {
      this.setData({
        filterDevName: ble,
        binUrl
      })
    } else {
      wx.showToast({
        title: '二维码中蓝牙信息不存在请重新扫描',
        icon: 'none',
      });
    }
    sBluetoothManager = app.globalData.bluetoothManager;
    const bluetoothEventCallback = new BluetoothEventCallback();


    bluetoothEventCallback.onBluetoothAdapter = this._onBluetoothAdapter;
    bluetoothEventCallback.onLocation = this._onLocation;
    bluetoothEventCallback.onScanStart = this._onScanStart;
    bluetoothEventCallback.onScanFailed = this._onScanFailed;
    bluetoothEventCallback.onScanFinish = this._onScanFinish;
    bluetoothEventCallback.onFoundDev = this._OnFoundDevs;


    /** 设备断开 */
    bluetoothEventCallback.onDevStatusDisconnect = (dev) => {
      this._checkIsConnected();
    };
    /** 设备连接失败 */
    bluetoothEventCallback.onDevStatusFailed = (dev) => {
      this._checkIsConnected();
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
    };
    /** 设备连接成功*/
    bluetoothEventCallback.onDevStatusSuccess = (dev) => {
      this._checkIsConnected();
      this.setData({
        connectedDevice: dev
      });
      wx.hideLoading({
        success: () => {
          wx.showToast({
            title: '连接成功，准备升级',
            icon: 'none'
          });
        },
        complete: () => {
          console.log(this.onUpdate)
          this.onUpdate()
        }
      });
    };
    sBluetoothManager.addBluetoothEventCallback(bluetoothEventCallback);

    sBluetoothManager.sanDevice();
    // 扫描文件
    this._onUpgradeFileInfoList(UpgradeFileUtil.getUpgradeFileInfos());
    UpgradeFileUtil.setListener({
      onUpgradeFileInfoList: (infoList) => {
        this._onUpgradeFileInfoList(infoList);
      }
    });
  },
  onShow(query) {
    this._checkIsConnected();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1,
        // enable:false //todo 暂时性处理，应该让弹窗遮罩罩住整个小程序的
      });
      this.getTabBar;
    }
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
      } else {
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
    } else {
      wx.showLoading({
        title: '连接中',
      });
      logv(" 连接中", device);
      sBluetoothManager.connectDevice(device);
    }
  },


  _onBluetoothAdapter(_availableBluetooth, _btAdapterInfo) {},
  _onLocation(_availableLocation, _locationAdapterInfo) {},
  _onScanStart() {
    this.setData({
      isScaning: true
    });
  },
  _onScanFailed(_err) {
    this.setData({
      isScaning: false
    });
  },
  _onScanFinish() {
    this.setData({
      isScaning: false
    });
  },
  lastUpDateTime: 0,
  _OnFoundDevs(devices) {
    const time = new Date().getTime();
    if (time - this.lastUpDateTime < 750) {
      return;
    }
    this.lastUpDateTime = time;
    let devicesTemp;
    devicesTemp = devices.sort(function (a, b) {
      return b.RSSI - a.RSSI;
    });
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
      if (e.RSSI <= 0 && devName && devName.includes(filterDevName || 'blesmart') && !isConnected) {
        e.formatName = 'XiaoQ' + e.name.slice(8)
        tempList.push(e);
      }
    });
    // 过滤是否又匹配的蓝牙
    if (!this.data.connectedDevice) {
      const activateDevice = this.data.scanDevices.find(el => el.name === this.data.filterDevName)
      if (activateDevice) {
        sBluetoothManager.connectDevice(activateDevice);
      }
    }
    this.setData({
      scanDevices: tempList
    });
  },


  showLoadingView: function () {
    this.setData({
      isShowLoading: true
    });
  },
  dismissLoadingView: function () {
    this.setData({
      isShowLoading: false
    });
  },
  onAddOTAFile: function () {
    logv("读取文件...");
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      success: res => {
        const addFileArray = res.tempFiles;
        if (addFileArray.length > 1) { //多个文件跳过重命名
          const infos = new Array();
          for (let index = 0; index < addFileArray.length; index++) {
            const element = addFileArray[index];
            infos.push({
              fileName: element.name,
              fileSrcPath: element.path,
              fileSize: element.size
            });
          }
          UpgradeFileUtil.addUpgradeFiles(infos).then((res) => {
            wx.showToast({
              title: '导入成功',
              icon: 'success'
            });
          }).catch((error) => {
            if (error == 1300202) {
              wx.showToast({
                title: '导入失败，小程序剩余使用空间不足(上限200MB)',
                icon: 'none'
              });
            }
          });
        } else if (addFileArray.length == 1) { //单个文件重命名
          const file = addFileArray[0];
          wx.showModal({
            title: "请输入文件名",
            content: file.name,
            editable: true,
            success: (res) => {
              if (res.confirm == true) {
                UpgradeFileUtil.addUpgradeFile(res.content, file.path, file.size).then((res) => {
                  wx.showToast({
                    title: '导入成功',
                    icon: 'success'
                  });
                }).catch((error) => {
                  if (error == 1300202) {
                    wx.showToast({
                      title: '导入失败，小程序剩余使用空间不足(上限200MB)',
                      icon: 'none'
                    });
                  }
                });
              } else if (res.cancel == true) {
                wx.showToast({
                  title: '取消保存',
                  icon: 'none'
                });
              }
            }
          });
        }
      },
      fail: e => {
        loge(e);
        this.dismissLoadingView();
        wx.hideLoading({
          success: () => {
            wx.showToast({
              title: '数据错误',
              icon: 'none'
            });
          },
        });
      }
    });
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

  onLongTapFile(e) {
    const index = e.currentTarget.dataset.index;
    wx.showActionSheet({
      itemList: ['删除文件', '转发文件到聊天'],
      success: (res) => {
        const file = this.data.fileArray[index];
        if (res.tapIndex === 0) {
          if (this.data.fileIndex == index) {
            this.setData({
              fileIndex: -1,
              mOtaFile: "",
            });
          }
          UpgradeFileUtil.removeUpgradeFile(file);
        } else if (res.tapIndex === 1) {
          wx.shareFileMessage({
            filePath: file.filePath,
            fileName: file.fileName,
            success: (res) => {
              // wx.showToast({ title: "转发成功" })
            },
            fail: (res) => {
              wx.showToast({
                title: "转发失败,msg:" + res.errMsg
              });
            }
          });
        }
      }
    });
  },
  onSelectedFile: function (e) {
    if (this.data.fileIndex == e.currentTarget.dataset.index) {
      this.setData({
        fileIndex: -1,
        mOtaFile: "",
      });
      return;
    }
    const selectedFile = this.data.fileArray[e.currentTarget.dataset.index];
    this.showLoadingView();
    const fs = wx.getFileSystemManager();
    try {
      const fd = fs.openSync({
        filePath: selectedFile.filePath
      });
      const uint8 = new Uint8Array(selectedFile.fileSize);
      fs.read({
        fd: fd,
        arrayBuffer: uint8.buffer,
        length: selectedFile.fileSize,
        success: _res => {
          this.upgradeData = uint8;
          logv("------------读取文件成功------------");
          setTimeout(() => {
            this.dismissLoadingView();
            wx.showToast({
              title: '加载成功',
              icon: 'none'
            });
          }, 200);
          fs.closeSync({
            fd: fd
          });
        },
        fail: _res => {
          this.dismissLoadingView();
          wx.showToast({
            title: '加载失败',
            icon: 'none'
          });
          fs.closeSync({
            fd: fd
          });
        }
      });
    } catch (error) {
      this.dismissLoadingView();
      wx.showToast({
        title: '文件丢失',
        icon: 'none'
      });
      if (this.data.fileIndex == e.currentTarget.dataset.index) {
        this.setData({
          fileIndex: -1,
          mOtaFile: "",
        });
      }
      UpgradeFileUtil.removeUpgradeFile(selectedFile);
      logv("error", error);
      return;
    }
    this.setData({
      fileIndex: e.currentTarget.dataset.index,
      mOtaFile: selectedFile.fileName,
    });
  },
  onUpdate: async function () {
    console.log(1, this.data.connectedDevice)
    if (!this.data.connectedDevice) {
      wx.showToast({
        title: '请先连接的设备',
        icon: 'none'
      });
      return;
    }
    console.log(2, this.data.binUrl)
    if (!this.data.binUrl) {
      wx.showToast({
        title: '升级文件 URL 不存在',
        icon: 'none'
      });
      return;
    }
    let buffer
    try {
      console.log(3)
      this.showLoadingView()
      console.log(4)
      buffer = await new Promise((res, rej) => {
        console.log(5)
        wx.request({
          url: this.data.binUrl,
          responseType: 'arraybuffer',
          success: (val) => {
            console.log(6)
            res(new Uint8Array(val.data))
          },
          fail: (err) => {
            wx.showToast({
              title: err?.errMsg || '请求失败',
              icon: 'none'
            });
            rej()
          }
        })
      })
    } finally {
      this.dismissLoadingView()
    }
    console.log(7, buffer)
    if (!buffer || !buffer?.length) {
      wx.showToast({
        title: '升级文件不存在',
        icon: 'none'
      });
      return;
    }
    console.log(8)
    this.setData({
      isShowProgress: true
    });
    /*--- 开始执行OTA升级 ---*/
    const otaConfig = new OTAConfig();
    otaConfig.isSupportNewRebootWay = true;
    otaConfig.updateFileData = buffer;
    logv("upgradeData size: " + buffer.length);
    const connectedDevices = sBluetoothManager.getConnectedDevice();
    if (connectedDevices != null && connectedDevices.length > 0) {
      const otaDev = connectedDevices[0];
      sBluetoothManager.startOTA(otaDev, otaConfig, {
        onStartOTA: () => {
          this.setData({
            isShowProgress: true,
            mStatus: 0
          });
        },
        onNeedReconnect: (reConnectMsg) => {
          this.setData({
            mValue: 0,
            mStatus: 2
          });
        },
        onProgress: (type, progress) => {
          console.log(type)
          if (type == UpgradeType.UPGRADE_TYPE_CHECK_FILE) {
            this.setData({
              mValue: progress,
              mStatus: 0
            });
          }
          if (type == UpgradeType.UPGRADE_TYPE_FIRMWARE) {
            this.setData({
              mValue: progress,
              mStatus: 1
            });
          }
        },
        onStopOTA: () => {
          this.setData({
            mValue: 0,
            mOtaResult: 0,
            mStatus: 3
          });
        },
        onCancelOTA: () => {
          this.setData({
            mValue: 0,
            mOtaResult: 1,
            mStatus: 4,
            mFailReason: "升级被取消."
          });
        },
        onError: (error, message) => {
          this.setData({
            mValue: 0,
            mOtaResult: 1,
            mStatus: 4,
            mFailReason: message
          });
        },
      });
    }
  },
  onOtaProgressViewConfirm: function () {
    this.setData({
      isShowProgress: false
    });
  },
  _onUpgradeFileInfoList(infoList) {
    const tempList = infoList.reverse();
    tempList.forEach(element => {
      element.date = this._formatTime(new Date(element.time));
      element.fileSizeStr = (element.fileSize / (1024 * 1024)).toFixed(2);
    });
    this.setData({
      fileArray: tempList
    });
  },
  _checkIsConnected() {
    console.trace()
    var isConnected = false;
    const connectedDevices = sBluetoothManager.getConnectedDevice();
    if (connectedDevices != null && connectedDevices.length > 0) {
      isConnected = true;
    }
    this.setData({
      isBleConnect: isConnected
    });
  },


  _formatTime(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    return ([year, month, day].map(this._formatNumber).join('/') +
      ' ' + [hour, minute, second].map(this._formatNumber).join(':'));
  },
  _formatNumber(n) {
    const s = n.toString();
    return s[1] ? s : '0' + s;
  }
});