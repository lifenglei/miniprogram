Page({
  data: {
    selectedCategory: 'all',
    questions: [],
    loading: false,
    pageSize: 10,
    page: 0,
    hasMore: true,
    loadingMore: false,
  },

  onLoad(options) {
    // 支持从首页携带的 category 参数
    if (options && options.category) {
      const decoded = decodeURIComponent(options.category)
      this.setData({ selectedCategory: decoded })
    }
    this.resetAndLoad()
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    if (category === this.data.selectedCategory) return
    this.setData({ selectedCategory: category }, () => {
      this.resetAndLoad()
    })
  },

  async loadQuestions(append = false) {
    if (this.data.loading || this.data.loadingMore) return

    const isFirstPage = !append || this.data.page === 0
    this.setData({ loading: isFirstPage, loadingMore: !isFirstPage })
    try {
      const db = wx.cloud.database()
      const query = this.data.selectedCategory === 'all' ? {} : { category: this.data.selectedCategory }
      const res = await db.collection('questions')
        .where(query)
        .orderBy('createTime', 'desc')
        .skip(this.data.page * this.data.pageSize)
        .limit(this.data.pageSize)
        .get()

      const list = res.data.map(item => ({ ...item }))
      const merged = append ? [...this.data.questions, ...list] : list
      const hasMore = list.length === this.data.pageSize

      this.setData({
        questions: merged,
        hasMore,
        page: append ? this.data.page + 1 : 1
      })
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'error' })
      console.error('加载问题失败：', err)
    } finally {
      this.setData({ loading: false, loadingMore: false })
    }
  },

  onReachBottom() {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return
    this.loadQuestions(true)
  },

  resetAndLoad() {
    this.setData({ questions: [], page: 0, hasMore: true })
    return this.loadQuestions(false)
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})