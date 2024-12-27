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
      // 使用原始的 wx.request 而不是封装的 request
      wx.request({
        url: 'https://jiekou.hkstudy.asia/api/image/detail',
        method: 'POST',
        data: {
          image_id: imageId
        },
        success: (res) => {
          if (res.data.code === 0) {
            const imageData = res.data.data;
            if (imageData.url) {
              imageData.url = imageData.url.startsWith('http') 
                ? imageData.url 
                : `https://jiekou.hkstudy.asia${imageData.url}`;
            }
            
            this.setData({
              imageInfo: imageData,
              likesCount: imageData.likes || 0,
              collectCount: imageData.collection || 0
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
        title: '获取详情失败',
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
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');

      if (!userInfo || !token) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 显示加载中
      wx.showLoading({
        title: '处理中...',
        mask: true  // 防止用户重复点击
      });

      wx.request({
        url: 'https://jiekou.hkstudy.asia/api/interaction/like',
        method: 'POST',
        header: {
          'Authorization': `Bearer ${token}`
        },
        data: {
          image_id: this.data.imageInfo._id,
          openid: userInfo.openid
        },
        success: (res) => {
          if (res.data.code === 0) {
            // 更新点赞状态和数量
            this.setData({
              isLiked: res.data.data.isLiked,
              likesCount: res.data.data.likes
            });

            wx.showToast({
              title: res.data.data.isLiked ? '点赞成功' : '已取消点赞',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.data.msg || '操作失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '操作失败，请重试',
            icon: 'none'
          });
        },
        complete: () => {
          wx.hideLoading();  // 隐藏加载提示
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  // 收藏操作需要登录
  async handleFavorite() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const token = wx.getStorageSync('token');

      if (!userInfo || !token) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        return;
      }

      // 显示加载中
      wx.showLoading({
        title: '处理中...',
        mask: true  // 防止用户重复点击
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
          if (res.data.code === 0) {
            // 更新收藏状态和数量
            this.setData({
              isFavorited: res.data.data.isFavorited,
              collectCount: res.data.data.collection
            });

            wx.showToast({
              title: res.data.data.isFavorited ? '收藏成功' : '已取消收藏',
              icon: 'success'
            });
          } else {
            wx.showToast({
              title: res.data.msg || '操作失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          wx.showToast({
            title: '操作失败，请重试',
            icon: 'none'
          });
        },
        complete: () => {
          wx.hideLoading();  // 隐藏加载提示
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
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