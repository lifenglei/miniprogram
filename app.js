// app.js
App({
  onLaunch: async function() {
    // 检查小程序版本更新
    this.checkForUpdate();

    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    
    try {
      wx.cloud.init({
        env: 'cloudbase-9gquqbuz52cc02cb',  // 正确的云开发环境 ID
        traceUser: true,
      });
    } catch (err) {
      console.error('云环境初始化失败：', err);
      wx.showToast({
        title: '云环境初始化失败',
        icon: 'none'
      });
    }

    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          // 已经授权，可以直接调用 getUserInfo 获取头像昵称
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo;
              // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
              // 所以此处加入 callback 以防止这种情况
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res);
              }
            }
          });
        }
      }
    });

    this.globalData = {
      userInfo: null,
      env: 'cloudbase-9gquqbuz52cc02cb'
    };
  },

  // 检查小程序版本更新
  checkForUpdate() {
    // 基础库 1.9.90 及以上支持
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      // 检查是否有新版本
      updateManager.onCheckForUpdate(function (res) {
        if (res.hasUpdate) {
          console.log('检测到新版本，正在下载...');
        }
      });

      // 新版本下载完成
      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          showCancel: true,
          cancelText: '稍后',
          confirmText: '立即重启',
          success: function (res) {
            if (res.confirm) {
              // 应用新版本
              updateManager.applyUpdate();
            }
          }
        });
      });

      // 新版本下载失败
      updateManager.onUpdateFailed(function () {
        wx.showModal({
          title: '更新失败',
          content: '新版本下载失败，请删除小程序重新打开，或稍后再试',
          showCancel: false,
          confirmText: '知道了'
        });
      });
    } else {
      // 基础库版本过低，使用兼容方案
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，无法使用更新功能，请升级到最新微信版本后重新打开小程序',
        showCancel: false
      });
    }
  },
  
  globalData: {
    userInfo: null,
    env: 'cloudbase-9gquqbuz52cc02cb'
  },

  // 全局分享到微信好友
  onShareAppMessage(res) {
    // 如果是从按钮分享，可以获取按钮信息
    if (res.from === 'button') {
      console.log('按钮分享：', res.target)
    }
    
    return {
      title: '喜刷刷 - 面试题库',
      path: '/pages/index/index',
      imageUrl: '' // 可选：分享图片
    }
  },

  // 全局分享到朋友圈（需要基础库2.11.3+）
  onShareTimeline(res) {
    return {
      title: '喜刷刷 - 面试题库，助你轻松通过面试！',
      imageUrl: '' // 可选：分享图片
    }
  }
}); 