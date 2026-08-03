(() => {
  "use strict";

  class InvitationApp {
    constructor(config) {
      this._config = config;
      this._toastTimer = 0;
    }

    initialize() {
      this._applyContent();
      this._initializeCountdown();
      this._initializeGallery();
      this._initializeAccounts();
      this._initializeShare();
      this._initializeReveal();
    }

    _queryAll(selector) {
      return document.querySelectorAll(selector);
    }

    _setText(selector, value) {
      this._queryAll(selector).forEach((element) => {
        element.textContent = value ?? "";
      });
    }

    _formatDate(value) {
      const date = new Date(`${value}T00:00:00`);
      if (Number.isNaN(date.getTime())) return value;

      return new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
      }).format(date);
    }

    _applyContent() {
      const { site, baby, place, parents, accounts, gallery, footerText } = this._config;

      document.title = site.title;
      this._setText("[data-baby-name]", baby.name);
      this._setText("[data-baby-english]", baby.englishName);
      this._setText("[data-event-date-text]", this._formatDate(baby.eventDate));
      this._setText("[data-event-time]", baby.eventTime);
      this._setText("[data-place-name]", place.name);
      this._setText("[data-address]", place.address);
      this._setText("[data-place-detail]", place.detail);
      this._setText("[data-message]", baby.message);
      this._setText("[data-footer-text]", footerText);

      const mainImage = document.querySelector("[data-main-image]");
      if (mainImage) mainImage.src = baby.mainImage;

      const kakaoMap = document.querySelector("[data-kakao-map]");
      const naverMap = document.querySelector("[data-naver-map]");
      if (kakaoMap) kakaoMap.href = place.kakaoMapUrl;
      if (naverMap) naverMap.href = place.naverMapUrl;

      this._renderParents(parents);
      this._renderContacts(parents);
      this._renderAccounts(accounts);
      this._renderGallery(gallery);
    }

    _renderParents(parents) {
      const container = document.querySelector("[data-parents]");
      if (!container) return;

      container.replaceChildren(...parents.map((parent) => {
        const item = document.createElement("div");
        item.innerHTML = `<span>${this._escape(parent.role)}</span><strong>${this._escape(parent.name)}</strong>`;
        return item;
      }));
    }

    _renderContacts(parents) {
      const container = document.querySelector("[data-contacts]");
      if (!container) return;

      container.replaceChildren(...parents.map((parent) => {
        const phone = parent.phone.replace(/[^0-9+]/g, "");
        const item = document.createElement("div");
        item.className = "contact-card";
        item.innerHTML = `
          <div><span>${this._escape(parent.role)}</span><strong>${this._escape(parent.name)}</strong></div>
          <div><a href="tel:${phone}">전화</a><a href="sms:${phone}">문자</a></div>`;
        return item;
      }));
    }

    _renderAccounts(accounts) {
      const container = document.querySelector("[data-accounts]");
      if (!container) return;

      container.replaceChildren(...accounts.map((account) => {
        const item = document.createElement("article");
        item.className = "account-card";
        item.innerHTML = `
          <button type="button" class="account-toggle" aria-expanded="false">
            <span>${this._escape(account.label)}</span><strong>계좌번호 보기</strong>
          </button>
          <div class="account-detail" hidden>
            <p>${this._escape(account.bank)} ${this._escape(account.number)}</p>
            <span>예금주 ${this._escape(account.holder)}</span>
            <button type="button" class="copy-button">계좌번호 복사</button>
          </div>`;

        item.querySelector(".copy-button")?.addEventListener("click", async () => {
          const copied = await this._copyText(account.number);
          this._showToast(copied ? "계좌번호를 복사했습니다." : "복사하지 못했습니다.");
        });
        return item;
      }));
    }

    _renderGallery(images) {
      const container = document.querySelector("[data-gallery]");
      if (!container) return;

      container.replaceChildren(...images.map((image, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gallery-item";
        button.setAttribute("aria-label", `사진 ${index + 1} 크게 보기`);
        button.innerHTML = `<img src="${this._escape(image)}" alt="갤러리 사진 ${index + 1}" loading="lazy">`;
        button.addEventListener("click", () => this._openLightbox(image));
        return button;
      }));
    }

    _initializeCountdown() {
      const target = new Date(`${this._config.baby.eventDate}T00:00:00`);
      const update = () => {
        const difference = target.getTime() - Date.now();
        const values = difference <= 0
          ? { days: 0, hours: 0, minutes: 0, seconds: 0 }
          : {
              days: Math.floor(difference / 86400000),
              hours: Math.floor((difference % 86400000) / 3600000),
              minutes: Math.floor((difference % 3600000) / 60000),
              seconds: Math.floor((difference % 60000) / 1000)
            };

        Object.entries(values).forEach(([key, value]) => {
          const element = document.querySelector(`[data-${key}]`);
          if (element) element.textContent = String(value).padStart(2, "0");
        });

        this._setText("[data-countdown-message]",
          difference <= 0 ? "오늘은 소중한 첫돌입니다." : `${this._config.baby.name}의 첫돌을 기다리고 있습니다.`);
      };

      update();
      window.setInterval(update, 1000);
    }

    _initializeGallery() {
      const dialog = document.querySelector("[data-lightbox]");
      document.querySelector("[data-lightbox-close]")?.addEventListener("click", () => dialog?.close());
      dialog?.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    }

    _openLightbox(imageUrl) {
      const dialog = document.querySelector("[data-lightbox]");
      const image = document.querySelector("[data-lightbox-image]");
      if (!dialog || !image) return;

      image.src = imageUrl;
      if (typeof dialog.showModal === "function") dialog.showModal();
    }

    _initializeAccounts() {
      document.querySelectorAll(".account-toggle").forEach((button) => {
        button.addEventListener("click", () => {
          const detail = button.nextElementSibling;
          const expanded = button.getAttribute("aria-expanded") === "true";
          button.setAttribute("aria-expanded", String(!expanded));
          if (detail) detail.hidden = expanded;

          const label = button.querySelector("strong");
          if (label) label.textContent = expanded ? "계좌번호 보기" : "계좌번호 닫기";
        });
      });
    }

    _initializeShare() {
      document.querySelector("[data-share]")?.addEventListener("click", async () => {
        const data = {
          title: this._config.site.title,
          text: this._config.site.description,
          url: this._getShareUrl()
        };

        try {
          if (navigator.share) {
            await navigator.share(data);
          } else {
            const copied = await this._copyText(data.url);
            this._showToast(copied ? "초대장 링크를 복사했습니다." : "공유하지 못했습니다.");
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            this._showToast("공유하지 못했습니다.");
          }
        }
      });

      document.querySelector("[data-copy-link]")?.addEventListener("click", async () => {
        const copied = await this._copyText(this._getShareUrl());
        this._showToast(copied ? "초대장 링크를 복사했습니다." : "복사하지 못했습니다.");
      });
    }

    _initializeReveal() {
      const elements = document.querySelectorAll(".reveal");
      if (!("IntersectionObserver" in window)) {
        elements.forEach((element) => element.classList.add("visible"));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.12 });

      elements.forEach((element) => observer.observe(element));
    }

    _getShareUrl() {
      return this._config.site.shareUrl || window.location.href;
    }

    async _copyText(value) {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(value);
          return true;
        }

        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand("copy");
        textarea.remove();
        return result;
      } catch (error) {
        console.error(error);
        return false;
      }
    }

    _showToast(message) {
      const toast = document.querySelector("[data-toast]");
      if (!toast) return;

      toast.textContent = message;
      toast.classList.add("visible");
      window.clearTimeout(this._toastTimer);
      this._toastTimer = window.setTimeout(() => toast.classList.remove("visible"), 2200);
    }

    _escape(value) {
      const element = document.createElement("div");
      element.textContent = String(value ?? "");
      return element.innerHTML;
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const app = new InvitationApp(window.INVITATION_CONFIG);
    app.initialize();
  });
})();
