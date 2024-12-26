Page({
  data: {
    userInfo: null,
    showNicknameInput: false,
    tempUserInfo: {},
    tempNickname: '',
    likesCount: 0,    // 添加点赞数量
    collectCount: 0   // 添加收藏数量
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('页面加载，获取本地用户信息:', userInfo);
    if (userInfo) {
      this.setData({ 
        userInfo,
        // 设置点赞和收藏数量
        likesCount: userInfo.likes?.length || 0,
        collectCount: userInfo.collection?.length || 0
      });
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
    
    // 直接使用微信返回的头像URL
    this.setData({
      'tempUserInfo.avatarUrl': avatarUrl,
      showNicknameInput: true,
      tempNickname: ''
    });
    console.log('保存临时头像信息:', this.data.tempUserInfo);
  },

  async onConfirmNickname() {
    const nickName = this.data.tempNickname;
    console.log('用户输入昵称:', nickName);
    if (!nickName) {
      console.warn('昵称为空，终止登录');
      return;
    }

    try {
      console.log('开始登录流程...');
      // 1. 获取微信登录凭证
      const loginResult = await wx.login();
      console.log('获取微信登录凭证:', loginResult);
      
      // 2. 构建用户信息
      const userInfo = {
        nickName: nickName,
        avatarUrl: this.data.tempUserInfo.avatarUrl,
        gender: 0
      };
      console.log('构建用户信息:', userInfo);

      // 3. 调用登录接口
      console.log('准备调用登录接口...');
      try {
        const res = await new Promise((resolve, reject) => {
          wx.request({
            url: 'https://jiekou.hkstudy.asia/api/user/wx-login',
            method: 'POST',
            data: {
              code: loginResult.code,
              userInfo
            },
            success: (res) => {
              console.log('接口调用成功，原始响应:', res);
              resolve(res);
            },
            fail: (error) => {
              console.error('接口调用失败:', error);
              reject(error);
            }
          });
        });

        console.log('登录接口响应:', res.data);

        if (res.data.code === 0) {
          // 保存登录信息
          const loginData = res.data.data;
          console.log('登录成功，保存信息:', loginData);
          
          // 转换字段名以匹配页面使用
          const userInfo = {
            ...loginData.userInfo,
            nickName: loginData.userInfo.nickname,
            avatarUrl: loginData.userInfo.avatar
          };
          
          wx.setStorageSync('token', loginData.token);
          wx.setStorageSync('tokenExpired', loginData.tokenExpired);
          wx.setStorageSync('userInfo', userInfo);  // 保存转换后的用户信息
          
          this.setData({
            userInfo,  // 使用转换后的用户信息
            showNicknameInput: false,
            tempUserInfo: {},
            tempNickname: ''
          });

          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          console.error('登录接口返回错误:', res.data);
          throw new Error(res.data.msg || '登录失败');
        }
      } catch (err) {
        console.error('登录过程出错:', err);
        wx.showToast({
          title: err.errMsg || '登录失败，请重试',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('登录过程出错:', err);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
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
      console.log('图片处理完成���数据长度:', base64Data.length);

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
        // 更新本地存储和页面显示
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
  }
}); 