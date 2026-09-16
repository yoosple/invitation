(() => {
  "use strict";

  class InvitationApp {
    constructor(config) {
      this._config = config;
      this._toastTimer = 0;
  
      /* Gallery */
      this._galleryIndex = 0;
  
      /* Swipe */
      this._touchStartX = 0;
      this._touchEndX = 0;
  
      /* Face Detector */
      this._faceDetector = null;
      this._faceDetectorPromise = null;
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

    const container =
        document.querySelector("[data-gallery]");

    if (!container || !Array.isArray(images)) {
        return;
    }

    const items = images.map((imageUrl, index) => {

        const button =
            document.createElement("button");

        button.type = "button";
        button.className = "gallery-item";

        button.setAttribute(
            "aria-label",
            `사진 ${index + 1} 크게 보기`
        );


        const image =
            document.createElement("img");

        image.src = imageUrl;
        image.alt = `갤러리 사진 ${index + 1}`;
        image.loading = "lazy";

        /*
         * 얼굴 감지 전에는 중앙.
         */
        image.style.objectPosition = "50% 50%";


        /*
         * 이미지 로딩 완료 후
         * 얼굴 위치 자동 계산
         */
        image.addEventListener(
            "load",
            () => {
                this._applyFaceFocus(image);
            },
            { once: true }
        );


        button.appendChild(image);


        /*
         * 확대
         */
        button.addEventListener("click", () => {

            this._openLightbox(index);

        });


        return button;
    });


    container.replaceChildren(...items);
}
    async _initializeFaceDetector() {

    /*
     * 이미 생성되어 있으면 그대로 사용
     */
    if (this._faceDetector) {
        return this._faceDetector;
    }


    /*
     * 동시에 여러 이미지가 요청하더라도
     * detector는 한 번만 생성
     */
    if (this._faceDetectorPromise) {
        return this._faceDetectorPromise;
    }


    this._faceDetectorPromise = (async () => {

        try {

            /*
             * MediaPipe module이 로딩될 때까지 대기
             */
            await this._waitForMediaPipe();


            const {
                FaceDetector,
                FilesetResolver
            } = window.MediaPipeVision;


            /*
             * WASM 로딩
             */
            const vision =
                await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );


            /*
             * 얼굴 감지 모델 생성
             */
            this._faceDetector =
                await FaceDetector.createFromOptions(
                    vision,
                    {
                        baseOptions: {
                            modelAssetPath:
                                "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite"
                        },

                        runningMode: "IMAGE",

                        /*
                         * 너무 낮으면 잘못된 얼굴을 잡을 수 있음
                         */
                        minDetectionConfidence: 0.5
                    }
                );


            return this._faceDetector;

        } catch (error) {

            console.warn(
                "얼굴 감지 초기화 실패:",
                error
            );

            return null;
        }

    })();


    return this._faceDetectorPromise;
}

    async _waitForMediaPipe() {

    if (window.MediaPipeVision) {
        return;
    }


    await new Promise((resolve) => {

        const timeout =
            window.setTimeout(() => {

                resolve();

            }, 5000);


        window.addEventListener(
            "mediapipe-ready",
            () => {

                window.clearTimeout(timeout);

                resolve();

            },
            { once: true }
        );

    });


    if (!window.MediaPipeVision) {

        throw new Error(
            "MediaPipe 라이브러리를 불러오지 못했습니다."
        );

    }
}

    async _applyFaceFocus(image) {

    try {

        const detector =
            await this._initializeFaceDetector();


        /*
         * MediaPipe 실패 시 중앙
         */
        if (!detector) {

            image.style.objectPosition =
                "50% 50%";

            return;
        }


        /*
         * 이미지가 정상적으로 로딩되지 않은 경우
         */
        if (
            image.naturalWidth <= 0 ||
            image.naturalHeight <= 0
        ) {

            return;
        }


        const result =
            detector.detect(image);


        const detections =
            result?.detections ?? [];


        /*
         * 얼굴 없음
         */
        if (detections.length === 0) {

            image.style.objectPosition =
                "50% 50%";

            return;
        }


        const focus =
            this._calculateFaceFocus(
                detections,
                image.naturalWidth,
                image.naturalHeight
            );


        image.style.objectPosition =
            `${focus.x}% ${focus.y}%`;


    } catch (error) {

        console.warn(
            "얼굴 위치 계산 실패:",
            error
        );


        /*
         * 오류 발생해도 갤러리는 정상 표시
         */
        image.style.objectPosition =
            "50% 50%";
    }
}
        _calculateFaceFocus(detections, imageWidth, imageHeight) {
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        detections.forEach((detection) => {
            const box = detection.boundingBox;

            if (!box) {
                return;
            }

            const left = box.originX;
            const top = box.originY;
            const right = left + box.width;
            const bottom = top + box.height;

            minX = Math.min(minX, left);
            minY = Math.min(minY, top);
            maxX = Math.max(maxX, right);
            maxY = Math.max(maxY, bottom);
        });

        if (
            !Number.isFinite(minX) ||
            !Number.isFinite(minY) ||
            !Number.isFinite(maxX) ||
            !Number.isFinite(maxY)
        ) {
            return {
                x: 50,
                y: 50
            };
        }

        // 여러 얼굴이 있으면 얼굴 전체 영역의 중앙
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // 얼굴만 가운데 오지 않고 상체도 조금 보이도록
        const faceGroupHeight = maxY - minY;
        const adjustedY = centerY + (faceGroupHeight * 0.2);

        let x = (centerX / imageWidth) * 100;
        let y = (adjustedY / imageHeight) * 100;

        x = this._clamp(x, 10, 90);
        y = this._clamp(y, 10, 90);

        return {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10
        };
    }

    _clamp(value, min, max) {
        return Math.min(
            Math.max(value, min),
            max
        );
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

        if (!dialog) {
            return;
        }

        const closeButton =
            document.querySelector("[data-lightbox-close]");

        const previousButton =
            document.querySelector("[data-lightbox-prev]");

        const nextButton =
            document.querySelector("[data-lightbox-next]");

        // 닫기
        closeButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            this._closeLightbox();
        });

        // 이전
        previousButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            this._showPreviousGalleryImage();
        });

        // 다음
        nextButton?.addEventListener("click", (event) => {
            event.stopPropagation();
            this._showNextGalleryImage();
        });

        // 검은 배경 클릭하면 닫기
        dialog.addEventListener("click", (event) => {
            if (event.target === dialog) {
                this._closeLightbox();
            }
        });

        // 키보드
        document.addEventListener("keydown", (event) => {
            if (!dialog.open) {
                return;
            }

            if (event.key === "ArrowLeft") {
                this._showPreviousGalleryImage();
            }

            if (event.key === "ArrowRight") {
                this._showNextGalleryImage();
            }

            if (event.key === "Escape") {
                this._closeLightbox();
            }
        });

        // 모바일 Swipe 시작
        dialog.addEventListener(
            "touchstart",
            (event) => {
                const touch = event.changedTouches?.[0];

                if (!touch) {
                    return;
                }

                this._touchStartX = touch.clientX;
            },
            { passive: true }
        );

        // 모바일 Swipe 종료
        dialog.addEventListener(
            "touchend",
            (event) => {
                const touch = event.changedTouches?.[0];

                if (!touch) {
                    return;
                }

                this._touchEndX = touch.clientX;

                const difference =
                    this._touchEndX - this._touchStartX;

                // 50px 미만 움직임은 무시
                if (Math.abs(difference) < 50) {
                    return;
                }

                // 오른쪽으로 밀기 → 이전
                if (difference > 0) {
                    this._showPreviousGalleryImage();
                }
                // 왼쪽으로 밀기 → 다음
                else {
                    this._showNextGalleryImage();
                }
            },
            { passive: true }
        );
    }

    _openLightbox(index) {
        const dialog =
            document.querySelector("[data-lightbox]");

        if (!dialog) {
            return;
        }

        this._galleryIndex = index;

        this._updateLightboxImage();

        if (
            typeof dialog.showModal === "function" &&
            !dialog.open
        ) {
            dialog.showModal();
        }
    }

    _updateLightboxImage() {
        const image =
            document.querySelector("[data-lightbox-image]");

        const gallery =
            this._config.gallery;

        if (
            !image ||
            !Array.isArray(gallery) ||
            gallery.length === 0
        ) {
            return;
        }

        image.src = gallery[this._galleryIndex];
        image.alt = `확대 사진 ${this._galleryIndex + 1}`;
    }

    _closeLightbox() {
        const dialog =
            document.querySelector("[data-lightbox]");

        if (dialog?.open) {
            dialog.close();
        }
    }

    _showPreviousGalleryImage() {
        const gallery =
            this._config.gallery;

        if (
            !Array.isArray(gallery) ||
            gallery.length === 0
        ) {
            return;
        }

        this._galleryIndex--;

        // 첫 번째에서 이전을 누르면 마지막으로
        if (this._galleryIndex < 0) {
            this._galleryIndex = gallery.length - 1;
        }

        this._updateLightboxImage();
    }

    _showNextGalleryImage() {
        const gallery =
            this._config.gallery;

        if (
            !Array.isArray(gallery) ||
            gallery.length === 0
        ) {
            return;
        }

        this._galleryIndex++;

        // 마지막에서 다음을 누르면 첫 번째로
        if (this._galleryIndex >= gallery.length) {
            this._galleryIndex = 0;
        }

        this._updateLightboxImage();
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
