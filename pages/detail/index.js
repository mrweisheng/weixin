import { request } from '../../utils/request';

const app = getApp();

Page({
  data: {
    imageInfo: null,
    loading: true,
    imageId: '',      // 图片ID
    isLiked: false,   // 是否已点赞
    likesCount: 0,    // 点赞数量
    userInfo: null,    // 用户信息
    isFavorited: false
  },

  onLoad(options) {
    const { id } = options;
    const userInfo = wx.getStorageSync('userInfo');
    
    this.setData({ 
      imageId: id,
      userInfo,
      // 判断当前图片是否在用户的点赞列表中
      isLiked: userInfo?.likes?.includes(id) || false
    });

    this.getImageDetail(id);
  },

  async getImageDetail(imageId) {
    try {
      console.log('请求参数:', { image_id: imageId });
      const res = await request({
        url: 'https://jiekou.hkstudy.asia/api/image/detail',
        method: 'POST',
        data: {
          image_id: imageId
        }
      });

      console.log('请求响应:', res);

      if (res.data.code === 0) {
        const imageData = res.data.data;
        if (imageData.url) {
          imageData.url = imageData.url.startsWith('http') 
            ? imageData.url 
            : `https://jiekou.hkstudy.asia${imageData.url}`;
        }
        
        this.setData({
          imageInfo: imageData,
          likesCount: imageData.likes || 0,  // 使用返回的 likes 字段
          collectCount: imageData.collection || 0  // 使用返回的 collection 字段
        });
      } else {
        wx.showToast({
          title: res.data.msg || '获取详情失败',
          icon: 'none'
        });
      }
    } catch (err) {
      console.error('请求失败:', err);
      wx.showToast({
        title: '网络请求失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      current: url,
      urls: this.data.imageInfo.url_list
    });
  },

  onLikeTap() {
    // TODO: 实现点赞功能
    wx.showToast({
      title: '点赞功能开发中',
      icon: 'none'
    });
  },

  onCommentTap() {
    // TODO: 实现评论功能
    wx.showToast({
      title: '评论功能开发中',
      icon: 'none'
    });
  },

  // 点赞/取消点赞
  async handleLike() {
    // 1. 检查登录状态
    if (!this.data.userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      // 2. 调用点赞接口
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/interaction/like',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            image_id: this.data.imageId,
            openid: this.data.userInfo.openid
          },
          success: (res) => {
            resolve(res);  // 修改这里，确保返回完整的响应
          },
          fail: reject
        });
      });

      console.log('点赞响应:', res.data);

      if (res.data.code === 0) {
        // 3. 更新页面状态
        this.setData({
          isLiked: res.data.data.isLiked,
          likesCount: res.data.data.likes
        });

        // 4. 更新本地用户信息中的点赞列表
        const userInfo = wx.getStorageSync('userInfo');
        if (res.data.data.isLiked) {
          // 添加到点赞列表
          if (!userInfo.likes) userInfo.likes = [];
          if (!userInfo.likes.includes(this.data.imageId)) {
            userInfo.likes.push(this.data.imageId);
          }
        } else {
          // 从点赞列表移除
          if (userInfo.likes) {
            userInfo.likes = userInfo.likes.filter(id => id !== this.data.imageId);
          }
        }
        wx.setStorageSync('userInfo', userInfo);

        // 5. 显示操作结果
        wx.showToast({
          title: res.data.data.isLiked ? '点赞成功' : '已取消点赞',
          icon: 'success'
        });
      } else {
        throw new Error(res.data.msg || '操作失败');
      }
    } catch (err) {
      console.error('点赞操作失败:', err);
      wx.showToast({
        title: err.message || '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 处理收藏/取消收藏
  handleFavorite() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('开始收藏操作, 用户信息:', userInfo);
    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }
    
    const token = wx.getStorageSync('token');
    console.log('请求参数:', {
      image_id: this.data.imageInfo._id,
      openid: userInfo.openid
    });

    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/interaction/favorite',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        image_id: this.data.imageInfo._id,
        openid: userInfo.openid
      },
      success: (res) => {
        console.log('收藏响应:', res.data);
        if (res.data.code === 0) {
          // 更新收藏状态和数量
          const imageInfo = { ...this.data.imageInfo };
          imageInfo.collection = res.data.data.collection;
          
          console.log('更新前状态:', {
            原收藏数: this.data.collectCount,
            新收藏数: res.data.data.collection,
            收藏状态: res.data.data.isFavorited
          });

          this.setData({
            imageInfo,
            isFavorited: res.data.data.isFavorited,
            collectCount: res.data.data.collection
          }, () => {
            console.log('更新后状态:', {
              收藏数: this.data.collectCount,
              收藏状态: this.data.isFavorited
            });
          });
          
          wx.showToast({
            title: res.data.data.isFavorited ? '收藏成功' : '已取消收藏',
            icon: 'success'
          });
        }
      },
      fail: (err) => {
        console.error('收藏请求失败:', err);
      }
    });
  },

  // 图片加载失败处理
  onImageError(e) {
    console.error('图片加载失败:', e);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  }
}); 