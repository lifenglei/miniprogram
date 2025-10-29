const db = wx.cloud.database()
const _ = db.command

Page({
  data: {
    userInfo: null,
    activeTab: 'history',
    histories: [],
    favorites: [],
    loading: false,
    hasMore: true,
    pageSize: 10,
    currentPage: 0,
    favoriteCount: 0,
    historyCount: 0,
    commentCount: 0
  },

  onLoad() {
    // 获取用户的登录状态
    this.checkUserInfo().then(() => {
      if (this.data.userInfo) {
        this.getUserStats();
      }
      this.loadData(true);
    });

    // 获取 app 实例
    const app = getApp();
    // 检查是否有回调
    if (app.userInfoReadyCallback) {
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo
        });
        this.getUserStats();
      }
    }
  },

  // 检查用户信息
  async checkUserInfo() {
    try {
      // 先从全局数据获取
      const app = getApp();
      if (app.globalData.userInfo) {
        await this.setData({
          userInfo: app.globalData.userInfo
        });
        return;
      }

      // 如果全局没有，尝试从本地存储获取
      const userInfo = wx.getStorageSync('userInfo');
      if (userInfo) {
        await this.setData({
          userInfo: userInfo
        });
        // 同步到全局数据
        app.globalData.userInfo = userInfo;
      }
    } catch (e) {
      console.error('获取用户信息失败：', e);
    }
  },
  getCustomName() {
    const surnames = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳酆鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹姚邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝董粱杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁锺徐邱骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗丁宣贲邓郁单杭洪包诸左石崔吉钮龚';
    const givenNameChars = '伟刚勇毅俊峰强军平保东文辉力明永健世广志义兴良海山仁波宁贵福生龙元全国胜学祥才发武新利清飞彬富顺信子杰涛昌成康星光天达安岩中茂进林有坚和彪博诚先敬震振壮会思群豪心邦承乐绍功松善厚庆磊民友裕河哲江超浩亮政谦亨奇固之轮翰朗伯宏言若鸣朋斌梁栋维启克伦翔旭鹏泽晨辰士以建家致树炎德行时泰盛雄琛钧冠策腾楠榕风航弘';
    const givenNameGirls = '秀娟英华慧巧美娜静淑惠珠翠雅芝玉萍红娥玲芬芳燕彩春菊兰凤洁梅琳素云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳嘉琼勤珍贞莉桂娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷姣婉娴瑾颖露瑶怡婵雁蓓纨仪荷丹蓉眉君琴蕊薇菁梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希宁欣飘育滢馥筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔枝思丽';
    const pick = (str) => str.charAt(Math.floor(Math.random() * str.length));
    const surname = pick(surnames);
    const isFemale = Math.random() < 0.5;
    const pool = isFemale ? givenNameGirls : givenNameChars;
    const givenLen = Math.random() < 0.6 ? 1 : 2; // 60% 单名，40% 双名
    let given = '';
    for (let i = 0; i < givenLen; i++) {
      given += pick(pool);
    }
    return `${surname}${given}`;
  },

  // 处理用户登录
  async onGetUserInfo() {
    // 仅当已拥有 openid 时才视为已登录；若没有 openid，允许继续登录流程
    if (this.data.userInfo && this.data.userInfo.openid) return;
    
    try {
      wx.showLoading({
        title: '登录中...',
      });

      // 确保已经初始化云开发
      if (!wx.cloud) {
        throw new Error('请使用 2.2.3 或以上的基础库以使用云能力');
      }

      // 确保云环境已初始化
      const app = getApp();
      const env = app.globalData.env;
      
      console.log('当前云环境：', env);

      // 重新初始化云环境
      try {
        wx.cloud.init({
          env: env,
          traceUser: true
        });
      } catch (initErr) {
        console.error('云环境初始化失败：', initErr);
      }

      // 调用云函数获取 openid
      console.log('开始调用云函数 getOpenId...');
      const callFunctionResult = await wx.cloud.callFunction({
        name: 'getOpenId',
        data: {}
      });
      
      console.log('云函数调用结果：', callFunctionResult);

      if (!callFunctionResult || !callFunctionResult.result) {
        throw new Error('云函数返回结果为空');
      }

      const { result } = callFunctionResult;

      if (!result.userInfo.openId) {
        throw new Error('获取 openid 失败');
      }

      // 创建用户信息对象
      const userInfo = {
        nickName: result.nickName || this.getCustomName(),
        avatarUrl: result.avatarUrl || '/images/default-avatar.png',
        openid: result.userInfo.openId
      };

      console.log('用户信息：', userInfo);

      // 保存用户信息到本地存储和全局数据
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;
      
      await this.setData({
        userInfo: userInfo
      });

      // 获取用户统计数据
      await this.getUserStats();

      // 重新加载列表数据
      await this.loadData(true);

      wx.hideLoading();
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } catch (err) {
      wx.hideLoading();
      console.error('登录失败：', err);
      console.error('错误堆栈：', err.stack);
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 获取用户统计数据
  async getUserStats() {
    try {
      const openid = this.data.userInfo?.openid;

      // 使用聚合操作获取去重后的历史记录数量
      const historyRes = await db.collection('history')
        .where({
          _openid: openid
        })
        .field({
          questionId: true,
          _id: false
        })
        .get();

      // 使用 Set 对 questionId 去重
      const uniqueQuestionIds = new Set(historyRes.data.map(item => item.questionId));
      const uniqueHistoryCount = uniqueQuestionIds.size;

      // 获取收藏和评论数量
      const [favoritesRes, commentsRes] = await Promise.all([
        db.collection('favorites').where({
          _openid: openid
        }).count(),
        db.collection('comments').where({
          _openid: openid
        }).count()
      ]);


      // 更新统计数据
      this.setData({
        favoriteCount: favoritesRes.total || 0,
        historyCount: uniqueHistoryCount || 0,
        commentCount: commentsRes.total || 0
      });
    } catch (err) {
      console.error('获取用户统计数据失败：', err);
      // 发生错误时设置所有计数为 0
      this.setData({
        favoriteCount: 0,
        historyCount: 0,
        commentCount: 0
      });
    }
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.setData({
      histories: [],
      favorites: [],
      currentPage: 0,
      hasMore: true
    }, () => {
      this.loadData(true)
      // 同时更新用户统计数据
      if (this.data.userInfo) {
        this.getUserStats()
      }
    })
  },

  onPullDownRefresh() {
    this.setData({
      histories: [],
      favorites: [],
      currentPage: 0,
      hasMore: true
    }, () => {
      this.loadData().then(() => {
        wx.stopPullDownRefresh()
      })
    })
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadData()
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.activeTab) return

    this.setData({
      activeTab: tab,
      currentPage: 0,
      hasMore: true
    }, () => {
      // 切换tab时清空对应数据并重新加载
      const key = tab === 'history' ? 'histories' : 'favorites'
      this.setData({
        [key]: []
      }, () => {
        this.loadData(true)
      })
    })
  },

  async loadData(reset = false) {
    if (this.data.loading || (!this.data.hasMore && !reset)) return

    this.setData({ loading: true })

    try {
      const openid = this.data.userInfo?.openid
      if (!openid) {
        // 未登录或无 openid，列表置空且不再向后翻页
        const key = this.data.activeTab === 'history' ? 'histories' : 'favorites'
        this.setData({ [key]: [], loading: false, hasMore: false })
        return
      }

      const collection = this.data.activeTab === 'history' ? 'history' : 'favorites'
      
      // 如果是重置加载，先获取所有数据进行去重
      if (reset && collection === 'history') {
        // 获取所有历史记录
        const allHistories = await db.collection('history')
          .where({ _openid: openid })
          .orderBy('createTime', 'desc')
          .get()

        // 按 questionId 分组，只保留每个 questionId 最新的一条记录
        const uniqueHistories = this.removeDuplicates(allHistories.data)

        // 格式化时间并更新状态
        const formattedHistories = uniqueHistories.map(item => ({
          ...item,
          createTime: this.formatTime(item.createTime)
        }))

        this.setData({
          histories: formattedHistories,
          currentPage: 1,
          hasMore: false,
          loading: false
        })
        return
      }

      // 正常分页加载（按当前用户过滤）
      const query = db.collection(collection)
        .where({ _openid: openid })
        .orderBy('createTime', 'desc')
        .skip(this.data.currentPage * this.data.pageSize)
        .limit(this.data.pageSize)

      const res = await query.get()

      if (!res.data || res.data.length === 0) {
        this.setData({
          hasMore: false,
          loading: false
        })
        return
      }

      // 格式化时间
      const items = res.data.map(item => ({
        ...item,
        createTime: this.formatTime(item.createTime)
      }))

      const key = this.data.activeTab === 'history' ? 'histories' : 'favorites'
      
      // 如果是历史记录，需要去重
      if (key === 'histories' && !reset) {
        const currentHistories = this.data[key]
        const newHistories = [...currentHistories]
        
        // 将新加载的数据逐个添加，避免重复
        items.forEach(item => {
          const existingIndex = newHistories.findIndex(h => h.questionId === item.questionId)
          if (existingIndex === -1) {
            newHistories.push(item)
          }
        })

        this.setData({
          [key]: newHistories,
          currentPage: this.data.currentPage + 1,
          hasMore: res.data.length === this.data.pageSize,
          loading: false
        })
      } else {
        // 收藏列表直接追加
        this.setData({
          [key]: reset ? items : [...this.data[key], ...items],
          currentPage: this.data.currentPage + 1,
          hasMore: res.data.length === this.data.pageSize,
          loading: false
        })
      }
    } catch (err) {
      console.error('加载数据失败：', err)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
      this.setData({ loading: false })
    }
  },

  // 移除重复的历史记录，只保留每个 questionId 最新的一条
  removeDuplicates(records) {
    const uniqueMap = new Map()
    
    // 遍历所有记录，由于已经按时间倒序排列，
    // 所以Map中最终保存的是每个questionId最新的一条记录
    records.forEach(record => {
      if (!uniqueMap.has(record.questionId)) {
        uniqueMap.set(record.questionId, record)
      }
    })

    // 转换回数组并保持时间倒序
    return Array.from(uniqueMap.values())
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
  },

  formatTime(dateStr) {
    if (!dateStr) return ''
    
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date

    // 小于1小时，显示"x分钟前"
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分钟前`
    }
    
    // 小于24小时，显示"x小时前"
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    
    // 小于30天，显示"x天前"
    if (diff < 30 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}天前`
    }
    
    // 超过30天，显示具体日期
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${year}-${month}-${day}`
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) {
      wx.showToast({
        title: '题目不存在',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/pages/detail/detail?id=${encodeURIComponent(id)}`
    })
  },

  // 处理头像选择
  async onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    try {
      // 更新本地数据
      const userInfo = this.data.userInfo;
      userInfo.avatarUrl = avatarUrl;
      
      // 更新全局数据和存储
      const app = getApp();
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      
      this.setData({
        userInfo: userInfo
      });

      wx.showToast({
        title: '头像更新成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('更新头像失败：', err);
      wx.showToast({
        title: '更新头像失败',
        icon: 'none'
      });
    }
  },

  // 处理昵称输入
  async onInputNickname(e) {
    const nickName = e.detail.value;
    if (!nickName) return;
    
    try {
      // 更新本地数据
      const userInfo = this.data.userInfo;
      userInfo.nickName = nickName;
      
      // 更新全局数据和存储
      const app = getApp();
      app.globalData.userInfo = userInfo;
      wx.setStorageSync('userInfo', userInfo);
      
      this.setData({
        userInfo: userInfo
      });

      wx.showToast({
        title: '昵称更新成功',
        icon: 'success'
      });
    } catch (err) {
      console.error('更新昵称失败：', err);
      wx.showToast({
        title: '更新昵称失败',
        icon: 'none'
      });
    }
  },

  // 退出登录并清理本地/全局用户信息与列表数据
  logout() {
    try {
      const app = getApp()
      wx.removeStorageSync('userInfo')
      if (app && app.globalData) {
        app.globalData.userInfo = null
      }
      this.setData({
        userInfo: null,
        histories: [],
        favorites: [],
        favoriteCount: 0,
        historyCount: 0,
        commentCount: 0,
        currentPage: 0,
        hasMore: false
      })
      wx.showToast({ title: '已退出登录', icon: 'success' })
    } catch (err) {
      console.error('退出登录失败：', err)
      wx.showToast({ title: '退出失败', icon: 'none' })
    }
  }
}) 