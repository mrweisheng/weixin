// index.js
Page({
  data: {
    bannerList: [],
    recommendList: [],
    allContentList: [],
    currentDate: ''
  },

  onLoad() {
    const today = new Date();
    this.setData({
      currentDate: `${today.getMonth() + 1}月${today.getDate()}日`
    });

    this.loadHomeData();
  },

  loadHomeData() {
    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/home/data',
      method: 'POST',
      success: (res) => {
        console.log('首页数据返回:', res.data);
        
        if(res.data.code === 0) {
          const { bannerList, recommendList, allContentList } = res.data.data;
          this.setData({
            bannerList,
            recommendList,
            allContentList
          });
        }
      }
    });
  },

  onImageTap(e) {
    const { info } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/index?id=${info.id}`
    });
  },

  onViewAllTap() {
    wx.switchTab({
      url: '/pages/all/index'
    });
  }
});