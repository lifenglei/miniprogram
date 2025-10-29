const db = wx.cloud.database()

Page({
  data: {
    title: '',
    answer: '',
    selectedCategory: '',
    submitting: false,
    errors: {},
    categories: [
      { id: 'js', name: 'JavaScript', icon: 'cuIcon-code' },
      { id: 'ts', name: 'TypeScript', icon: 'cuIcon-text' },
      { id: 'vue', name: 'Vue', icon: 'cuIcon-creative' },
      { id: 'react', name: 'React', icon: 'cuIcon-magic' },
      { id: 'html', name: 'HTML', icon: 'cuIcon-html' },
      { id: 'css', name: 'CSS', icon: 'cuIcon-paint' },
      { id: 'browser', name: '浏览器', icon: 'cuIcon-global' },
      { id: 'network', name: '网络', icon: 'cuIcon-wifi' },
      { id: 'node', name: 'Node.js', icon: 'cuIcon-settings' },
      { id: 'algorithm', name: '算法', icon: 'cuIcon-sort' },
      { id: 'engineering', name: '工程化', icon: 'cuIcon-cascades' },
      { id: 'performance', name: '性能优化', icon: 'cuIcon-evaluate' },
      { id: 'security', name: '安全', icon: 'cuIcon-safe' }
    ]
  },

  onTitleInput(e) {
    this.setData({
      title: e.detail.value,
      errors: {
        ...this.data.errors,
        title: ''
      }
    });
  },

  onAnswerInput(e) {
    this.setData({
      answer: e.detail.value,
      errors: {
        ...this.data.errors,
        answer: ''
      }
    });
  },

  onCategorySelect(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      selectedCategory: id,
      errors: {
        ...this.data.errors,
        category: ''
      }
    });
  },

  validateForm() {
    const errors = {};
    
    if (!this.data.title.trim()) {
      errors.title = '请输入问题标题';
    }
    
    if (!this.data.answer.trim()) {
      errors.answer = '请输入问题答案';
    }
    
    if (!this.data.selectedCategory) {
      errors.category = '请选择问题分类';
    }
    
    this.setData({ errors });
    return Object.keys(errors).length === 0;
  },

  async onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.setData({ submitting: true });

    try {
      await db.collection('questions').add({
        data: {
          title: this.data.title.trim(),
          answer: this.data.answer.trim(),
          category: this.data.selectedCategory,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
        }
      });

      // 先显示成功提示
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 1500
      });

      // 获取首页实例并触发刷新
      const pages = getCurrentPages();
      const indexPage = pages.find(p => p.route === 'pages/index/index');
      if (indexPage) {
        indexPage.loadQuestions();
      }
      
      // 延迟跳转，确保用户看到成功提示
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1500);
    } catch (error) {
      console.error('发布失败:', error);
      wx.showToast({
        title: '发布失败',
        icon: 'error'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
}) 