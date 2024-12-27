// index.js
Page({
  data: {
    bannerList: [],
    recommendList: [],
    allContentList: [],
    currentDate: '',
    loading: true,
    imageLoadStatus: {},  // 记录图片加载状态
    visibleRange: {
      start: 0,
      end: 10
    }
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
          // 为每个图片添加缩略图和高清图
          const processedList = res.data.data.allContentList.map(item => ({
            ...item,
            // 添加一个超小的模糊缩略图
            thumbnail: item.main_url + '?x-oss-process=image/resize,w_50/quality,q_50/blur,r_3,s_2',
            // 添加中等质量的预览图
            preview: item.main_url + '?x-oss-process=image/resize,w_400/quality,q_75',
            // 原图
            main_url: item.main_url,
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
    const { index, type } = e.currentTarget.dataset;
    const { imageLoadStatus } = this.data;
    
    if (!imageLoadStatus[index]) {
      imageLoadStatus[index] = {};
    }
    imageLoadStatus[index][type] = true;
    
    this.setData({ imageLoadStatus });
  },

  // 图片加载失败处理
  onImageError(e) {
    const { index } = e.currentTarget.dataset;
    console.error('图片加载失败:', e, index);
  },

  // 添加预加载函数
  preloadImages() {
    const { allContentList } = this.data;
    const visibleItems = allContentList.slice(0, 6); // 只预加载前6张
    
    visibleItems.forEach(item => {
      wx.getImageInfo({
        src: item.main_url,
        success: () => {
          // 图片预加载完成
        }
      });
    });
  },

  onPageScroll(e) {
    // 根据滚动位置计算可见范围
    const query = wx.createSelectorQuery();
    query.selectAll('.grid-item').boundingClientRect((rects) => {
      const windowHeight = wx.getSystemInfoSync().windowHeight;
      let start = this.data.visibleRange.start;
      let end = this.data.visibleRange.end;
      
      rects.forEach((rect, index) => {
        if (rect.top < windowHeight && rect.bottom > 0) {
          start = Math.max(0, index - 2);
          end = Math.min(this.data.allContentList.length, index + 8);
        }
      });
      
      if (start !== this.data.visibleRange.start || end !== this.data.visibleRange.end) {
        this.setData({
          visibleRange: { start, end }
        });
      }
    }).exec();
  }
});