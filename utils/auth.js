// 登录状态监听器
let loginStateListeners = [];

// 检查用户状态
async function checkUserStatus(code) {
  try {
    const res = await wx.request({
      url: 'https://hight.fun/api/user/check-status',
      method: 'POST',
      data: {
        code: code
      }
    });

    if (res.data.code === 0) {
      const { isNewUser, userInfo, token, tokenExpired } = res.data.data;
      
      // 如果是老用户，保存信息
      if (!isNewUser && userInfo && token) {
        wx.setStorageSync('token', token);
        wx.setStorageSync('tokenExpired', tokenExpired);
        wx.setStorageSync('userInfo', userInfo);
      }
      
      return {
        isNewUser,
        userInfo,
        token
      };
    }
    throw new Error(res.data.msg || '检查用户状态失败');
  } catch (err) {
    console.error('检查用户状态失败:', err);
    throw err;
  }
}

// 微信登录
async function wxLogin(userInfo, avatarFile) {
  try {
    // 1. 获取登录code
    const loginRes = await wx.login();
    if (!loginRes.code) {
      throw new Error('获取登录凭证失败');
    }

    // 2. 如果有头像文件，先上传头像
    let avatarUrl = userInfo.avatarUrl;
    if (avatarFile) {
      const uploadRes = await wx.uploadFile({
        url: 'https://hight.fun/api/upload',
        filePath: avatarFile.url,
        name: 'avatar',
        formData: {
          'user': 'test'
        }
      });
      if (uploadRes.statusCode === 200) {
        const data = JSON.parse(uploadRes.data);
        avatarUrl = data.url;
      }
    }

    // 3. 发起登录请求
    const res = await wx.request({
      url: 'https://hight.fun/api/user/wx-login',
      method: 'POST',
      header: {
        'content-type': 'application/json'
      },
      data: {
        code: loginRes.code,
        userInfo: {
          nickName: userInfo.nickName,
          gender: userInfo.gender,
          avatarUrl: avatarUrl
        }
      }
    });

    if (res.data.code === 0) {
      const { token, tokenExpired, userInfo: newUserInfo } = res.data.data;
      
      // 保存登录信息
      wx.setStorageSync('token', token);
      wx.setStorageSync('tokenExpired', tokenExpired);
      wx.setStorageSync('userInfo', newUserInfo);

      // 通知登录状态变化
      notifyLoginStateChange(true);
      
      return newUserInfo;
    }
    throw new Error(res.data.msg || '登录失败');
  } catch (err) {
    console.error('微信登录失败:', err);
    throw err;
  }
}

// 检查登录状态
async function checkLoginStatus() {
  const token = wx.getStorageSync('token');
  const tokenExpired = wx.getStorageSync('tokenExpired');
  
  if (!token || !tokenExpired) {
    return false;
  }

  // 检查token是否过期
  if (Date.now() >= tokenExpired) {
    wx.removeStorageSync('token');
    wx.removeStorageSync('tokenExpired');
    wx.removeStorageSync('userInfo');
    return false;
  }

  return true;
}

// 登录状态变化通知
function notifyLoginStateChange(isLoggedIn) {
  loginStateListeners.forEach(listener => listener(isLoggedIn));
}

// 添加登录状态监听
function onLoginStateChange(listener) {
  loginStateListeners.push(listener);
}

// 移除登录状态监听
function offLoginStateChange(listener) {
  const index = loginStateListeners.indexOf(listener);
  if (index > -1) {
    loginStateListeners.splice(index, 1);
  }
}

// 清除登录信息
function clearLoginInfo() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('tokenExpired');
  wx.removeStorageSync('userInfo');
  notifyLoginStateChange(false);
}

// 获取用户信息
function getUserInfo() {
  return wx.getStorageSync('userInfo');
}

// 保存用户信息
function saveUserInfo(userInfo) {
  wx.setStorageSync('userInfo', userInfo);
  notifyLoginStateChange(true);
}

// 处理API错误
function handleApiError(err) {
  console.error('API错误:', err);
  
  // 如果是token过期或无效
  if (err.code === 401) {
    clearLoginInfo();
    wx.showToast({
      title: '登录已过期，请重新登录',
      icon: 'none'
    });
    return false;
  }

  // 其他错误
  wx.showToast({
    title: err.message || '操作失败',
    icon: 'none'
  });
  return false;
}

export default {
  checkUserStatus,
  wxLogin,
  checkLoginStatus,
  onLoginStateChange,
  offLoginStateChange,
  clearLoginInfo,
  getUserInfo,
  saveUserInfo,
  handleApiError
}; 