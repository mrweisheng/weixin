import Auth from '../../utils/auth';

Page({
  data: {
    userInfo: null,
    showNicknameInput: false,
    showBioInput: false,
    tempUserInfo: {},
    tempNickname: '',
    tempBio: '',
    likesCount: 0,
    collectCount: 0,
    dailyQuote: '',
    quoteLoading: true,
    statusBarHeight: 0
  },

  onLoad() {
    this.getDailyQuote();
    this.checkAndUpdateLoginStatus();
    
    // 添加登录状态监听
    Auth.onLoginStateChange(this.handleLoginStateChange.bind(this));

    // 检查是否有登录信息
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.setData({ userInfo });
      this.getUserLatestInfo();
    }
  },

  onUnload() {
    // 移除登录状态监听
    Auth.offLoginStateChange(this.handleLoginStateChange.bind(this));
  },

  handleLoginStateChange(isLoggedIn) {
    if (!isLoggedIn) {
      this.setData({
        userInfo: null,
        likesCount: 0,
        collectCount: 0
      });
    } else {
      this.getUserLatestInfo();
    }
  },

  // 检查并更新登录状态
  async checkAndUpdateLoginStatus() {
    try {
      const isLoggedIn = await Auth.checkLoginStatus();
      if (!isLoggedIn) {
        // 未登录时清除信息
        this.setData({
          userInfo: null,
          likesCount: 0,
          collectCount: 0
        });
        Auth.clearLoginInfo();
        return;
      }

      // 已登录则获取用户信息
      const userInfo = Auth.getUserInfo();
      if (userInfo) {
        this.setData({ userInfo });
        this.getUserLatestInfo();
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
      // 发生错误时也清除信息
      this.setData({
        userInfo: null,
        likesCount: 0,
        collectCount: 0
      });
      Auth.clearLoginInfo();
    }
  },

  // 处理获取用户信息
  onGetUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: async (res) => {
        try {
          wx.showLoading({
            title: '登录中...',
            mask: true
          });

          // 获取登录凭证
          const { code } = await wx.login();
          
          // 先检查用户状态
          const checkRes = await new Promise((resolve, reject) => {
            wx.request({
              url: 'https://hight.fun/api/user/check-status',
              method: 'POST',
              data: { code },
              success: resolve,
              fail: reject
            });
          });

          if (checkRes.data.code === 0) {
            const { isNewUser, userInfo, token, tokenExpired } = checkRes.data.data;

            if (isNewUser) {
              // 新用户流程
              wx.hideLoading();
              
              // 保存微信返回的用户信息，用于后续注册
              this.setData({
                tempUserInfo: res.userInfo
              });

              // 提示用户选择头像
              wx.showModal({
                title: '设置头像',
                content: '请选择一个好看的头像吧',
                confirmText: '选择头像',
                showCancel: false,
                success: (res) => {
                  if (res.confirm) {
                    this.chooseAvatar();
                  }
                }
              });
            } else {
              // 老用户直接登录
              Auth.saveUserInfo(userInfo);
              wx.setStorageSync('token', token);
              wx.setStorageSync('tokenExpired', tokenExpired);
              
              // 获取最新的用户信息（包含点赞、收藏数据）
              await this.getUserLatestInfo();
              
              wx.hideLoading();
              wx.showToast({
                title: '登录成功',
                icon: 'success'
              });
            }
          }
        } catch (err) {
          console.error('登录失败:', err);
          wx.hideLoading();
          wx.showToast({
            title: err.message || '登录失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 确认昵称后完成注册
  async onConfirmNickname() {
    if (!this.data.tempNickname.trim()) {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      });
      return;
    }

    try {
      wx.showLoading({
        title: '注册中...',
        mask: true
      });

      // 获取新的登录凭证
      const { code } = await wx.login();

      // 构造用户信息
      const userInfo = {
        nickName: this.data.tempNickname,
        gender: this.data.tempUserInfo.gender
      };

      // 打印详细的入参信息
      console.log('==== 新用户注册入参 ====');
      console.log('临时头像路径:', this.data.tempAvatarUrl);
      console.log('登录凭证 code:', code);
      console.log('用户信息对象:', userInfo);
      console.log('用户信息字符串:', JSON.stringify(userInfo));
      console.log('表单数据:', {
        code: code,
        userInfo: JSON.stringify(userInfo)
      });
      console.log('========================');

      // 使用 uploadFile 上传头像并注册
      const loginRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://hight.fun/api/user/wx-login',
          filePath: this.data.tempAvatarUrl,
          name: 'avatar',
          formData: {
            code: code,
            userInfo: JSON.stringify(userInfo)
          },
          success: (res) => {
            console.log('注册接口返回:', res);
            const data = JSON.parse(res.data);
            resolve({ data });
          },
          fail: (err) => {
            console.error('注册接口失败:', err);
            reject(err);
          }
        });
      });

      if (loginRes.data.code === 0) {
        const { token, tokenExpired, userInfo } = loginRes.data.data;
        
        wx.setStorageSync('token', token);
        wx.setStorageSync('tokenExpired', tokenExpired);
        Auth.saveUserInfo(userInfo);
        
        this.setData({
          userInfo,
          showNicknameInput: false,
          tempNickname: '',
          tempAvatarUrl: '',
          tempUserInfo: null,
          likesCount: 0,
          collectCount: 0
        });

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });

        await this.getUserLatestInfo();
      } else {
        throw new Error(loginRes.data.msg || '注册失败');
      }
    } catch (err) {
      console.error('注册失败:', err);
      wx.showToast({
        title: err.message || '注册失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 更新用户信息时同步更新数量
  updateUserInfo(userInfo) {
    this.setData({ userInfo });
  },

  async onChooseAvatar(e, isNewUser = false) {
    try {
      const tempFilePath = e.detail.avatarUrl;
      
      // 处理头像
      const processedAvatar = await this.processAvatar(tempFilePath);
      
      if (isNewUser) {
        // 新用户流程：选完头像后打开昵称输入框
        this.setData({
          tempAvatarUrl: processedAvatar,
          showNicknameInput: true,
          tempToken: token
        });
      } else {
        // 保持原有的更新头像逻辑不变
        await this.updateAvatar(processedAvatar);
      }
    } catch (err) {
      console.error('处理头像失败:', err);
      wx.showToast({
        title: '处理头像失败，请重试',
        icon: 'none'
      });
    }
  },

  // 点击头像修改头像
  async onUpdateAvatar() {
    try {
      // 1. 从相册选择图片
      const res = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });

      wx.showLoading({
        title: '上传中...',
        mask: true
      });

      const token = wx.getStorageSync('token');
      if (!token) throw new Error('未登录');

      // 8. 调用更新接口
      const updateRes = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://hight.fun/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          filePath: res.tempFiles[0].tempFilePath,
          name: 'avatar',
          success: (res) => {
            const data = JSON.parse(res.data);
            resolve({ data });
          },
          fail: reject
        });
      });

      if (updateRes.data.code === 0) {
        // 更新本地显示
        const newUserInfo = {
          ...this.data.userInfo,
          avatarUrl: updateRes.data.data.avatar
        };
        Auth.saveUserInfo(newUserInfo);
        this.setData({ userInfo: newUserInfo });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(updateRes.data.msg || '更新失败');
      }
    } catch (err) {
      console.error('更新头像失败:', err);
      wx.showToast({
        title: '更新失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 点击昵称修改昵称
  onUpdateNickname() {
    this.setData({
      tempNickname: this.data.userInfo.nickName || this.data.userInfo.nickname,
      showNicknameInput: true
    });
  },

  // 确认修改昵称
  async onConfirmUpdateNickname() {
    try {
      const token = wx.getStorageSync('token');
      if (!token) throw new Error('未登录');

      const res = await new Promise((resolve, reject) => {
        wx.uploadFile({
          url: 'https://hight.fun/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          formData: {
            nickname: this.data.tempNickname
          },
          success: (res) => {
            const data = JSON.parse(res.data);
            resolve({ data });
          },
          fail: reject
        });
      });

      if (res.data.code === 0) {
        // 更新本地显示
        const newUserInfo = {
          ...this.data.userInfo,
          nickName: res.data.data.nickname,
          nickname: res.data.data.nickname
        };
        Auth.saveUserInfo(newUserInfo);
        this.setData({
          userInfo: newUserInfo,
          showNicknameInput: false,
          tempNickname: ''
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
      } else {
        throw new Error(res.data.msg || '更新失败');
      }
    } catch (err) {
      console.error('更新昵称失败:', err);
      wx.showToast({
        title: err.message || '更新失败，请重试',
        icon: 'none'
      });
    }
  },

  // 点击我的点赞
  goToMyLikes() {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.userInfo.likes?.length) {
      wx.showToast({
        title: '暂无点赞内容',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/my/likes/index'
    });
  },

  // 点击我的收藏
  goToMyFavorites() {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.userInfo.collection?.length) {
      wx.showToast({
        title: '暂无收藏内容',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/my/favorites/index'
    });
  },

  // 获取最新的用户信息
  async getUserLatestInfo() {
    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        this.setData({ userInfo: null });
        return;
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/user/info',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        const userInfo = {
          ...res.data.data,
          nickName: res.data.data.nickname,
          avatarUrl: res.data.data.avatar
        };
        
        // 避免重复更新触发事件循环
        if (JSON.stringify(this.data.userInfo) === JSON.stringify(userInfo)) {
          return;
        }

        // 先设置数据
        this.setData({
          userInfo,
          likesCount: res.data.data.likes?.length || 0,
          collectCount: res.data.data.collection?.length || 0
        });

        // 再保存用户信息
        Auth.saveUserInfo(userInfo);
      } else if (res.data.code === 401) {
        // token 过期，清除登录信息
        Auth.clearLoginInfo();
        this.setData({ userInfo: null });
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
      // 出错时也清除用户信息
      this.setData({ userInfo: null });
      Auth.handleApiError(err, { showError: false });
    }
  },

  // 获取每日一句
  async getDailyQuote() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/quotes/random',
          method: 'GET',
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        this.setData({
          dailyQuote: res.data.data.content,
          quoteLoading: false
        });
      }
    } catch (err) {
      console.error('获取每日一句失败:', err);
      this.setData({ quoteLoading: false });
    }
  },

  onShow() {
    // 每次显示页面时都获取每日一句
    this.getDailyQuote();
    
    // 如果已登录则更新用户信息
    if (wx.getStorageSync('token')) {
      this.getUserLatestInfo();
    }
  },

  // 点击修改个人简介
  onUpdateBio() {
    if (!this.data.userInfo) return;
    this.setData({
      tempBio: this.data.userInfo.bio || '',
      showBioInput: true
    });
  },

  // 确认修改个人简介
  async onConfirmUpdateBio() {
    try {
      wx.showLoading({
        title: '更新中...',
        mask: true
      });

      const token = wx.getStorageSync('token');
      if (!token) throw new Error('未登录');

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            bio: this.data.tempBio
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        // 先隐藏输入框
        this.setData({ showBioInput: false });
        
        // 显示成功提示
        wx.showToast({
          title: '更新成功',
          icon: 'success',
          duration: 1500
        });

        // 等待动画完成后更新显示
        setTimeout(() => {
          const newUserInfo = {
            ...this.data.userInfo,
            bio: res.data.data.bio
          };
          Auth.saveUserInfo(newUserInfo);
          this.setData({ userInfo: newUserInfo });
        }, 500);

      } else {
        throw new Error(res.data.msg || '更新失败');
      }
    } catch (err) {
      console.error('更新个人简介失败:', err);
      Auth.handleApiError(err);
    } finally {
      wx.hideLoading();
    }
  },

  // 添加下拉刷新
  async onPullDownRefresh() {
    try {
      // 先检查登录状态
      const isLoggedIn = await Auth.checkLoginStatus();
      if (!isLoggedIn) {
        // 如果未登录，清除页面显示的用户信息
        this.setData({
          userInfo: null,
          likesCount: 0,
          collectCount: 0
        });
        Auth.clearLoginInfo(); // 清除存储的信息
        return;
      }

      // 已登录则更新信息
      await Promise.all([
        this.getUserLatestInfo(),
        this.getDailyQuote()
      ]);
    } catch (err) {
      console.error('刷新失败:', err);
      Auth.handleApiError(err, { showError: false });
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  // 获取系统状态栏高度
  getStatusBarHeight() {
    const windowInfo = wx.getWindowInfo();
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight
    });
  },

  // 添加头像处理方法
  async handleAvatarProcess(tempFilePath) {
    // 1. 获取图片信息
    const imgInfo = await new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: tempFilePath,
        success: resolve,
        fail: reject
      });
    });

    // 2. 获取 canvas 上下文
    const query = wx.createSelectorQuery();
    const canvas = await new Promise(resolve => {
      query.select('#avatarCanvas')
        .fields({ node: true, size: true })
        .exec((res) => resolve(res[0].node));
    });

    const ctx = canvas.getContext('2d');

    // 3. 设置 canvas 大小
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // 4. 创建图片对象
    const image = canvas.createImage();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = tempFilePath;
    });

    // 5. 计算缩放和裁剪参数
    let sx = 0, sy = 0, sSize;
    if (imgInfo.width > imgInfo.height) {
      sSize = imgInfo.height;
      sx = (imgInfo.width - imgInfo.height) / 2;
    } else {
      sSize = imgInfo.width;
      sy = (imgInfo.height - imgInfo.width) / 2;
    }

    // 6. 绘制图片
    ctx.drawImage(
      image,
      sx, sy,        // 裁剪起点
      sSize, sSize,  // 裁剪尺寸
      0, 0,          // 绘制起点
      targetSize, targetSize  // 最终尺寸
    );

    // 7. 返回处理后的图片数据
    return canvas.toDataURL('image/jpeg', 0.9);
  },

  // 检查登录状态
  async checkLoginStatus() {
    try {
      console.log('开始检查登录状态...');
      const loginRes = await wx.login();
      if (!loginRes.code) {
        throw new Error('获取登录凭证失败');
      }
      console.log('获取登录凭证成功:', loginRes.code);

      // 检查用户状态
      console.log('开始请求检查用户状态...');
      const res = await wx.request({
        url: 'https://hight.fun/api/user/check-status',
        method: 'POST',
        data: { code: loginRes.code }
      });
      console.log('检查用户状态返回:', res.data);

      if (res.data.code === 0) {
        const { isNewUser, userInfo, token } = res.data.data;
        console.log('用户状态:', { isNewUser, hasUserInfo: !!userInfo });
        
        if (!isNewUser && userInfo) {
          Auth.saveUserInfo(userInfo);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('检查登录状态失败:', err);
      return false;
    }
  },

  // 处理登录
  async handleLogin() {
    try {
      console.log('开始获取用户信息...');
      const userProfile = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      console.log('获取用户信息成功:', userProfile);

      console.log('开始调用登录接口...');
      const userInfo = await Auth.wxLogin(userProfile.userInfo);
      console.log('登录成功，返回用户信息:', userInfo);
      
      this.setData({ userInfo });
    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({
        title: '登录失败',
        icon: 'none'
      });
    }
  },

  // 选择头像
  async chooseAvatar() {
    try {
      console.log('开始选择头像...');
      const imgRes = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      console.log('选择头像结果:', imgRes);

      if (imgRes.tempFiles.length > 0) {
        // 直接使用选择的图片
        this.setData({
          tempAvatarUrl: imgRes.tempFiles[0].tempFilePath,
          showNicknameInput: true
        });
      }
    } catch (err) {
      console.error('选择头像失败:', err);
      wx.showToast({
        title: '选择头像失败，请重试',
        icon: 'none'
      });
    }
  }
}); 