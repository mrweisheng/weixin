import { request } from '../../utils/request';

Page({
  data: {
    imageList: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 10,
    firstLoad: true,
    loadFailed: false
  },

  onLoad() {
    console.log('页面加载 onLoad');
    this.loadImages();
  },

  loadImages() {
    if (this.data.loading || !this.data.hasMore) {
      console.log('加载被阻止:', { 
        loading: this.data.loading, 
        hasMore: this.data.hasMore 
      });
      return;
    }

    console.log('开始加载图片, 页码:', this.data.page);
    this.setData({ loading: true });

    wx.request({
      url: 'https://hight.fun/api/images/all',
      method: 'GET',
      data: {
        page: this.data.page,
        pageSize: this.data.pageSize
      },
      success: (res) => {
        console.log('请求成功，返回数据:', res.data);
        
        if (res.data.success) {
          const newList = res.data.data.items.map(item => ({
            ...item,
            _id: item.id,
            main_url: item.cover_url || item.main_url,
            url_list: item.urls || item.url_list,
            create_date: new Date(item.uploaded_at).getTime()
          }));
          
          this.setData({
            imageList: [...this.data.imageList, ...newList],
            page: this.data.page + 1,
            hasMore: this.data.page < res.data.data.pagination.totalPages,
            firstLoad: false,
            loadFailed: false
          }, () => {
            console.log('数据更新完成，当前状态:', {
              总数: this.data.imageList.length,
              当前页: this.data.page,
              还有更多: this.data.hasMore
            });
          });
        } else {
          console.error('请求返回错误:', res.data.msg);
          this.setData({ 
            loadFailed: true,
            firstLoad: false
          });
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        this.setData({ 
          loadFailed: true,
          firstLoad: false
        });
      },
      complete: () => {
        this.setData({ loading: false });
        console.log('加载状态更新完成');
      }
    });
  },

  onImageLoad(e) {
    const { index } = e.currentTarget.dataset;
    console.log(`图片 ${index} 加载完成`);
    const key = `imageList[${index}].loaded`;
    this.setData({
      [key]: true
    });
  },

  retryLoad() {
    console.log('点击重试加载');
    this.setData({
      loadFailed: false,
      loading: false
    }, () => {
      this.loadImages();
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
    if (!this.data.loadFailed) {
      this.loadImages();
    }
  },

  onPullDownRefresh() {
    console.log('下拉刷新');
    this.setData({
      imageList: [],
      page: 1,
      hasMore: true,
      loadFailed: false
    }, () => {
      this.loadImages();
      wx.stopPullDownRefresh();
    });
  }
}); 