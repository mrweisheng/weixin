import { request } from '../../utils/request';

Page({
  data: {
    allContentList: []
  },

  onShow() {
    this.loadAllData();
  },

  loadAllData() {
    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/home/data',
      method: 'POST',
      success: (res) => {
        console.log('全部数据返回:', res.data);
        
        if(res.data.code === 0) {
          const { allContentList } = res.data.data;
          this.setData({
            allContentList
          });
        }
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