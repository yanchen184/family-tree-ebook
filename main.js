// 電子書主程式 v2 - 支援多頁 PDF
class FamilyTreeEbook {
  constructor() {
    this.currentPage = 0;
    this.totalPages = 0;
    this.pageElements = [];
    this.isLoading = true;
    this.musicPlaying = false;

    // PDF 檔案配置：[檔名, 頁數] - 移除空白的第二頁
    this.pdfConfig = [
      ['00', 1], ['01', 1], ['02', 1], ['03', 1], ['04', 1],
      ['05', 1], ['06', 1], ['07', 1], ['08', 1], ['09', 1],
      ['10', 1], ['11', 1], ['12', 1], ['13', 1], ['14', 1]
    ];

    this.init();
  }

  async init() {
    // 計算總頁數（封面 + 所有 PDF 頁面）
    this.totalPages = 1 + this.pdfConfig.reduce((sum, [_, pages]) => sum + pages, 0);

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
    }, 1500);

    console.log(`許比派下親屬譜電子書 v2.0.0 - 共 ${this.totalPages} 頁`);
  }

  async loadAllPDFs() {
    const container = document.getElementById('pages-container');
    const thumbnailsPanel = document.getElementById('thumbnails-panel');

    let pageIndex = 1; // 從 1 開始（0 是封面）

    for (const [pdfName, numPages] of this.pdfConfig) {
      const pdfUrl = `pdf/${pdfName}.pdf`;

      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        // 載入該 PDF 的所有頁面
        for (let p = 1; p <= numPages; p++) {
          const pageDiv = document.createElement('div');
          pageDiv.className = 'page pdf-page hidden';
          pageDiv.dataset.page = pageIndex;

          // 頁碼
          const pageNum = document.createElement('div');
          pageNum.className = 'page-number';
          pageNum.textContent = `第 ${pageIndex} 頁`;
          pageDiv.appendChild(pageNum);

          container.appendChild(pageDiv);
          this.pageElements.push(pageDiv);

          // 新增縮圖導航項目
          const thumbnail = document.createElement('div');
          thumbnail.className = 'thumbnail';
          thumbnail.dataset.page = pageIndex;
          thumbnail.textContent = `第 ${pageIndex} 頁`;
          const idx = pageIndex;
          thumbnail.addEventListener('click', () => this.goToPage(idx));
          thumbnailsPanel.appendChild(thumbnail);

          // 渲染 PDF 頁面
          await this.renderPDFPage(pdf, p, pageDiv);

          pageIndex++;
        }
      } catch (error) {
        console.error(`Error loading PDF ${pdfName}:`, error);
        // 建立錯誤頁面
        for (let p = 1; p <= numPages; p++) {
          const pageDiv = document.createElement('div');
          pageDiv.className = 'page pdf-page hidden';
          pageDiv.innerHTML = `<p style="color: #8B4513; text-align: center; padding: 20px;">無法載入 ${pdfName}.pdf 第 ${p} 頁</p>`;
          container.appendChild(pageDiv);
          this.pageElements.push(pageDiv);
          pageIndex++;
        }
      }
    }

    // 更新總頁數顯示
    document.getElementById('total-pages').textContent = this.totalPages - 1;

    // 設定封面為活動頁
    document.querySelector('.cover-page').classList.add('active');
  }

  async renderPDFPage(pdf, pageNum, container) {
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 取得容器實際尺寸
      const containerWidth = Math.min(window.innerWidth * 0.92, 1350);
      const containerHeight = Math.min(window.innerHeight * 0.72, 700);
      const viewport = page.getViewport({ scale: 1 });

      // 計算適合容器的縮放比例
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

      // 保留頁碼，插入 canvas
      const pageNumEl = container.querySelector('.page-number');
      container.innerHTML = '';
      container.appendChild(canvas);
      if (pageNumEl) container.appendChild(pageNumEl);

    } catch (error) {
      console.error('Render error:', error);
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

    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          this.nextPage();
        } else {
          this.prevPage();
        }
      }
    }, { passive: true });
  }

  goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.totalPages || pageIndex === this.currentPage) return;

    const currentPageEl = this.getPageElement(this.currentPage);
    const targetPageEl = this.getPageElement(pageIndex);

    // 移除所有頁面的活動狀態
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active', 'flip-in', 'flip-out', 'prev');
      p.classList.add('hidden');
    });

    // 顯示目標頁面
    targetPageEl.classList.remove('hidden');
    targetPageEl.classList.add('active');

    this.currentPage = pageIndex;
    this.updateNavigation();
    this.updateThumbnails();
  }

  getPageElement(index) {
    if (index === 0) {
      return document.querySelector('.cover-page');
    }
    return this.pageElements[index - 1];
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
