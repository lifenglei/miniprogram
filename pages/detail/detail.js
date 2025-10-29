const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    question: null,
    showAnswer: true,
    isFavorite: false,
    favoriteId: null,  // 添加favoriteId用于存储收藏记录的_id
    loading: true,     // 添加loading状态
    comments: [],      // 评论列表
    commentText: '',   // 评论输入内容
    showShareMenu: false, // 添加分享菜单状态
    selectedCategory: null,
    // 解析后的答案结构与回退文本
    answerParsed: [],
    answerText: '',
    // 答案折叠控制
    isAnswerCollapsed: true,
    answerShouldCollapse: false
  },

  onLoad(options) {
    if (!options.id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    try {
      this.questionId = decodeURIComponent(options.id)
      this.loadQuestion()
      this.loadComments()  // 加载评论列表
    } catch (err) {
      console.error('解析题目ID失败：', err)
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  onShow() {
    // 如果已经加载过题目，则只更新收藏状态
    if (this.questionId) {
      this.checkFavoriteStatus()
      wx.nextTick(() => this.measureAnswerHeight())
    }
  },

  async checkFavoriteStatus() {
    
    if (!this.questionId) {
      console.error('checkFavoriteStatus: questionId is missing')
      return
    }

    try {
      // 先确保云开发已经初始化
      if (!wx.cloud) {
        console.error('云开发未初始化')
        return
      }

      // 获取用户 openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      })

      // 构建查询条件
      const query = {
        questionId: this.questionId,
        _openid: result.openid // 使用实际的 openid 而不是 {openid}
      }

      // 查询收藏记录
      const favoriteRes = await db.collection('favorites')
        .where(query)
        .get()


      // 更新状态
      const newState = {
        isFavorite: favoriteRes.data.length > 0,
        favoriteId: favoriteRes.data.length > 0 ? favoriteRes.data[0]._id : null
      }
      
      this.setData(newState)

    } catch (err) {
      console.error('检查收藏状态失败：', err)
      // 如果是权限问题，尝试通过云函数查询
      if (err.errCode === -502 || err.errCode === -501) {
        this.checkFavoriteStatusViaCloud()
      }
    }
  },

  async checkFavoriteStatusViaCloud() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'checkFavorite',
        data: {
          questionId: this.questionId
        }
      })
      
      
      if (result.result) {
        this.setData({
          isFavorite: result.result.isFavorite,
          favoriteId: result.result.favoriteId
        })
      }
    } catch (err) {
      console.error('通过云函数检查收藏状态失败：', err)
    }
  },

  async loadQuestion() {
    if (!this.questionId) {
      wx.showToast({
        title: '题目ID无效',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    try {
      wx.showLoading({
        title: '加载中...'
      })

      // 先检查ID是否有效
      if (typeof this.questionId !== 'string' || !this.questionId.trim()) {
        throw new Error('Invalid question ID')
      }

      // 并行加载题目信息和收藏状态
      const [questionRes, favoriteRes] = await Promise.all([
        db.collection('questions').doc(this.questionId).get(),
        db.collection('favorites').where({
          questionId: this.questionId,
          _openid: '{openid}'
        }).get()
      ])
      
      if (!questionRes.data) {
        throw new Error('Question not found')
      }

      // 格式化创建时间
      const questionData = {
        ...questionRes.data,
        createTime: this.formatTime(questionRes.data.createTime)
      }

      // 更新题目信息和收藏状态
      const parsed = this.parseAnswer(questionData.answer)
      this.setData({ 
        question: questionData,
        loading: false,
        isFavorite: favoriteRes.data.length > 0,
        favoriteId: favoriteRes.data.length > 0 ? favoriteRes.data[0]._id : null,
        answerParsed: parsed.answerParsed,
        answerText: parsed.answerText
      })

      // 在下一次渲染后测量答案高度决定是否需要折叠
      wx.nextTick(() => {
        this.measureAnswerHeight()
      })
      
      // 添加到历史记录
      await this.addToHistory()
      
      // 更新浏览次数
      await db.collection('questions').doc(this.questionId).update({
        data: {
          viewCount: _.inc(1)
        }
      }).catch(err => {
        console.error('更新浏览次数失败：', err)
      })

      wx.hideLoading()
    } catch (err) {
      console.error('加载题目失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '题目不存在或已被删除',
        icon: 'none'
      })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }
  },

  // 将复杂的答案文本解析为结构化数据，便于渲染
  parseAnswer(answer) {
    try {
      if (!answer || typeof answer !== 'string') {
        return { answerParsed: [], answerText: '' }
      }

      // 去除可能的前缀，如 "answer:" 或 "答案："
      let content = answer.replace(/^\s*(answer|答案)\s*[:：]\s*/i, '')

      // 预设可识别的小节标题
      const sectionTitles = [
        '键的类型',
        '键值对的顺序',
        '性能',
        '默认原型属性'
      ]

      // 依据小节标题切分
      const sections = []
      const pattern = new RegExp(`(${sectionTitles.join('|')})\s*[:：]`, 'g')
      let match
      let lastIndex = 0
      let lastTitle = null

      while ((match = pattern.exec(content)) !== null) {
        if (lastTitle !== null) {
          // 上一段内容到当前标题之前为上一节内容
          const prevContent = content.substring(lastIndex, match.index).trim()
          if (prevContent) {
            sections.push({ title: lastTitle, text: prevContent })
          }
        }
        lastTitle = match[1]
        lastIndex = pattern.lastIndex
      }
      // 收尾
      if (lastTitle !== null) {
        const tail = content.substring(lastIndex).trim()
        if (tail) {
          sections.push({ title: lastTitle, text: tail })
        }
      }

      // 若未识别出任何小节，则尝试以斜杠分段
      if (sections.length === 0) {
        const fallbackItems = content.split(/\s*\/\s*/).map(t => t.trim()).filter(Boolean)
        if (fallbackItems.length > 1) {
          return {
            answerParsed: [{
              section: '答案要点',
              items: fallbackItems.map(line => ({ label: '', text: line }))
            }],
            answerText: content
          }
        }
        return { answerParsed: [], answerText: content }
      }

      // 将每节内容解析为条目（支持代码块与文本）
      const answerParsed = sections.map(sec => {
        const items = []

        // 先按代码块切分（```lang\n...```），保留顺序
        const codeBlockRe = /```([a-zA-Z0-9#+\-]*)?\n([\s\S]*?)```/g
        let lastIdx = 0
        let mcb
        while ((mcb = codeBlockRe.exec(sec.text)) !== null) {
          const before = sec.text.substring(lastIdx, mcb.index)
          if (before && before.trim()) {
            // 非代码片段继续拆分为 Map/Object 项或普通文本项
            const parts = before.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean)
            parts.forEach(p => {
              const m = p.match(/^\s*(Map|Object)\s*[:：]\s*(.+)$/i)
              if (m) {
                items.push({ type: 'text', label: m[1], text: m[2] })
              } else if (p) {
                items.push({ type: 'text', label: '', text: p })
              }
            })
          }

          const lang = (mcb[1] || '').toLowerCase()
          const code = mcb[2] || ''
          const nodes = this.highlightToNodes(code, lang)
          items.push({ type: 'code', lang, nodes })
          lastIdx = codeBlockRe.lastIndex
        }
        // 尾部剩余文本
        const tail = sec.text.substring(lastIdx)
        if (tail && tail.trim()) {
          const parts = tail.split(/\s*\/\s*/).map(s => s.trim()).filter(Boolean)
          parts.forEach(p => {
            const m = p.match(/^\s*(Map|Object)\s*[:：]\s*(.+)$/i)
            if (m) {
              items.push({ type: 'text', label: m[1], text: m[2] })
            } else if (p) {
              items.push({ type: 'text', label: '', text: p })
            }
          })
        }

        return { section: sec.title, items }
      }).filter(sec => sec.items.length > 0)

      return {
        answerParsed,
        answerText: content
      }
    } catch (e) {
      console.warn('parseAnswer 失败，回退为纯文本：', e)
      return { answerParsed: [], answerText: typeof answer === 'string' ? answer : '' }
    }
  },

  // 测量答案内容高度，超过阈值则显示“展开更多”并默认折叠
  measureAnswerHeight() {
    try {
      const sys = wx.getSystemInfoSync()
      const thresholdRpx = 420 // 折叠阈值（rpx）
      const thresholdPx = (sys.windowWidth || 375) * thresholdRpx / 750
      const q = wx.createSelectorQuery()
      q.in(this)
        .select('#answerInner')
        .boundingClientRect(rect => {
          if (!rect) return
          const need = rect.height > thresholdPx
          this.setData({
            answerShouldCollapse: need,
            isAnswerCollapsed: need
          })
        })
        .exec()
    } catch (e) {
      // 测量失败不影响主流程
      console.warn('measureAnswerHeight 失败：', e)
    }
  },

  // 切换答案折叠/展开
  toggleAnswerCollapse() {
    if (!this.data.answerShouldCollapse) return
    this.setData({ isAnswerCollapsed: !this.data.isAnswerCollapsed })
  },

  onReady() {
    wx.nextTick(() => this.measureAnswerHeight())
  },

  // 简易语法高亮：将代码转为 rich-text nodes
  highlightToNodes(code, lang) {
    const tokens = this.tokenizeCode(code, lang)
    // 预设色板
    const colors = {
      keyword: '#d73a49',
      string: '#032f62',
      number: '#005cc5',
      comment: '#6a737d',
      operator: '#d73a49',
      plain: '#e2e8f0'
    }

    // 将 \n 转为 <br/>
    const children = []
    tokens.forEach(tok => {
      if (tok.value === '\n') {
        children.push({ name: 'br' })
      } else {
        children.push({
          name: 'span',
          attrs: { style: `color: ${colors[tok.type] || colors.plain};` },
          children: [{ type: 'text', text: tok.value }]
        })
      }
    })

    return [{
      name: 'pre',
      attrs: { style: 'margin:0;white-space:pre-wrap;word-break:break-word;' },
      children: [{ name: 'code', attrs: {}, children }]
    }]
  },

  // 将代码字符串切分为 token 列表（极简版）
  tokenizeCode(code, lang) {
    const src = code || ''
    const patterns = [
      { type: 'comment', regex: /\/\/.*?(?=\n|$)/y },
      { type: 'string',  regex: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/y },
      { type: 'number',  regex: /\b(?:0x[\da-fA-F]+|\d+\.\d+|\d+)\b/y },
      { type: 'keyword', regex: /\b(await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/y },
      { type: 'operator',regex: /[=+\-*/%<>!&|^~?:]+/y },
      { type: 'plain',   regex: /[A-Za-z_$][\w$]*/y },
      { type: 'plain',   regex: /\s+/y },
      { type: 'plain',   regex: /./y },
    ]

    const tokens = []
    let i = 0
    while (i < src.length) {
      let matched = false
      for (const p of patterns) {
        p.regex.lastIndex = i
        const m = p.regex.exec(src)
        if (m && m.index === i) {
          const value = m[0]
          if (value === '\n') {
            tokens.push({ type: 'plain', value: '\n' })
          } else {
            tokens.push({ type: p.type, value })
          }
          i += value.length
          matched = true
          break
        }
      }
      if (!matched) {
        // 理论上不会到这里
        tokens.push({ type: 'plain', value: src[i] })
        i += 1
      }
    }
    return tokens
  },

  formatTime(date) {
    if (!date) return ''
    
    if (typeof date === 'string') {
      date = new Date(date)
    } else if (date.toDate) {
      // 处理 Timestamp 类型
      date = date.toDate()
    }

    const now = new Date()
    const diff = now - date

    // 小于1分钟
    if (diff < 1000 * 60) {
      return '刚刚'
    }
    // 小于1小时
    if (diff < 1000 * 60 * 60) {
      const minutes = Math.floor(diff / (1000 * 60))
      return `${minutes}分钟前`
    }
    // 小于24小时
    if (diff < 1000 * 60 * 60 * 24) {
      const hours = Math.floor(diff / (1000 * 60 * 60))
      return `${hours}小时前`
    }
    // 小于30天
    if (diff < 1000 * 60 * 60 * 24 * 30) {
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      return `${days}天前`
    }
    // 大于30天
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hours}:${minutes}`
    }
    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  async addToHistory() {
    console.log(this.data.question)
    if (!this.questionId || !this.data.question) return

    try {
      // 先检查是否已经有相同的历史记录
      const existingHistory = await db.collection('history').where({
        questionId: this.questionId,
        _openid: '{openid}'
      }).get()

      if (existingHistory.data.length > 0) {
        // 如果已存在，更新时间戳
        await db.collection('history').doc(existingHistory.data[0]._id).update({
          data: {
            createTime: db.serverDate()
          }
        })
      } else {
        // 如果不存在，添加新记录
        await db.collection('history').add({
          data: {
            questionId: this.questionId,
            createTime: db.serverDate(),
            title: this.data.question?.question || '',
            category: this.data.question?.category || '',
            openid: this.data.userInfo?.openid || ''
          }
        })
      }
    } catch (err) {
      console.error('更新历史记录失败：', err)
    }
  },

  toggleAnswer() {
    const next = !this.data.showAnswer
    this.setData({ showAnswer: next })
    if (next) {
      wx.nextTick(() => this.measureAnswerHeight())
    }
  },

  async toggleFavorite() {
    if (!this.questionId || !this.data.question) {
      wx.showToast({
        title: '请等待题目加载完成',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: this.data.isFavorite ? '取消收藏中...' : '收藏中...'
      })

      // 获取用户 openid
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId'
      })

      if (this.data.isFavorite && this.data.favoriteId) {
        // 取消收藏
        await db.collection('favorites').doc(this.data.favoriteId).remove()
        this.setData({
          isFavorite: false,
          favoriteId: null
        })
      } else {
        // 检查是否已经收藏过
        const existingFavorite = await db.collection('favorites').where({
          questionId: this.questionId,
          _openid: result.openid // 使用实际的 openid
        }).get()


        if (existingFavorite.data.length > 0) {
          // 如果已经收藏过，直接更新状态
          this.setData({
            isFavorite: true,
            favoriteId: existingFavorite.data[0]._id
          })
        } else {
          // 添加新的收藏
          const addResult = await db.collection('favorites').add({
            data: {
              questionId: this.questionId,
              createTime: db.serverDate(),
              title: this.data.question?.question || '',
              category: this.data.question?.category || '',
              content: this.data.question?.answer || ''
            }
          })
          wx.showToast({
            title: '收藏成功',
            icon: 'success'
          })
          this.setData({
            isFavorite: true,
            favoriteId: addResult.id
          })
        }
      }
    } catch (err) {
      wx.hideLoading()
      console.error('操作收藏失败：', err)
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      })
    }finally{
      wx.hideLoading()
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    if (!this.data.question) return {};
    
    return {
      title: this.data.question.title,
      query: `id=${this.questionId}`,
      imageUrl: '/images/share-default.png' // 默认分享图片
    };
  },

  // 分享给朋友
  onShareAppMessage() {
    if (!this.data.question) return {};
    
    return {
      title: this.data.question.title,
      path: `/pages/detail/detail?id=${this.questionId}`,
      imageUrl: '/images/share-default.png' // 默认分享图片
    };
  },

  // 处理页面内分享按钮点击
  handleShare() {
    // 如果在支持新版接口的基础库版本下
    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline']
      });
    }
  },

  onCommentInput(e) {
    this.setData({
      commentText: e.detail.value
    })
  },

  async submitComment() {
    if (!this.data.commentText.trim()) {
      wx.showToast({
        title: '请输入评论内容',
        icon: 'none'
      })
      return
    }

    try {
      wx.showLoading({
        title: '发送中...'
      })

      // 获取用户信息
      const userInfo = await wx.cloud.callFunction({
        name: 'getOpenId',  // 添加了name参数
        data: {}  // 可以传递额外的参数
      })

      // 添加评论
      const result = await db.collection('comments').add({
        data: {
          questionId: this.questionId,
          content: this.data.commentText,
          createTime: db.serverDate(),
          avatar: userInfo.result.avatarUrl || '/images/default-avatar.png',
          username: userInfo.result.nickName || '匿名用户'
        }
      })

      // 更新问题的评论数
      await db.collection('questions').doc(this.questionId).update({
        data: {
          commentCount: _.inc(1)
        }
      })

      // 清空输入框并刷新评论列表
      this.setData({
        commentText: ''
      })
      await this.loadComments()

      wx.hideLoading()
      wx.showToast({
        title: '评论成功',
        icon: 'success'
      })
    } catch (err) {
      console.error('提交评论失败：', err)
      wx.hideLoading()
      wx.showToast({
        title: '评论失败，请重试',
        icon: 'none'
      })
    }
  },

  async loadComments() {
    try {
      const res = await db.collection('comments')
        .where({
          questionId: this.questionId
        })
        .orderBy('createTime', 'desc')
        .get()

      const comments = res.data.map(comment => ({
        ...comment,
        createTime: this.formatTime(comment.createTime)
      }))

      this.setData({
        comments
      })
    } catch (err) {
      console.error('加载评论失败：', err)
    }
  },

  onCategoryTap() {
    const category = this.data.question.category;
    this.setData({
      selectedCategory: this.data.selectedCategory === category ? null : category
    });
    
    // 可以在这里添加跳转到分类列表页的逻辑
    if (this.data.selectedCategory) {
      wx.navigateTo({
        url: `/pages/index/index?category=${encodeURIComponent(category)}`
      });
    }
  },
}) 