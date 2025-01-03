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

  // 检查登录状态
  checkLogin() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return false;
    }
    return true;
  },

  onLoad(options) {
    console.log('详情页接收到的参数:', options);
    const { id } = options;
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ 
      imageId: id,
      userInfo
    });

    this.getImageDetail(id);
  },

  async getImageDetail(imageId) {
    try {
      if (!imageId) {
        throw new Error('图片ID不能为空');
      }

      // 获取 token，有则携带
      const token = wx.getStorageSync('token');
      const header = token ? { 'Authorization': `Bearer ${token}` } : {};

      console.log('开始请求图片详情，ID:', imageId);
      console.log('请求参数:', {
        url: 'https://hight.fun/api/images/detail',
        method: 'POST',
        header,
        data: { image_id: Number(imageId) }
      });

      wx.request({
        url: 'https://hight.fun/api/images/detail',
        method: 'POST',
        header,
        data: {
          image_id: Number(imageId)
        },
        success: (res) => {
          console.log('接口返回:', res.data);
          if (res.data.code === 0) {
            const imageData = res.data.data;
            // 保持字段映射，确保兼容性
            const processedData = {
              ...imageData,
              _id: imageData.id,
              likes: imageData.like_count,
              collection: imageData.favorite_count,
              url_list: imageData.url_list,
              main_url: imageData.main_url
            };
            
            this.setData({
              imageInfo: processedData,
              likesCount: imageData.like_count,
              collectCount: imageData.favorite_count,
              isLiked: imageData.isLiked || false,      // 未登录时默认 false
              isFavorited: imageData.isFavorited || false  // 未登录时默认 false
            });
          } else {
            wx.showToast({
              title: res.data.msg || '获取详情失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('请求失败:', err);
          wx.showToast({
            title: '获取详情失败',
            icon: 'none'
          });
        },
        complete: () => {
          this.setData({ loading: false });
        }
      });
    } catch (err) {
      console.error('请求失败:', err);
      wx.showToast({
        title: err.message || '获取详情失败',
        icon: 'none'
      });
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

  // 点赞操作需要登录
  async handleLike() {
    try {
      if (!this.checkLogin()) return;

      // 显示加载中
      wx.showLoading({
        title: '处理中...',
        mask: true  // 防止用户重复点击
      });

      const token = wx.getStorageSync('token');
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/interaction/like',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            image_id: this.data.imageId
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        this.setData({
          isLiked: res.data.data.isLiked,
          likesCount: res.data.data.likes
        });

        // 显示操作结果
        wx.showToast({
          title: res.data.data.isLiked ? '点赞成功' : '已取消点赞',
          icon: 'success'
        });
      } else {
        throw new Error(res.data.msg || '操作失败');
      }
    } catch (err) {
      console.error('点赞失败:', err);
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();  // 隐藏加载提示
    }
  },

  // 收藏操作需要登录
  async handleFavorite() {
    try {
      if (!this.checkLogin()) return;

      // 显示加载中
      wx.showLoading({
        title: '处理中...',
        mask: true  // 防止用户重复点击
      });

      const token = wx.getStorageSync('token');
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/interaction/favorite',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            image_id: this.data.imageId
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        this.setData({
          isFavorited: res.data.data.isFavorited,
          collectCount: res.data.data.collection
        });

        // 显示操作结果
        wx.showToast({
          title: res.data.data.isFavorited ? '收藏成功' : '已取消收藏',
          icon: 'success'
        });
      } else {
        throw new Error(res.data.msg || '操作失败');
      }
    } catch (err) {
      console.error('收藏失败:', err);
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();  // 隐藏加载提示
    }
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