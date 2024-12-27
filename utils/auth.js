// 登录状态管理
const TOKEN_KEY = 'token';
const USER_INFO_KEY = 'userInfo';
const TOKEN_EXPIRED_KEY = 'tokenExpired';

class Auth {
  static loginCallbacks = [];

  // 添加登录状态监听
  static onLoginStateChange(callback) {
    this.loginCallbacks.push(callback);
  }

  // 移除登录状态监听
  static offLoginStateChange(callback) {
    this.loginCallbacks = this.loginCallbacks.filter(cb => cb !== callback);
  }

  // 通知登录状态变化
  static notifyLoginStateChange(isLoggedIn) {
    this.loginCallbacks.forEach(callback => {
      try {
        callback(isLoggedIn);
      } catch (err) {
        console.error('执行登录状态回调失败:', err);
      }
    });
  }

  // 检查登录状态
  static async checkLoginStatus() {
    const token = wx.getStorageSync(TOKEN_KEY);
    const tokenExpired = wx.getStorageSync(TOKEN_EXPIRED_KEY);
    
    if (!token) return false;
    
    // 检查token是否过期
    if (tokenExpired && new Date().getTime() > tokenExpired) {
      try {
        await this.refreshToken();
        return true;
      } catch (err) {
        this.clearLoginInfo();
        return false;
      }
    }
    
    return true;
  }

  // 刷新token
  static async refreshToken() {
    try {
      const oldToken = wx.getStorageSync(TOKEN_KEY);
      const res = await wx.request({
        url: 'https://jiekou.hkstudy.asia/api/auth/refresh-token',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${oldToken}`
        }
      });

      if (res.data.code === 0) {
        const { token, tokenExpired } = res.data.data;
        wx.setStorageSync(TOKEN_KEY, token);
        wx.setStorageSync(TOKEN_EXPIRED_KEY, tokenExpired);
        return true;
      }
      throw new Error(res.data.msg || '刷新token失败');
    } catch (err) {
      this.clearLoginInfo();
      throw err;
    }
  }

  // 统一的错误处理
  static handleApiError(err, options = {}) {
    const { showError = true, retry = false } = options;
    
    if (err.code === 401) {
      return this.refreshToken();
    }
    
    if (showError) {
      wx.showToast({
        title: err.message || '操作失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
    
    return Promise.reject(err);
  }

  // 清除登录信息
  static clearLoginInfo() {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(USER_INFO_KEY);
    wx.removeStorageSync(TOKEN_EXPIRED_KEY);
    this.notifyLoginStateChange(false);
  }

  // 保存用户信息
  static saveUserInfo(userInfo) {
    wx.setStorageSync(USER_INFO_KEY, userInfo);
    this.notifyLoginStateChange(true);
  }

  // 获取用户信息
  static getUserInfo() {
    return wx.getStorageSync(USER_INFO_KEY);
  }
}

export default Auth; 