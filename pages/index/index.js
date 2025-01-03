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
    console.log('开始加载首页数据');
    this.setData({ loading: true });
    
    wx.request({
      url: 'https://hight.fun/api/images/home-data',
      method: 'GET',
      success: (res) => {
        console.log('首页数据返回:', res.data);
        
        if(res.data.code === 0) {
          // 为每个图片添加缩略图和高清图
          const processedList = res.data.data.allContentList.map(item => ({
            ...item,
            thumbnail: item.main_url + '?x-oss-process=image/resize,w_50/quality,q_50/blur,r_3,s_2',
            preview: item.main_url + '?x-oss-process=image/resize,w_400/quality,q_75',
            main_url: item.main_url,
            loaded: false
          }));
          
          this.setData({
            bannerList: res.data.data.bannerList,
            recommendList: res.data.data.recommendList,
            allContentList: processedList,
            loading: false
          }, () => {
            console.log('数据更新完成');
            wx.stopPullDownRefresh();
            console.log('停止下拉刷新');
          });
        } else {
          console.error('接口返回错误:', res.data.msg);
        }
      },
      fail: (err) => {
        console.error('请求失败:', err);
        this.setData({ loading: false });
        wx.stopPullDownRefresh();
      }
    });
  },

  onImageTap(e) {
    const { info } = e.currentTarget.dataset;
    console.log('点击图片，传递的信息:', info);
    wx.navigateTo({
      url: `/pages/detail/index?id=${info.id}`
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
          url: 'https://hight.fun/api/images/all',
          method: 'GET',
          data: {
            page: this.data.page,
            pageSize: this.data.pageSize
          },
          success: resolve,
          fail: reject
        });
      });

      if (res.data.success) {
        // 处理图片列表
        const imageList = res.data.data.map(item => ({
          ...item,
          _id: item.id,
          main_url: item.cover_url,
          url_list: item.urls,
          create_date: new Date(item.uploaded_at).getTime()
        }));
        
        this.setData({
          imageList: [...this.data.imageList, ...imageList],
          hasMore: this.data.page < res.data.pagination.totalPages,
          loading: false
        });
      } else {
        throw new Error('获取图片列表失败');
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
      const windowInfo = wx.getWindowInfo();
      const windowHeight = windowInfo.windowHeight;
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
  },

  onPullDownRefresh() {
    console.log('触发下拉刷新');
    try {
      this.setData({
        imageList: [],
        loading: true
      }, () => {
        console.log('重置数据状态完成');
        this.loadHomeData();
      });
    } catch (err) {
      console.error('下拉刷新出错:', err);
    }
  }
});