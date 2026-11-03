(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const body = document.body;
  const header = $(".site-header");
  const progressBar = $(".scroll-progress span");

  const currentYear = $("#year");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());

  /* ---------- Header + scroll progress ---------- */

  let scrollTicking = false;

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);

    if (progressBar) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = max > 0 ? `${Math.min((y / max) * 100, 100)}%` : "0%";
    }

    if (y < 220) {
      $$(".nav__link").forEach((link) => link.classList.remove("is-active"));
    }

    scrollTicking = false;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(onScroll);
      }
    },
    { passive: true }
  );

  onScroll();

  /* ---------- Mobile menu ---------- */

  const mobileMenu = $("#mobileMenu");
  const menuToggle = $(".menu-toggle");
  const menuClose = $("[data-menu-close]");
  let lastFocused = null;

  function openMenu() {
    lastFocused = document.activeElement;
    body.classList.add("menu-open");
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fermer le menu");
    window.setTimeout(() => menuClose.focus(), 90);
  }

  function closeMenu() {
    body.classList.remove("menu-open");
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Ouvrir le menu");
    if (lastFocused) lastFocused.focus();
  }

  if (mobileMenu && menuToggle && menuClose) {
    menuToggle.addEventListener("click", () => {
      if (mobileMenu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    menuClose.addEventListener("click", closeMenu);

    $$("a", mobileMenu).forEach((link) => link.addEventListener("click", closeMenu));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && mobileMenu.classList.contains("is-open")) {
        closeMenu();
      }
    });

    mobileMenu.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusable = $$("a, button", mobileMenu).filter((el) => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */

  const revealEls = $$(".reveal");

  function revealVisible() {
    revealEls.forEach((el) => {
      if (el.classList.contains("is-visible")) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) {
        el.classList.add("is-visible");
      }
    });
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -3% 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));

    let revealTicking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (revealTicking) return;
        revealTicking = true;
        window.requestAnimationFrame(() => {
          revealVisible();
          revealTicking = false;
        });
      },
      { passive: true }
    );

    window.setTimeout(revealVisible, 500);
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Active navigation ---------- */

  const navLinks = $$(".nav__link");
  const navTargets = new Map(
    navLinks.map((link) => [link.getAttribute("href").replace("#", ""), link])
  );

  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => link.classList.remove("is-active"));
          const link = navTargets.get(entry.target.id);
          if (link) link.classList.add("is-active");
        });
      },
      { rootMargin: "-35% 0px -55% 0px" }
    );

    $$("main section[id]").forEach((section) => sectionObserver.observe(section));
  }

  /* ---------- Menu tabs ---------- */

  const menuTabs = $$(".menu-tab");
  const menuPanels = $$(".menu-panel");

  function activateMenu(panelName, updateHash = true) {
    const selected = menuTabs.find((tab) => tab.dataset.panel === panelName) || menuTabs[0];
    if (!selected) return;

    const panelId = `panel-${selected.dataset.panel}`;

    menuTabs.forEach((tab) => {
      const active = tab === selected;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });

    menuPanels.forEach((panel) => {
      panel.hidden = panel.id !== panelId;
    });

    if (updateHash) {
      history.replaceState(null, "", `#carte-${selected.dataset.panel}`);
    }
  }

  if (menuTabs.length) {
    menuTabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateMenu(tab.dataset.panel));

      tab.addEventListener("keydown", (event) => {
        let next = null;

        if (event.key === "ArrowRight") next = menuTabs[(index + 1) % menuTabs.length];
        if (event.key === "ArrowLeft") next = menuTabs[(index - 1 + menuTabs.length) % menuTabs.length];
        if (event.key === "Home") next = menuTabs[0];
        if (event.key === "End") next = menuTabs[menuTabs.length - 1];

        if (next) {
          event.preventDefault();
          next.focus();
          activateMenu(next.dataset.panel);
        }
      });
    });

    $$("[data-menu-target]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        activateMenu(link.dataset.menuTarget);
        const menuSection = $("#carte");
        if (menuSection) {
          menuSection.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      });
    });

    if (window.location.hash.startsWith("#carte-")) {
      activateMenu(window.location.hash.replace("#carte-", ""), false);
    }
  }

  /* ---------- Opening status ---------- */

  const schedule = {
    0: [],
    1: [[660, 1170]], // Lundi : 11h - 19h30
    2: [[660, 1170]], // Mardi : 11h - 19h30
    3: [[660, 870]],  // Mercredi : 11h - 14h30
    4: [[660, 1170]], // Jeudi : 11h - 19h30
    5: [[660, 1170]], // Vendredi : 11h - 19h30
    6: [],            // Samedi : fermé
  };

  const dayNames = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  function parisClock() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const value = (type) => parts.find((part) => part.type === type)?.value;
    let hour = Number.parseInt(value("hour"), 10);
    if (hour === 24) hour = 0;

    return {
      day: weekdayMap[value("weekday")] ?? new Date().getDay(),
      minutes: hour * 60 + Number.parseInt(value("minute"), 10),
    };
  }

  function formatMinutes(minutes) {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return mins ? `${hours}h${String(mins).padStart(2, "0")}` : `${hours}h`;
  }

  function isOpenAt(day, minutes) {
    const today = schedule[day] || [];
    if (today.some(([start, end]) => minutes >= start && minutes < end)) return true;

    const yesterday = (day + 6) % 7;
    const previous = schedule[yesterday] || [];
    return previous.some(([start, end]) => end > 1440 && minutes < end - 1440);
  }

  function nextOpening(day, minutes) {
    for (let offset = 0; offset < 8; offset += 1) {
      const currentDay = (day + offset) % 7;
      const intervals = (schedule[currentDay] || [])
        .filter(([start]) => !(offset === 0 && start <= minutes))
        .sort((a, b) => a[0] - b[0]);

      for (const [start] of intervals) {
        if (offset === 0) return `Fermé · ouvre à ${formatMinutes(start)}`;
        if (offset === 1) return `Fermé · ouvre demain à ${formatMinutes(start)}`;
        return `Fermé · ouvre ${dayNames[currentDay]} à ${formatMinutes(start)}`;
      }
    }

    return "Fermé";
  }

  function updateStatus() {
    const { day, minutes } = parisClock();
    const open = isOpenAt(day, minutes);
    const label = open ? "Ouvert maintenant" : nextOpening(day, minutes);

    $$("[data-open-status]").forEach((el) => {
      el.textContent = label;
      el.classList.toggle("is-open", open);
      el.classList.toggle("is-closed", !open);
    });

    $$(".status-dot").forEach((dot) => dot.classList.toggle("is-closed", !open));

    $$(".hours__list li").forEach((row) => {
      row.classList.toggle("is-today", Number(row.dataset.day) === day);
    });
  }

  updateStatus();
  window.setInterval(updateStatus, 30000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateStatus();
  });

  /* ---------- Reviews slider ---------- */

  const reviewsTrack = $("#reviewsTrack");
  const reviewsPrev = $("#reviewsPrev");
  const reviewsNext = $("#reviewsNext");

  if (reviewsTrack && reviewsPrev && reviewsNext) {
    function reviewStep() {
      const card = reviewsTrack.querySelector(".review-card");
      if (!card) return 360;
      const gap = Number.parseFloat(getComputedStyle(reviewsTrack).gap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function updateReviewArrows() {
      const max = reviewsTrack.scrollWidth - reviewsTrack.clientWidth - 2;
      reviewsPrev.disabled = reviewsTrack.scrollLeft <= 2;
      reviewsNext.disabled = reviewsTrack.scrollLeft >= max;
    }

    reviewsPrev.addEventListener("click", () => {
      reviewsTrack.scrollBy({
        left: -reviewStep(),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    reviewsNext.addEventListener("click", () => {
      reviewsTrack.scrollBy({
        left: reviewStep(),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    });

    reviewsTrack.addEventListener("scroll", () => {
      window.requestAnimationFrame(updateReviewArrows);
    }, { passive: true });

    window.addEventListener("resize", updateReviewArrows);
    updateReviewArrows();

    let isDragging = false;
    let dragStartX = 0;
    let dragStartLeft = 0;
    let hasDragged = false;

    reviewsTrack.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse") return;
      isDragging = true;
      hasDragged = false;
      dragStartX = event.clientX;
      dragStartLeft = reviewsTrack.scrollLeft;
      reviewsTrack.style.scrollSnapType = "none";
      reviewsTrack.setPointerCapture(event.pointerId);
    });

    reviewsTrack.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      const delta = event.clientX - dragStartX;
      if (Math.abs(delta) > 4) hasDragged = true;
      reviewsTrack.scrollLeft = dragStartLeft - delta;
    });

    function endDrag(event) {
      if (!isDragging) return;
      isDragging = false;
      reviewsTrack.style.scrollSnapType = "";
      if (reviewsTrack.hasPointerCapture(event.pointerId)) {
        reviewsTrack.releasePointerCapture(event.pointerId);
      }
    }

    reviewsTrack.addEventListener("pointerup", endDrag);
    reviewsTrack.addEventListener("pointercancel", endDrag);

    reviewsTrack.addEventListener("click", (event) => {
      if (hasDragged) {
        event.preventDefault();
        event.stopPropagation();
        hasDragged = false;
      }
    }, true);
  }

  /* ---------- Lightbox ---------- */

  const lightbox = $("#lightbox");
  const lightboxImage = $("#lightboxImage");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxTriggers = $$("[data-full]");

  if (lightbox && lightboxImage && lightboxCaption && lightboxTriggers.length) {
    let activeIndex = 0;

    function renderLightbox(index) {
      activeIndex = (index + lightboxTriggers.length) % lightboxTriggers.length;
      const trigger = lightboxTriggers[activeIndex];
      const sourceImage = trigger.querySelector("img");
      const caption = trigger.dataset.caption || "";

      lightboxImage.src = trigger.dataset.full;
      lightboxImage.alt = sourceImage?.alt || caption;
      lightboxCaption.textContent = caption;
    }

    function openLightbox(index) {
      renderLightbox(index);
      body.classList.add("lightbox-open");

      if (typeof lightbox.showModal === "function") {
        lightbox.showModal();
      } else {
        lightbox.setAttribute("open", "");
      }

      const closeButton = $("[data-lightbox-close]", lightbox);
      if (closeButton) closeButton.focus();
    }

    function closeLightbox() {
      body.classList.remove("lightbox-open");
      if (typeof lightbox.close === "function" && lightbox.open) {
        lightbox.close();
      } else {
        lightbox.removeAttribute("open");
      }
    }

    lightboxTriggers.forEach((trigger, index) => {
      trigger.addEventListener("click", () => openLightbox(index));
    });

    $("[data-lightbox-close]", lightbox).addEventListener("click", closeLightbox);

    $("[data-lightbox-prev]", lightbox).addEventListener("click", () => {
      renderLightbox(activeIndex - 1);
    });

    $("[data-lightbox-next]", lightbox).addEventListener("click", () => {
      renderLightbox(activeIndex + 1);
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target.classList.contains("lightbox__inner")) {
        closeLightbox();
      }
    });

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        renderLightbox(activeIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        renderLightbox(activeIndex + 1);
      }
    });

    lightbox.addEventListener("close", () => {
      body.classList.remove("lightbox-open");
      lightboxImage.removeAttribute("src");
      lightboxImage.setAttribute("alt", "");
      lightboxCaption.textContent = "";
    });
  }

  window.__bucketReady = true;
})();
