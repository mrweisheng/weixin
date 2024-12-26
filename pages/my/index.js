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
    quoteLoading: true
  },

  onLoad() {
    this.getDailyQuote();
  },

  // 点击登录按钮
  async onLogin() {
    try {
      wx.showLoading({
        title: '登录中...',
        mask: true
      });

      // 1. 获取微信登录凭证
      const { code } = await wx.login();
      console.log('获取微信登录凭证:', code);
      
      // 2. 调用后端接口检查用户状态
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/check-status',
          method: 'POST',
          data: { code },
          success: resolve,
          fail: reject
        });
      });
      
      console.log('检查用户状态返回:', res.data);
      
      if (res.data.code === 0) {
        const { isNewUser, userInfo, token, tokenExpired } = res.data.data;
        
        if (isNewUser) {
          // 新用户，需要授权信息
          wx.showModal({
            title: '欢迎使用',
            content: '首次使用需要授权头像和昵称',
            showCancel: false,
            success: () => {
              wx.chooseAvatar({
                success: (res) => {
                  this.onChooseAvatar(res);
                }
              });
            }
          });
        } else {
          // 老用户，直接登录
          const formattedUserInfo = {
            ...userInfo,
            nickName: userInfo.nickname,
            avatarUrl: userInfo.avatar
          };
          
          // 保存登录信息
          wx.setStorageSync('token', token);
          wx.setStorageSync('tokenExpired', tokenExpired);
          wx.setStorageSync('userInfo', formattedUserInfo);
          
          this.setData({
            userInfo: formattedUserInfo,
            likesCount: formattedUserInfo.likes?.length || 0,
            collectCount: formattedUserInfo.collection?.length || 0
          });
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
          
          // 获取最新用户信息
          await this.getUserLatestInfo();
        }
      } else {
        throw new Error(res.data.msg || '登录失败');
      }
    } catch (err) {
      console.error('登录失败:', err);
      wx.showToast({
        title: err.message || '登录失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 更新用户信息时同步更新数量
  updateUserInfo(userInfo) {
    this.setData({
      userInfo,
      likesCount: userInfo.likes?.length || 0,
      collectCount: userInfo.collection?.length || 0
    });
    wx.setStorageSync('userInfo', userInfo);
  },

  async onChooseAvatar(e) {
    console.log('用户选择头像:', e.detail);
    const { avatarUrl } = e.detail;
    
    this.setData({
      'tempUserInfo.avatarUrl': avatarUrl,
      showNicknameInput: true,
      tempNickname: ''
    });
  },

  async onConfirmNickname() {
    const nickName = this.data.tempNickname;
    if (!nickName) return;

    try {
      wx.showLoading({
        title: '正在注册...',
        mask: true
      });

      // 1. 获取微信登录凭证
      const { code } = await wx.login();
      
      // 2. 构建用户信息
      const userInfo = {
        nickName,
        avatarUrl: this.data.tempUserInfo.avatarUrl,
        gender: 0
      };

      // 3. 调用登录接口
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/wx-login',
          method: 'POST',
          data: {
            code,
            userInfo
          },
          success: resolve,
          fail: reject
        });
      });

      console.log('登录接口响应:', res.data);

      if (res.data.code === 0) {
        const { token, tokenExpired, userInfo: returnedUserInfo } = res.data.data;
        
        // 转换字段名以匹配页面使用
        const formattedUserInfo = {
          ...returnedUserInfo,
          nickName: returnedUserInfo.nickname,
          avatarUrl: returnedUserInfo.avatar
        };
        
        wx.setStorageSync('token', token);
        wx.setStorageSync('tokenExpired', tokenExpired);
        wx.setStorageSync('userInfo', formattedUserInfo);
        
        this.setData({
          userInfo: formattedUserInfo,
          showNicknameInput: false,
          tempUserInfo: {},
          tempNickname: ''
        });

        wx.showToast({
          title: '注册成功',
          icon: 'success'
        });

        await this.getUserLatestInfo();
      } else {
        throw new Error(res.data.msg || '注册失败');
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

  // 点击头像修改头像
  async onUpdateAvatar() {
    try {
      // 从相册选择图片
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album']
      });

      const tempFilePath = res.tempFilePaths[0];
      console.log('选择的新头像:', tempFilePath);

      // 获取本地存储的token
      const token = wx.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      // 1. 获取图片信息
      const imgInfo = await new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: tempFilePath,
          success: resolve,
          fail: reject
        });
      });

      // 2. 获取 canvas 上下文
      const query = this.createSelectorQuery();
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

      // 7. 获取图片数据
      const base64Data = canvas.toDataURL('image/jpeg', 0.9);
      console.log('图片处理完成数据长度:', base64Data.length);

      // 8. 调用更新接口
      const updateRes = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            avatar: base64Data
          },
          success: resolve,
          fail: reject
        });
      });

      console.log('更新头像响应:', updateRes.data);

      if (updateRes.data.code === 0) {
        // 更新本地存储��页面显示
        const newUserInfo = {
          ...this.data.userInfo,
          avatarUrl: updateRes.data.data.avatar,
          avatar: updateRes.data.data.avatar
        };
        wx.setStorageSync('userInfo', newUserInfo);
        this.setData({ userInfo: newUserInfo });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });

        await this.getUserLatestInfo();  // 获取最新用户信息
      } else {
        throw new Error(updateRes.data.msg || '更新失败');
      }
    } catch (err) {
      console.error('更新头像失败:', err);
      wx.showToast({
        title: err.message || '更新失败，请重试',
        icon: 'none'
      });
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
    const nickName = this.data.tempNickname;
    if (!nickName) return;

    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            nickname: nickName
          },
          success: resolve,
          fail: reject
        });
      });

      console.log('更新昵称响应:', res.data);

      if (res.data.code === 0) {
        // 更新本地存储和页面显示，保留原有信息
        const newUserInfo = {
          ...this.data.userInfo,  // 保留原有信息
          nickName: res.data.data.nickname,
          nickname: res.data.data.nickname  // 同时更新两个字段
        };
        wx.setStorageSync('userInfo', newUserInfo);
        this.setData({
          userInfo: newUserInfo,
          showNicknameInput: false,
          tempNickname: ''
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });

        await this.getUserLatestInfo();  // 获取最新用户信息
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
    
    if (!this.data.likesCount) {
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
    
    if (!this.data.collectCount) {
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
      if (!token) return;

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/info',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: resolve,
          fail: reject
        });
      });

      console.log('获取用户信息返回:', res.data);
      if (res.data.code === 0) {
        // 转换字段名以匹配页面使用
        const userInfo = {
          ...res.data.data,
          nickName: res.data.data.nickname,
          avatarUrl: res.data.data.avatar
        };
        this.updateUserInfo(userInfo);
      }
    } catch (err) {
      console.error('获取用户信息失败:', err);
    }
  },

  // 获取每日一句
  async getDailyQuote() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/quote/daily',
          method: 'POST',
          success: resolve,
          fail: reject
        });
      });

      console.log('获取每日一句返回:', res.data);
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
    // 每次显示页面时获取最新信息
    if (this.data.userInfo) {
      this.getUserLatestInfo();
      this.getDailyQuote();  // 每次显示页面时更新每日一句
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
    const bio = this.data.tempBio;
    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/user/update',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            bio: bio
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        const newUserInfo = {
          ...this.data.userInfo,
          bio: res.data.data.bio
        };
        wx.setStorageSync('userInfo', newUserInfo);
        this.setData({
          userInfo: newUserInfo,
          showBioInput: false,
          tempBio: ''
        });

        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });

        await this.getUserLatestInfo();
      } else {
        throw new Error(res.data.msg || '更新失败');
      }
    } catch (err) {
      console.error('更新个人简介失败:', err);
      wx.showToast({
        title: err.message || '更新失败，请重试',
        icon: 'none'
      });
    }
  }
}); 