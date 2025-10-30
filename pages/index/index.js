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

  onShow() {
    // 页面显示时检查数据是否加载成功，如果失败则重试
    if (this.data.categories.length === 0) {
      this.loadCategories()
    }
    if (this.data.bannerUrls.length === 0) {
      this.loadBanners()
    }
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

      // 检查数据是否存在
      if (!res || !res.data || res.data.length === 0) {
        console.warn('分类数据为空')
        this.setData({ categories: [] })
        return
      }

      // 检查数据结构
      const categoryDoc = res.data[0]
      if (!categoryDoc || !Array.isArray(categoryDoc.categories)) {
        console.warn('分类数据结构不正确')
        this.setData({ categories: [] })
        return
      }

      const categories = categoryDoc.categories.map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url
      })).filter(item => item.id && item.name) // 过滤掉无效数据

      this.setData({ categories })
    }catch(err){
      console.error('加载分类失败：', err)
      this.setData({ categories: [] })
      
      // 处理权限错误（未认证用户），静默失败，不显示错误提示
      const errCode = err.errCode || err.code
      const errMsg = err.errMsg || err.message || ''
      
      // -501023 是云开发未认证访问被拒绝的错误码
      if (errCode === -501023 || 
          errMsg.includes('permission denied') || 
          errMsg.includes('Unauthenticated access') ||
          errMsg.includes('权限')) {
        console.warn('未登录用户无法访问数据库，分类加载静默失败')
        // 不显示错误提示，避免打扰用户
        return
      }
      
      // 其他错误也不显示提示，保持静默
      console.warn('分类加载失败，但不影响其他功能使用')
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

  // 分享到朋友圈
  onShareTimeline(res) {
    return {
      title: '喜刷刷 - 面试题库，助你轻松通过面试！',
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