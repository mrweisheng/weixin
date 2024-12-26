import { request } from '../../utils/request';

Page({
  data: {
    imageList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10
  },

  onLoad() {
    this.loadImages();
  },

  // 加载图片列表
  async loadImages() {
    if (this.data.loading || !this.data.hasMore) return;

    try {
      this.setData({ loading: true });
      
      const res = await request({
        url: 'https://jiekou.hkstudy.asia/api/image/list',
        method: 'POST',
        data: {
          page: this.data.page,
          page_size: this.data.pageSize
        }
      });

      if (res.data.code === 0) {
        const newImages = res.data.data.list.map(item => ({
          ...item,
          likes: item.likes || 0,         // 确保有点赞数
          collection: item.collection || 0  // 确保有收藏数
        }));

        this.setData({
          imageList: [...this.data.imageList, ...newImages],
          page: this.data.page + 1,
          hasMore: newImages.length === this.data.pageSize
        });
      }
    } catch (err) {
      console.error('加载图片失败:', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 点赞/取消点赞
  async handleLike(e) {
    const { id, index } = e.currentTarget.dataset;
    const userInfo = wx.getStorageSync('userInfo');

    if (!userInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    try {
      const token = wx.getStorageSync('token');
      if (!token) throw new Error('未登录');

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/interaction/like',
          method: 'POST',
          header: {
            'Authorization': `Bearer ${token}`
          },
          data: {
            image_id: id,
            openid: userInfo.openid
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        // 更新列表中的点赞状态和数量
        const imageList = [...this.data.imageList];
        imageList[index] = {
          ...imageList[index],
          isLiked: res.data.data.isLiked,
          likes: res.data.data.likes
        };

        this.setData({ imageList });

        // 更新本地用户信息
        if (res.data.data.isLiked) {
          if (!userInfo.likes) userInfo.likes = [];
          if (!userInfo.likes.includes(id)) {
            userInfo.likes.push(id);
          }
        } else {
          if (userInfo.likes) {
            userInfo.likes = userInfo.likes.filter(item => item !== id);
          }
        }
        wx.setStorageSync('userInfo', userInfo);

        wx.showToast({
          title: res.data.data.isLiked ? '点赞成功' : '已取消点赞',
          icon: 'success'
        });
      }
    } catch (err) {
      console.error('点赞操作失败:', err);
      wx.showToast({
        title: err.message || '操作失败，请重试',
        icon: 'none'
      });
    }
  },

  onReachBottom() {
    this.loadImages();
  },

  onPullDownRefresh() {
    this.setData({
      imageList: [],
      page: 1,
      hasMore: true
    }, () => {
      this.loadImages().then(() => {
        wx.stopPullDownRefresh();
      });
    });
  }
}); 