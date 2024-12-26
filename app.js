// app.js
App({
  onLaunch() {
    // 开启 Promise 化
    wx.cloud ? wx.cloud.init() : null;
  }
}) 