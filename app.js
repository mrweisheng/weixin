// app.js
import Auth from './utils/auth';

App({
  onLaunch() {
    // 启动时检查登录状态
    this.checkLoginStatus();
  },

  async checkLoginStatus() {
    try {
      const isLoggedIn = await Auth.checkLoginStatus();
      if (!isLoggedIn) {
        Auth.clearLoginInfo();
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  },

  // 添加全局登录状态变化监听
  watchLoginStatus(callback) {
    this.loginStatusCallback = callback;
  },

  // 通知登录状态变化
  notifyLoginStatusChange(isLoggedIn) {
    if (this.loginStatusCallback) {
      this.loginStatusCallback(isLoggedIn);
    }
  }
}); 