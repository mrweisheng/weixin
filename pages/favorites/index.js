Page({
  data: {
    imageList: [],
    loading: false,
    hasMore: true,
    page: 1
  },

  onLoad() {
    this.loadImages();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadImages();
    }
  },

  loadImages() {
    if (this.data.loading) return;
    
    this.setData({ loading: true });
    
    // TODO: 调用接口获取收藏列表
    // 模拟数据
    setTimeout(() => {
      const newImages = Array(10).fill(0).map((_, index) => ({
        id: this.data.imageList.length + index + 1,
        imageUrl: 'temp/image.jpg',
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        time: '2024-01-20'
      }));

      this.setData({
        imageList: [...this.data.imageList, ...newImages],
        loading: false,
        hasMore: this.data.page < 3,
        page: this.data.page + 1
      });
    }, 1000);
  },

  onImageTap(e) {
    const { info } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/index?info=${encodeURIComponent(JSON.stringify(info))}`
    });
  }
}); 