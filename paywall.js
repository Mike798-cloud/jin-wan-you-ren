/**
 * 《今晚有人进过我家》自愿支持系统
 * 参考《松涛粮站》的纯前端 localStorage / sessionStorage / Cookie 流程。
 * 支持与剧情、提示、结局、存档完全独立。
 */
const Paywall = {
  STORAGE_KEY: '_jinwan_youren_support',
  SESSION_KEY: '_jinwan_youren_support_session',
  COOKIE_KEY: '_jinwan_youren_support_flag',
  AUTO_KEY: '_jinwan_youren_support_invited_v1',
  _autoTimer: null,
  _autoAttempts: 0,
  config: {
    qrCode: 'paycode.png',
    price: '1元',
    title: '支持《今晚有人进过我家》',
    studio: 'abc studio'
  },

  _storageGet(storage, key) {
    try { return storage.getItem(key); } catch (e) { return null; }
  },
  _storageSet(storage, key, value) {
    try { storage.setItem(key, value); return true; } catch (e) { return false; }
  },
  hasPaid() {
    const ls = this._storageGet(localStorage, this.STORAGE_KEY);
    const ss = this._storageGet(sessionStorage, this.SESSION_KEY);
    const cookie = this._getCookie(this.COOKIE_KEY);
    return !!(ls || ss || cookie);
  },
  wasAutoInvited() {
    return !!this._storageGet(localStorage, this.AUTO_KEY);
  },
  markAutoInvited() {
    this._storageSet(localStorage, this.AUTO_KEY, String(Date.now()));
  },
  markPaid() {
    const token = this._generateToken();
    this._storageSet(localStorage, this.STORAGE_KEY, token);
    this._storageSet(sessionStorage, this.SESSION_KEY, token);
    this._setCookie(this.COOKIE_KEY, token, 365);
    this.markAutoInvited();
    this.updateButton();
  },
  _generateToken() {
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    try { return btoa(`${ts}_${rand}_jinwan_youren`); }
    catch (e) { return `${ts}_${rand}_jinwan_youren`; }
  },
  _setCookie(name, value, days) {
    try {
      const d = new Date();
      d.setTime(d.getTime() + days * 86400000);
      document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    } catch (e) {}
  },
  _getCookie(name) {
    try {
      const prefix = name + '=';
      for (const raw of (document.cookie || '').split(';')) {
        const c = raw.trim();
        if (c.indexOf(prefix) === 0) return c.slice(prefix.length);
      }
    } catch (e) {}
    return '';
  },

  show(options = {}) {
    if (this.hasPaid() && !options.force) {
      this._showThanks('这份支持已经记录过了。谢谢你还愿意再点进来。');
      return;
    }
    let overlay = document.getElementById('paywall-overlay');
    if (!overlay) {
      this._createOverlay();
      overlay = document.getElementById('paywall-overlay');
    }
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.classList.remove('paywall-closing');
    overlay.classList.remove('paywall-show');
    void overlay.offsetWidth;
    overlay.classList.add('paywall-show');
    const close = overlay.querySelector('.paywall-close');
    if (close) setTimeout(() => close.focus(), 80);
  },
  manualShow() {
    if (this.hasPaid()) {
      this._showThanks('已记录你的支持。谢谢你让这部小作品继续往下做。');
      return;
    }
    this.show({force:true});
  },
  hide() {
    const overlay = document.getElementById('paywall-overlay');
    if (!overlay || overlay.style.display === 'none') return;
    overlay.classList.add('paywall-closing');
    overlay.classList.remove('paywall-show');
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.classList.remove('paywall-closing');
    }, 260);
  },
  _onSupport() {
    this.markPaid();
    this.hide();
    this._showThanks('感谢你的支持。今晚的门会关上，下一部作品还会继续。');
  },
  _showThanks(message) {
    const old = document.querySelector('.paywall-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'paywall-toast';
    toast.textContent = message || '感谢你的支持。';
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 30);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  },
  updateButton() {
    const btn = document.getElementById('supportAuthorBtn');
    if (!btn) return;
    const paid = this.hasPaid();
    btn.classList.toggle('supported', paid);
    btn.textContent = paid ? '支持：已记录' : '支持作者 1元';
    btn.setAttribute('aria-label', paid ? '支持已记录' : '支持作者 1元');
  },

  _createOverlay() {
    const cfg = this.config;
    const html = `
      <div class="paywall-overlay" id="paywall-overlay" role="dialog" aria-modal="true" aria-labelledby="paywall-title" style="display:none">
        <div class="paywall-card">
          <button class="paywall-close" type="button" aria-label="关闭支持窗口">&times;</button>
          <div class="paywall-card-inner">
            <div class="paywall-header">
              <div class="paywall-kicker">705 · 夜间附笺</div>
              <div class="paywall-title-row">
                <span class="paywall-mark">◦</span>
                <span class="paywall-title" id="paywall-title">${cfg.title}</span>
                <span class="paywall-mark">◦</span>
              </div>
              <div class="paywall-subtitle">${cfg.price} 自愿支持 · 完整游戏始终免费</div>
            </div>
            <div class="paywall-body">
              <div class="paywall-qr-wrapper">
                <img src="${cfg.qrCode}" alt="1元自愿支持收款码" class="paywall-qr-img" />
                <div class="paywall-qr-glow"></div>
              </div>
              <div class="paywall-qr-tip">使用对应支付 App 扫码即可 · 金额 1 元</div>
              <div class="paywall-message">
                <p class="paywall-msg-warm">谢谢你愿意把这个夜晚看到这里。</p>
                <p class="paywall-msg-body">
                  《今晚有人进过我家》从拖鞋、旧牙刷，到 704 和衣柜后的那条缝，都是一点点做出来的。<br>
                  如果你觉得这段调查值得，愿意留下 <strong>1元</strong> 自愿支持，会直接变成我继续做下一部网页悬疑的动力。
                </p>
                <p class="paywall-msg-cute">一块钱买不到新的门锁，但能给下一盏走廊灯多亮一会儿。</p>
                <p class="paywall-msg-warm2">不支持也完全没关系。所有剧情、三级提示、隐藏结局和二周目内容都不会因此受影响。</p>
              </div>
            </div>
            <div class="paywall-footer">
              <div class="paywall-hint"><span>记录只保存在当前浏览器。清除站点数据后，自动邀请可能会再次出现。</span></div>
              <div class="paywall-btns">
                <button class="paywall-btn paywall-btn-support" type="button">已完成支持 ♡</button>
                <button class="paywall-btn paywall-btn-later" type="button">下次再说</button>
              </div>
            </div>
            <div class="paywall-studio">${cfg.studio}</div>
          </div>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
    const overlay = document.getElementById('paywall-overlay');
    overlay.querySelector('.paywall-close').addEventListener('click', () => this.hide());
    overlay.querySelector('.paywall-btn-later').addEventListener('click', () => this.hide());
    overlay.querySelector('.paywall-btn-support').addEventListener('click', () => this._onSupport());
    overlay.addEventListener('click', e => { if (e.target === overlay) this.hide(); });
  },

  scheduleAutoInvite() {
    if (this.hasPaid() || this.wasAutoInvited()) return;
    clearTimeout(this._autoTimer);
    this._autoAttempts = 0;
    const probe = () => {
      if (this.hasPaid() || this.wasAutoInvited()) return;
      const game = document.getElementById('game');
      const modal = document.getElementById('modal');
      const inGame = !!game && !game.classList.contains('hidden');
      const storyModalOpen = !!modal && !modal.classList.contains('hidden');
      if (inGame && !storyModalOpen) {
        this.markAutoInvited();
        this.show({force:true});
        return;
      }
      this._autoAttempts += 1;
      if (this._autoAttempts < 600) this._autoTimer = setTimeout(probe, 350);
    };
    this._autoTimer = setTimeout(probe, 650);
  },

  init() {
    this.updateButton();
    const manual = document.getElementById('supportAuthorBtn');
    if (manual) manual.addEventListener('click', () => this.manualShow());
    ['startBtn','continueBtn','reviewBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.scheduleAutoInvite());
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const overlay = document.getElementById('paywall-overlay');
      if (overlay && overlay.style.display !== 'none') this.hide();
    });
  }
};
window.Paywall = Paywall;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Paywall.init(), {once:true});
else Paywall.init();
