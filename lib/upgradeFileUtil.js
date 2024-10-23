import { loge } from "./log";
export class UpgradeFileInfo {
}
class UpgradeFileManager {
    constructor() {
        this._upgradeFileInfoList = new Array();
        this.upgradeFolder = wx.env.USER_DATA_PATH + "/" + "upgrade" + "/";
        const fs = wx.getFileSystemManager();
        fs.access({
            path: this.upgradeFolder,
            success: () => {
            },
            fail: () => {
                fs.mkdirSync(this.upgradeFolder);
            }
        });
        //读取缓存中的文件信息
        const cacheUpgradeFileInfos = wx.getStorageSync("UpgradeFileInfos");
        if (cacheUpgradeFileInfos !== "") {
            this._upgradeFileInfoList = cacheUpgradeFileInfos;
        }
    }
    setListener(listener) {
        this._listener = listener;
    }
    getUpgradeFileInfos() {
        return JSON.parse(JSON.stringify(this._upgradeFileInfoList));
    }
    removeUpgradeFile(info) {
        for (let index = 0; index < this._upgradeFileInfoList.length; index++) {
            const element = this._upgradeFileInfoList[index];
            if (element.filePath === info.filePath) {
                this._upgradeFileInfoList.splice(index, 1);
                if (info.filePath) {
                    const fs = wx.getFileSystemManager();
                    try {
                        fs.unlinkSync(info.filePath);
                    }
                    catch (error) {
                    }
                }
                continue;
            }
        }
        this._onUpgradeFileInfoList(this._upgradeFileInfoList);
    }
    _addUpgradeFile(fs, fileName, time, fileSrcPath, destPath, fileSize) {
        return new Promise((resolve, reject) => {
            const upgradeFileInfo = new UpgradeFileInfo();
            upgradeFileInfo.fileName = fileName;
            upgradeFileInfo.time = time;
            upgradeFileInfo.filePath = destPath;
            upgradeFileInfo.fileSize = fileSize;
            fs.copyFile({
                srcPath: fileSrcPath,
                destPath: upgradeFileInfo.filePath,
                fail: (error) => {
                    loge("copyFileSync", error);
                    if (error.errMsg === "copyFile:fail the maximum size of the file storage limit is exceeded") { //剩余空间不足
                        reject(1300202);
                    }
                    else {
                        reject(-1);
                    }
                }, success: () => {
                    resolve(upgradeFileInfo);
                }
            });
        });
    }
    addUpgradeFiles(infos) {
        return new Promise(async (resolve, reject) => {
            const fs = wx.getFileSystemManager();
            for (let index = 0; index < infos.length; index++) {
                const info = infos[index];
                const time = (new Date()).getTime();
                const destPath = this.upgradeFolder + time + "_" + index;
                try {
                    const result = await this._addUpgradeFile(fs, info.fileName, time, info.fileSrcPath, destPath, info.fileSize);
                    this._upgradeFileInfoList.push(result);
                }
                catch (error) {
                    this._onUpgradeFileInfoList(this._upgradeFileInfoList);
                    reject(error);
                    return;
                }
            }
            this._onUpgradeFileInfoList(this._upgradeFileInfoList);
        });
    }
    addUpgradeFile(fileName, fileSrcPath, fileSize) {
        return new Promise(async (resolve, reject) => {
            const fs = wx.getFileSystemManager();
            const time = (new Date()).getTime();
            const destPath = this.upgradeFolder + time + "_" + 0;
            try {
                const info = await this._addUpgradeFile(fs, fileName, time, fileSrcPath, destPath, fileSize);
                this._upgradeFileInfoList.push(info);
                this._onUpgradeFileInfoList(this._upgradeFileInfoList);
                resolve(true);
            }
            catch (error) {
                reject(error);
            }
        });
    }
    _onUpgradeFileInfoList(infoList) {
        wx.setStorageSync("UpgradeFileInfos", infoList);
        this._listener?.onUpgradeFileInfoList(JSON.parse(JSON.stringify(infoList)));
    }
}
export var UpgradeFileUtil = new UpgradeFileManager();
