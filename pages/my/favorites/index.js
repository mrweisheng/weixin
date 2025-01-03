Page({
  data: {
    loading: true,
    items: [],
    error: null
  },

  onLoad() {
    this.fetchFavoritesList();
  },

  async fetchFavoritesList() {
    try {
      const token = wx.getStorageSync('token');
      if (!token) {
        throw new Error('未登录');
      }

      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://hight.fun/api/user/favorites',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        this.setData({
          items: res.data.data.items,
          loading: false
        });
      } else {
        throw new Error(res.data.msg || '获取收藏列表失败');
      }
    } catch (err) {
      console.error('获取收藏列表失败:', err);
      this.setData({
        error: err.message || '获取收藏列表失败',
        loading: false
      });
    }
  },

  // 点击图片跳转到详情
  goToDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/index?id=${id}`
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    try {
      await this.fetchFavoritesList();
    } finally {
      wx.stopPullDownRefresh();
    }
  }
}); 