Page({
  data: {
    imageList: [],
    loading: true
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');

    if (!userInfo || !userInfo.likes || userInfo.likes.length === 0) {
      this.setData({ loading: false });
      return;
    }

    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/image/list-by-ids',
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`
      },
      data: {
        image_ids: userInfo.likes
      },
      success: (res) => {
        console.log('点赞列表返回:', res.data);
        if (res.data.code === 0) {
          this.setData({
            imageList: res.data.data.list
          });
        }
      },
      complete: () => {
        this.setData({ loading: false });
      }
    });
  },

  onImageTap(e) {
    const { info } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/index?id=${info._id}`
    });
  }
}); 