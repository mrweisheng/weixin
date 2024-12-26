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
    console.log('全部页面加载');
    this.loadImages();
  },

  loadImages() {
    if (this.data.loading || !this.data.hasMore) {
      console.log('加载被阻止:', { loading: this.data.loading, hasMore: this.data.hasMore });
      return;
    }

    console.log('开始加载图片列表, 页码:', this.data.page);
    this.setData({ loading: true });

    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/image/list',
      method: 'POST',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        console.log('请求返回数据:', res.data);
        
        if (res.data.code === 0) {
          const newList = res.data.data.list;
          console.log('新增数据:', newList);
          
          this.setData({
            imageList: [...this.data.imageList, ...newList],
            page: this.data.page + 1,
            hasMore: res.data.data.hasMore
          }, () => {
            console.log('数据更新后的状态:', {
              总数: this.data.imageList.length,
              当前页: this.data.page,
              还有更多: this.data.hasMore
            });
          });
        } else {
          console.error('请求返回错误:', res.data.msg);
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
      },
      complete: () => {
        this.setData({ loading: false });
        console.log('加载状态更新:', { loading: false });
      }
    });
  },

  onImageTap(e) {
    const { info } = e.currentTarget.dataset;
    console.log('点击图片:', info);
    wx.navigateTo({
      url: `/pages/detail/index?id=${info._id}`
    });
  },

  onReachBottom() {
    console.log('触底加载更多');
    this.loadImages();
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
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