import Auth from './auth';

// 封装请求方法，统一处理登录状态和错误
export const request = async (options) => {
  try {
    // 只在需要登录时检查登录状态
    if (options.needLogin) {
      const isLoggedIn = await Auth.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('请先登录');
      }
    }

    // 添加token（如果存在）
    const token = wx.getStorageSync('token');
    if (token) {
      options.header = {
        ...options.header,
        'Authorization': `Bearer ${token}`
      };
    }

    const res = await wx.request(options);
    
    // 处理业务错误
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || '请求失败');
    }

    return res.data;
  } catch (err) {
    return Auth.handleApiError(err);
  }
}; 