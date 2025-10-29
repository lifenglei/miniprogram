const app = getApp()

Page({
  data: {
    selectedCategory: 'all',
    questions: [],
    loading: false,
    categories:[],
    pageSize: 10,
    page: 0,
    hasMore: true,
    loadingMore: false,
    bannerUrls: []
  },

  onLoad() {
    this.loadBanners()
    this.loadCategories()
  },

  async loadBanners(){
    try{
      const db = wx.cloud.database()
      // 你的数据结构：banners 集合内存储文档 { list: [fileID1, fileID2, ...] }
      const res = await db.collection('banners').get()
      const doc = (res.data && res.data[0]) || null
      if(!doc || !Array.isArray(doc.list) || doc.list.length === 0){
        this.setData({ bannerUrls: [] })
        return
      }

      this.setData({ bannerUrls: doc.list })
    }catch(err){
      console.warn('加载Banner失败，将使用默认：', err)
      this.setData({ bannerUrls: [] })
    }
  },

  onPullDownRefresh() {
    // 首页仅展示分类与 banner，这里只结束刷新动画
    wx.stopPullDownRefresh()
  },

  // 从集合 category 读取分类数据
  async loadCategories(){
    try{
      const db = wx.cloud.database()
      let res
      try{
        res = await db.collection('category').orderBy('order','asc').get()
      }catch(e){
        // 若无 order 字段或排序失败，直接获取
        res = await db.collection('category').get()
      }
      console.log(res)

      const categories = (res.data[0].categories || []).map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url
      }))

      this.setData({ categories })
    }catch(err){
      console.error('加载分类失败：', err)
      this.setData({ categories: [] })
      wx.showToast({ title: '分类加载失败', icon: 'none' })
    }
  },

  // 首页不再加载问题列表

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.selectedCategory) {
      // 直接跳转到列表页
      wx.navigateTo({ url: `/pages/questions/questions?category=${encodeURIComponent(category)}` })
      return
    }
    this.setData({ selectedCategory: category }, () => {
      wx.navigateTo({ url: `/pages/questions/questions?category=${encodeURIComponent(category)}` })
    })
  },

  // 跳转到独立的面试题列表页，携带当前分类
  goToQuestions() {
    const category = this.data.selectedCategory
    const query = category ? `?category=${encodeURIComponent(category)}` : ''
    wx.navigateTo({ url: `/pages/questions/questions${query}` })
  },

  onSearchInput(e) {
    const keyword = e.detail.value.trim()
    this.searchKeyword = keyword
    if (!keyword) {
      this.resetAndLoad()
      return
    }

    const db = wx.cloud.database()
    const _ = db.command
    this.setData({ loading: true, page: 0, hasMore: true, questions: [] })
    db.collection('questions')
      .where(_.or([
        { title: db.RegExp({ regexp: keyword, options: 'i' }) },
        { content: db.RegExp({ regexp: keyword, options: 'i' }) }
      ]))
      .orderBy('createTime', 'desc')
      .limit(this.data.pageSize)
      .get()
      .then(res => {
        this.setData({
          questions: res.data,
          page: 1,
          hasMore: res.data.length === this.data.pageSize
        })
      })
      .catch(err => { console.error('搜索失败：', err) })
      .finally(()=>{ this.setData({ loading: false }) })
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },

  // 处理banner点击事件
  onBannerTap() {
    wx.navigateTo({
      url: '/pages/webview/webview?url=' + encodeURIComponent('https://airesume.heartstack.space/#/')
    })
  },

  // 页面分享
  onShareAppMessage(res) {
    return {
      title: '喜刷刷 - 面试题库',
      path: '/pages/index/index',
      imageUrl: ''
    }
  },

  onReachBottom() {},

  resetAndLoad() {},

  formatTime(date) {
    if (typeof date === 'string') {
      date = new Date(date)
    }
    const now = new Date()
    const diff = now - date

    // 小于1小时
    if (diff < 1000 * 60 * 60) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes} 分钟前`
    }
    // 小于24小时
    if (diff < 1000 * 60 * 60 * 24) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      return `${hours} 小时前`
    }
    // 小于30天
    if (diff < 1000 * 60 * 60 * 24 * 30) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      return `${days} 天前`
    }
    // 大于30天
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month}-${day}`
  }
})