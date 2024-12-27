// index.js
Page({
  data: {
    bannerList: [],
    recommendList: [],
    allContentList: [],
    currentDate: '',
    loading: true,
    imageLoadStatus: {}  // 记录图片加载状态
  },

  onLoad() {
    const today = new Date();
    this.setData({
      currentDate: `${today.getMonth() + 1}月${today.getDate()}日`
    });

    this.loadHomeData();
  },

  loadHomeData() {
    this.setData({ loading: true });
    wx.request({
      url: 'https://jiekou.hkstudy.asia/api/home/data',
      method: 'POST',
      success: (res) => {
        console.log('首页数据返回:', res.data);
        
        if(res.data.code === 0) {
          // 处理图片列表，添加缩略图
          const processedList = res.data.data.allContentList.map(item => ({
            ...item,
            thumbnail: item.url + '?x-oss-process=image/resize,w_200',  // 生成缩略图URL
            loaded: false
          }));
          
          this.setData({
            bannerList: res.data.data.bannerList,
            recommendList: res.data.data.recommendList,
            allContentList: processedList,
            loading: false
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
  },

  onViewAllTap() {
    wx.switchTab({
      url: '/pages/all/index'
    });
  },

  onUnload() {
    getApp().globalData = {
      ...getApp().globalData,
      allContentList: this.data.allContentList
    };
  },

  // 获取图片列表
  async getImageList() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.request({
          url: 'https://jiekou.hkstudy.asia/api/image/list',
          method: 'POST',
          data: {
            page: this.data.page,
            pageSize: this.data.pageSize
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.code === 0) {
        // 处理图片列表中的URL
        const imageList = res.data.data.list.map(item => ({
          ...item,
          url: item.url.startsWith('http') 
            ? item.url 
            : `https://jiekou.hkstudy.asia${item.url}`
        }));
        
        this.setData({
          imageList: [...this.data.imageList, ...imageList],
          hasMore: res.data.data.hasMore,
          loading: false
        });
      } else {
        throw new Error(res.data.msg || '获取图片列表失败');
      }
    } catch (err) {
      console.error('获取图片列表失败:', err);
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '获取失败，请重试',
        icon: 'none'
      });
    }
  },

  // 图片加载完成处理
  onImageLoad(e) {
    const { index } = e.currentTarget.dataset;
    const { imageLoadStatus } = this.data;
    imageLoadStatus[index] = true;
    this.setData({ imageLoadStatus });
  },

  // 图片加载失败处理
  onImageError(e) {
    const { index } = e.currentTarget.dataset;
    console.error('图片加载失败:', e, index);
  }
});