// 電子書主程式
class FamilyTreeEbook {
  constructor() {
    this.currentPage = 0;
    this.totalPages = 16; // 封面 + 15 個 PDF
    this.pages = [];
    this.pdfFiles = [];
    this.isLoading = true;
    this.musicPlaying = false;

    this.init();
  }

  async init() {
    // 產生 PDF 檔案路徑
    for (let i = 0; i <= 14; i++) {
      this.pdfFiles.push(`pdf/${i.toString().padStart(2, '0')}.pdf`);
    }

    // 初始化頁面
    await this.loadAllPDFs();
    this.setupNavigation();
    this.setupMusicControl();
    this.setupThumbnails();
    this.setupKeyboardNav();
    this.setupTouchNav();

    // 隱藏載入畫面
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('hidden');
      this.isLoading = false;
    }, 1000);

    console.log('許比派下親屬譜電子書 v1.0.0');
  }

  async loadAllPDFs() {
    const container = document.getElementById('pages-container');
    const thumbnailsPanel = document.getElementById('thumbnails-panel');

    for (let i = 0; i < this.pdfFiles.length; i++) {
      const pageDiv = document.createElement('div');
      pageDiv.className = 'page pdf-page hidden';
      pageDiv.dataset.page = i + 1;

      // 頁碼
      const pageNum = document.createElement('div');
      pageNum.className = 'page-number';
      pageNum.textContent = `第 ${i + 1} 頁`;
      pageDiv.appendChild(pageNum);

      container.appendChild(pageDiv);
      this.pages.push(pageDiv);

      // 新增縮圖導航項目
      const thumbnail = document.createElement('div');
      thumbnail.className = 'thumbnail';
      thumbnail.dataset.page = i + 1;
      thumbnail.textContent = `第 ${i + 1} 頁`;
      thumbnail.addEventListener('click', () => this.goToPage(i + 1));
      thumbnailsPanel.appendChild(thumbnail);

      // 載入 PDF
      try {
        await this.loadPDF(this.pdfFiles[i], pageDiv);
      } catch (error) {
        console.error(`Error loading PDF ${i}:`, error);
        pageDiv.innerHTML = `<p style="color: #8B4513; text-align: center;">無法載入第 ${i + 1} 頁</p>`;
      }
    }

    // 設定封面為活動頁
    document.querySelector('.cover-page').classList.add('active');
  }

  async loadPDF(url, container) {
    try {
      const loadingTask = pdfjsLib.getDocument(url);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 取得容器實際尺寸
      const containerWidth = Math.min(window.innerWidth * 0.92, 1350);
      const containerHeight = Math.min(window.innerHeight * 0.75, 720);
      const viewport = page.getViewport({ scale: 1 });

      // 計算適合容器的縮放比例，保持比例填滿
      const scaleX = containerWidth / viewport.width;
      const scaleY = containerHeight / viewport.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledViewport = page.getViewport({ scale });
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;

      await page.render({
        canvasContext: context,
        viewport: scaledViewport
      }).promise;

      // 保留頁碼，只插入 canvas
      const pageNum = container.querySelector('.page-number');
      container.innerHTML = '';
      container.appendChild(canvas);
      if (pageNum) container.appendChild(pageNum);

    } catch (error) {
      throw error;
    }
  }

  setupNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    prevBtn.addEventListener('click', () => this.prevPage());
    nextBtn.addEventListener('click', () => this.nextPage());

    this.updateNavigation();
  }

  setupMusicControl() {
    const music = document.getElementById('bg-music');
    const toggle = document.getElementById('music-toggle');
    const iconOn = document.getElementById('music-on');
    const iconOff = document.getElementById('music-off');

    // 設定音量
    music.volume = 0.3;

    toggle.addEventListener('click', () => {
      if (this.musicPlaying) {
        music.pause();
        iconOn.style.display = 'block';
        iconOff.style.display = 'none';
        toggle.classList.remove('playing');
      } else {
        music.play().catch(e => console.log('音樂播放需要用戶互動'));
        iconOn.style.display = 'none';
        iconOff.style.display = 'block';
        toggle.classList.add('playing');
      }
      this.musicPlaying = !this.musicPlaying;
    });
  }

  setupThumbnails() {
    const toggleBtn = document.getElementById('toggle-thumbnails');
    const panel = document.getElementById('thumbnails-panel');

    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('show');
    });

    // 點擊封面縮圖
    const coverThumbnail = panel.querySelector('[data-page="0"]');
    coverThumbnail.addEventListener('click', () => this.goToPage(0));

    // 點擊外部關閉
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#thumbnail-nav')) {
        panel.classList.remove('show');
      }
    });
  }

  setupKeyboardNav() {
    document.addEventListener('keydown', (e) => {
      if (this.isLoading) return;

      switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          this.prevPage();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          this.nextPage();
          break;
        case 'Home':
          this.goToPage(0);
          break;
        case 'End':
          this.goToPage(this.totalPages - 1);
          break;
      }
    });
  }

  setupTouchNav() {
    let touchStartX = 0;
    let touchEndX = 0;

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      this.handleSwipe();
    }, { passive: true });

    const handleSwipe = () => {
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      }
    };
    this.handleSwipe = handleSwipe;
  }

  goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.totalPages || pageIndex === this.currentPage) return;

    const direction = pageIndex > this.currentPage ? 'next' : 'prev';
    const currentPageEl = this.getPageElement(this.currentPage);
    const targetPageEl = this.getPageElement(pageIndex);

    // 移除所有頁面的活動狀態
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'flip-in', 'flip-out');
      p.classList.add('hidden');
    });

    // 動畫效果
    if (direction === 'next') {
      currentPageEl.classList.remove('hidden');
      currentPageEl.classList.add('flip-out');
      setTimeout(() => {
        currentPageEl.classList.add('hidden');
        currentPageEl.classList.remove('flip-out');
      }, 600);
    } else {
      currentPageEl.classList.remove('hidden');
      currentPageEl.classList.add('prev');
      setTimeout(() => {
        currentPageEl.classList.add('hidden');
        currentPageEl.classList.remove('prev');
      }, 600);
    }

    targetPageEl.classList.remove('hidden');
    targetPageEl.classList.add('flip-in', 'active');
    setTimeout(() => {
      targetPageEl.classList.remove('flip-in');
    }, 600);

    this.currentPage = pageIndex;
    this.updateNavigation();
    this.updateThumbnails();
  }

  getPageElement(index) {
    if (index === 0) {
      return document.querySelector('.cover-page');
    }
    return this.pages[index - 1];
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  updateNavigation() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const currentPageEl = document.getElementById('current-page');
    const totalPagesEl = document.getElementById('total-pages');

    prevBtn.disabled = this.currentPage === 0;
    nextBtn.disabled = this.currentPage === this.totalPages - 1;

    currentPageEl.textContent = this.currentPage === 0 ? '封面' : `第 ${this.currentPage} 頁`;
    totalPagesEl.textContent = this.totalPages - 1;
  }

  updateThumbnails() {
    document.querySelectorAll('.thumbnail').forEach(t => {
      t.classList.remove('active');
      if (parseInt(t.dataset.page) === this.currentPage) {
        t.classList.add('active');
      }
    });
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new FamilyTreeEbook();
});
