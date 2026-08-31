/* ================================================================
   AURELIA DENTAL HOUSE — script.js
   ================================================================
   Table of Contents
   1.  Utilities
   2.  Supabase Config & Client
   3.  Announcement Bar (seamless marquee)
   4.  Navbar (scroll state + mobile toggle + link close)
   5.  Scroll Reveal Animations
   6.  Stats Counter Animation
   7.  Before & After Comparison Slider
   8.  Smile Gallery Lightbox
   9.  Testimonials Slider
   10. FAQ Accordion
   11. Appointment Booking Form (live backend submission + token)
   12. Live Token Display
   13. Token Status Tracker
   14. Newsletter Form
   15. Back To Top
   16. Footer Current Year
   17. Init
   ================================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------------
     1. UTILITIES
     ---------------------------------------------------------------- */
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) =>
    Array.from(scope.querySelectorAll(selector));

  function debounce(fn, delay = 150) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  // Throttles a function to run at most once per animation frame, so it
  // stays perfectly in sync with scrolling instead of "catching up" all at
  // once when the user stops scrolling (which reads as a sudden jump/glitch).
  function rafThrottle(fn) {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
    };
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /* ----------------------------------------------------------------
     2. SUPABASE CONFIG & CLIENT
     ----------------------------------------------------------------
     Public site uses ONLY the Supabase project URL + anon/publishable
     key — never the service_role key. Every call below goes through
     the two narrow, validated RPC functions approved for public use
     (create_public_appointment, get_appointment_status). The public
     site never queries the `appointments` table directly, and has no
     Google Apps Script / Google Sheets dependency from here on.
     ---------------------------------------------------------------- */
  const SUPABASE_URL = "https://xpffspawsuihjoetvvon.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_c7GcZSkIpCa5dfw_eexoEw_uE31bPsY";

  function isSupabaseConfigured() {
    return (
      typeof SUPABASE_URL === "string" &&
      SUPABASE_URL.startsWith("http") &&
      !SUPABASE_URL.includes("PASTE_") &&
      typeof SUPABASE_ANON_KEY === "string" &&
      SUPABASE_ANON_KEY.length > 20 &&
      !SUPABASE_ANON_KEY.includes("PASTE_") &&
      typeof window.supabase !== "undefined"
    );
  }

  // Created lazily so a missing/placeholder config (or the CDN script
  // failing to load) never throws before isSupabaseConfigured() has a
  // chance to show a clear message instead of a broken page.
  let _sb = null;
  function sb() {
    if (!_sb) _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return _sb;
  }

  /* ----------------------------------------------------------------
     3. ANNOUNCEMENT BAR — seamless looping marquee
     ---------------------------------------------------------------- */
  function initAnnouncementBar() {
    const track = $(".announcement-bar__track");
    if (!track) return;
    // Duplicate the content once so the CSS translateX(-50%) loop is seamless
    track.innerHTML += track.innerHTML;
  }

  /* ----------------------------------------------------------------
     4. NAVBAR — scroll shadow state + mobile menu toggle
     ---------------------------------------------------------------- */
  function initNavbar() {
    const header = $("#site-header");
    const toggle = $("#navbar-toggle");
    const links = $("#navbar-links");
    if (!header) return;

    const onScroll = rafThrottle(() => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (toggle && links) {
      toggle.addEventListener("click", () => {
        const isOpen = toggle.getAttribute("aria-expanded") === "true";
        toggle.setAttribute("aria-expanded", String(!isOpen));
        links.classList.toggle("is-open", !isOpen);
      });

      // Close mobile menu when a link is clicked
      $$("a", links).forEach((link) => {
        link.addEventListener("click", () => {
          toggle.setAttribute("aria-expanded", "false");
          links.classList.remove("is-open");
        });
      });

      // Close on Escape
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && links.classList.contains("is-open")) {
          toggle.setAttribute("aria-expanded", "false");
          links.classList.remove("is-open");
          toggle.focus();
        }
      });
    }
  }

  /* ----------------------------------------------------------------
     5. SCROLL REVEAL ANIMATIONS
     ---------------------------------------------------------------- */
  function initScrollReveal() {
    // Mark elements to reveal
    const revealTargets = $$(
      ".service-card, .why-us__item, .timeline__step, .stat-card, " +
        ".gallery__item, .doctor__media, .doctor__content > *, " +
        ".section-heading, .ba-slider"
    );
    revealTargets.forEach((el) => el.setAttribute("data-reveal", ""));

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealTargets.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      // A generous negative-free bottom margin means elements start
      // revealing well before they reach the bottom of the viewport, so
      // they ease in gradually while you scroll instead of all firing at
      // once the moment you stop.
      { threshold: 0, rootMargin: "0px 0px 15% 0px" }
    );

    revealTargets.forEach((el) => observer.observe(el));

    // Safety net: some embedded WebViews (e.g. in-app code-editor previews)
    // throttle or misfire IntersectionObserver callbacks when the view loses
    // focus. If anything is still hidden after 2.5s, reveal it directly so
    // content can never get stuck invisible.
    setTimeout(() => {
      revealTargets.forEach((el) => {
        if (!el.classList.contains("is-visible")) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      });
    }, 2500);
  }

  /* ----------------------------------------------------------------
     6. STATS COUNTER ANIMATION
     ---------------------------------------------------------------- */
  function initStatsCounter() {
    const counters = $$("[data-count-to]");
    if (!counters.length) return;

    function animateCounter(el) {
      const target = parseInt(el.getAttribute("data-count-to"), 10) || 0;
      const suffix = el.getAttribute("data-suffix") || "";

      if (prefersReducedMotion) {
        el.textContent = target.toLocaleString() + suffix;
        return;
      }

      const duration = 1800;
      const start = performance.now();

      function tick(now) {
        const progress = clamp((now - start) / duration, 0, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        el.textContent = value.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => observer.observe(el));
  }

  /* ----------------------------------------------------------------
     7. BEFORE & AFTER COMPARISON SLIDER
     ---------------------------------------------------------------- */
  function initBeforeAfterSlider() {
    const slider = $("[data-ba-slider]");
    if (!slider) return;

    const input = $("[data-ba-input]", slider);
    const afterWrap = $("[data-ba-after]", slider);
    const handle = $("[data-ba-handle]", slider);

    function setPosition(percent) {
      const clamped = clamp(percent, 0, 100);
      afterWrap.style.clipPath = `inset(0 ${100 - clamped}% 0 0)`;
      handle.style.left = clamped + "%";
      input.value = clamped;
    }

    // Range input drives it (covers keyboard, mouse drag, and touch natively)
    input.addEventListener("input", () => setPosition(Number(input.value)));

    // Also allow dragging directly on the slider area for a more natural feel
    let isDragging = false;

    function percentFromClientX(clientX) {
      const rect = slider.getBoundingClientRect();
      const x = clamp(clientX - rect.left, 0, rect.width);
      return (x / rect.width) * 100;
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(percentFromClientX(clientX));
    }

    function startDrag(e) {
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      setPosition(percentFromClientX(clientX));
    }

    function endDrag() {
      isDragging = false;
    }

    slider.addEventListener("mousedown", startDrag);
    slider.addEventListener("touchstart", startDrag, { passive: true });
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove, { passive: true });
    window.addEventListener("mouseup", endDrag);
    window.addEventListener("touchend", endDrag);

    setPosition(50);
  }

  /* ----------------------------------------------------------------
     8. SMILE GALLERY LIGHTBOX
     ---------------------------------------------------------------- */
  function initGalleryLightbox() {
    const triggers = $$("[data-gallery-trigger]");
    const lightbox = $("#lightbox");
    const lightboxImage = $("#lightbox-image");
    const closeBtn = $("#lightbox-close");
    if (!triggers.length || !lightbox || !lightboxImage) return;

    let lastFocusedElement = null;

    function openLightbox(trigger) {
      const fullSrc = trigger.getAttribute("data-full");
      const imgAlt = $("img", trigger)?.getAttribute("alt") || "Smile gallery image";
      lightboxImage.src = fullSrc;
      lightboxImage.alt = imgAlt;
      lightbox.hidden = false;
      lastFocusedElement = document.activeElement;
      closeBtn.focus();
      document.body.style.overflow = "hidden";
    }

    function closeLightbox() {
      lightbox.hidden = true;
      lightboxImage.src = "";
      document.body.style.overflow = "";
      if (lastFocusedElement) lastFocusedElement.focus();
    }

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => openLightbox(trigger));
    });

    closeBtn.addEventListener("click", closeLightbox);

    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  /* ----------------------------------------------------------------
     9. TESTIMONIALS SLIDER — auto + manual + dots + swipe
     ---------------------------------------------------------------- */
  function initTestimonialSlider() {
    const root = $("[data-testimonial-slider]");
    if (!root) return;

    const track = $("[data-testimonial-track]", root);
    const slides = $$(".testimonial-card", track);
    const prevBtn = $("[data-testimonial-prev]", root);
    const nextBtn = $("[data-testimonial-next]", root);
    const dotsContainer = $("[data-testimonial-dots]", root);
    if (!slides.length) return;

    let currentIndex = 0;
    let autoplayTimer = null;
    const AUTOPLAY_DELAY = 6000;

    // Build dots
    slides.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("role", "tab");
      dot.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
      dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
      dot.addEventListener("click", () => goTo(i, true));
      dotsContainer.appendChild(dot);
    });
    const dots = $$("button", dotsContainer);

    function render() {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      dots.forEach((dot, i) =>
        dot.setAttribute("aria-selected", i === currentIndex ? "true" : "false")
      );
    }

    function goTo(index, userInitiated) {
      currentIndex = (index + slides.length) % slides.length;
      render();
      if (userInitiated) restartAutoplay();
    }

    function next() {
      goTo(currentIndex + 1);
    }
    function prev() {
      goTo(currentIndex - 1);
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      stopAutoplay();
      autoplayTimer = setInterval(next, AUTOPLAY_DELAY);
    }
    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
    }
    function restartAutoplay() {
      stopAutoplay();
      startAutoplay();
    }

    nextBtn?.addEventListener("click", () => goTo(currentIndex + 1, true));
    prevBtn?.addEventListener("click", () => goTo(currentIndex - 1, true));

    // Pause on hover / focus
    root.addEventListener("mouseenter", stopAutoplay);
    root.addEventListener("mouseleave", startAutoplay);
    root.addEventListener("focusin", stopAutoplay);
    root.addEventListener("focusout", startAutoplay);

    // Touch swipe support
    let touchStartX = 0;
    let touchDeltaX = 0;

    track.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.touches[0].clientX;
        stopAutoplay();
      },
      { passive: true }
    );
    track.addEventListener(
      "touchmove",
      (e) => {
        touchDeltaX = e.touches[0].clientX - touchStartX;
      },
      { passive: true }
    );
    track.addEventListener("touchend", () => {
      if (Math.abs(touchDeltaX) > 50) {
        touchDeltaX < 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1);
      }
      touchDeltaX = 0;
      startAutoplay();
    });

    render();
    startAutoplay();
  }

  /* ----------------------------------------------------------------
     10. FAQ ACCORDION — accessible, one panel open at a time
     ---------------------------------------------------------------- */
  function initFaqAccordion() {
    const accordion = $("[data-accordion]");
    if (!accordion) return;

    const triggers = $$(".accordion__trigger", accordion);

    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const isOpen = trigger.getAttribute("aria-expanded") === "true";

        // Close all panels first (only one open at a time)
        triggers.forEach((t) => t.setAttribute("aria-expanded", "false"));

        // Re-open the clicked one if it was previously closed
        trigger.setAttribute("aria-expanded", String(!isOpen));
      });
    });
  }

  /* ----------------------------------------------------------------
     11. APPOINTMENT BOOKING FORM — validates, calls the
     create_public_appointment Supabase RPC, and displays the
     returned token number. Every field name/id here is unchanged
     from before; only the backend call changed.
     ---------------------------------------------------------------- */
  function initAppointmentForm() {
    const form = $("#appointment-form");
    if (!form) return;

    const statusEl = $("[data-form-status]", form);
    const submitBtn = $("#appointment-submit", form);
    const submitBtnLabel = submitBtn ? submitBtn.innerHTML : "";
    const tokenCard = $("#token-success");
    const tokenValueEl = $("[data-token-value]", tokenCard || document);

    const validators = {
      patientName: (value) =>
        value.trim().length >= 2 || "Please enter the patient's name.",
      mobile: (value) =>
        /^[0-9+()\-.\s]{7,15}$/.test(value.trim()) || "Please enter a valid mobile number.",
      age: (value) => {
        const n = Number(value);
        return (Number.isInteger(n) && n > 0 && n <= 120) || "Please enter a valid age.";
      },
      gender: (value) => value !== "" || "Please select a gender.",
      treatment: (value) => value !== "" || "Please select a treatment.",
      preferredDate: (value) => {
        if (value === "") return "Please choose a preferred date.";
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chosen = new Date(value + "T00:00:00");
        return chosen >= today || "Please choose today or a future date.";
      },
      preferredTime: (value) => value !== "" || "Please select a preferred time.",
    };

    function showError(field, message) {
      const wrapper = field.closest(".form-field");
      const errorEl = $(`[data-error-for="${field.name}"]`, form);
      if (wrapper) wrapper.classList.add("has-error");
      if (errorEl) errorEl.textContent = message;
    }

    function clearError(field) {
      const wrapper = field.closest(".form-field");
      const errorEl = $(`[data-error-for="${field.name}"]`, form);
      if (wrapper) wrapper.classList.remove("has-error");
      if (errorEl) errorEl.textContent = "";
    }

    function validateField(field) {
      const validate = validators[field.name];
      if (!validate) return true;
      const result = validate(field.value);
      if (result === true) {
        clearError(field);
        return true;
      }
      showError(field, result);
      return false;
    }

    // Live validation on blur
    Object.keys(validators).forEach((name) => {
      const field = form.elements[name];
      if (field) field.addEventListener("blur", () => validateField(field));
    });

    function setStatus(message, tone) {
      statusEl.textContent = message;
      statusEl.style.color =
        tone === "error" ? "var(--rust-500)" : tone === "success" ? "var(--success-600)" : "";
    }

    function setLoading(isLoading) {
      if (!submitBtn) return;
      submitBtn.disabled = isLoading;
      submitBtn.innerHTML = isLoading ? "Booking…" : submitBtnLabel;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (tokenCard) tokenCard.hidden = true;

      let isValid = true;
      Object.keys(validators).forEach((name) => {
        const field = form.elements[name];
        if (field && !validateField(field)) isValid = false;
      });

      if (!isValid) {
        setStatus("Please fix the highlighted fields and try again.", "error");
        $(".has-error input, .has-error select", form)?.focus();
        return;
      }

      if (!isSupabaseConfigured()) {
        setStatus(
          "Booking system isn't connected yet — see the setup guide to link Supabase.",
          "error"
        );
        return;
      }

      setLoading(true);
      setStatus("Booking your appointment…");

      try {
        const { data, error } = await sb().rpc("create_public_appointment", {
          p_patient_name: form.elements.patientName.value.trim(),
          p_phone: form.elements.mobile.value.trim(),
          p_age: Number(form.elements.age.value),
          p_gender: form.elements.gender.value,
          p_treatment: form.elements.treatment.value,
          p_appointment_date: form.elements.preferredDate.value,
          p_appointment_time: form.elements.preferredTime.value,
          p_notes: form.elements.notes.value.trim(),
        });

        // create_public_appointment returns a one-row table, so data
        // is an array like [{ token: "D-XXXXXX" }] on success.
        const token = Array.isArray(data) && data[0] ? data[0].token : null;

        if (!error && token) {
          setStatus(
            "Appointment booked! Your token number is shown below — save it to track your status.",
            "success"
          );
          if (tokenCard && tokenValueEl) {
            tokenValueEl.textContent = token;
            tokenCard.hidden = false;
            tokenCard.scrollIntoView({
              behavior: prefersReducedMotion ? "auto" : "smooth",
              block: "center",
            });
          }
          form.reset();
        } else {
          setStatus(
            (error && error.message) || "Something went wrong. Please try again.",
            "error"
          );
        }
      } catch (err) {
        setStatus(
          "Couldn't reach the booking system — please check your internet connection and try again.",
          "error"
        );
      } finally {
        setLoading(false);
      }
    });
  }

  /* ----------------------------------------------------------------
     12. LIVE TOKEN DISPLAY — polls the get_live_queue_status
     Supabase RPC (Step 5) for today's aggregate queue state. No
     patient PII is involved — see the SQL file's header comment.
     ---------------------------------------------------------------- */
  function initLiveTokenDisplay() {
    const section = $("#live-token");
    if (!section) return;

    const servingEl = $("[data-live-serving]", section);
    const nextEl = $("[data-live-next]", section);
    const waitingEl = $("[data-live-waiting]", section);
    const statusEl = $("[data-live-status]", section);

    async function refresh() {
      if (!isSupabaseConfigured()) {
        statusEl.textContent = "Live queue will appear here once booking is connected.";
        return;
      }
      try {
        const { data, error } = await sb().rpc("get_live_queue_status");
        const row = Array.isArray(data) && data[0] ? data[0] : null;

        if (!error && row) {
          servingEl.textContent = row.now_serving || "—";
          nextEl.textContent = row.next_token || "—";
          waitingEl.textContent = String(row.waiting_count ?? 0);
          statusEl.textContent = "";
        } else {
          statusEl.textContent = "Queue unavailable right now.";
        }
      } catch (err) {
        statusEl.textContent = "Couldn't load the live queue — retrying shortly.";
      }
    }

    refresh();
    // Poll periodically so the board stays current without a manual refresh
    setInterval(refresh, 20000);
  }

  /* ----------------------------------------------------------------
     13. TOKEN STATUS TRACKER — calls the get_appointment_status
     Supabase RPC, which requires BOTH the token and the last 4
     digits of the phone number used at booking (two-factor lookup,
     so a guessed/leaked token alone can't pull someone else's data).
     ---------------------------------------------------------------- */
  function initTokenTracker() {
    const form = $("#token-tracker-form");
    const resultCard = $("#token-result");
    if (!form || !resultCard) return;

    const statusEl = $("[data-tracker-status]");
    const tokenInput = $("#tokenInput", form);
    const phoneLast4Input = $("#tokenPhoneLast4", form);

    const fields = {
      token: $("[data-result-token]", resultCard),
      badge: $("[data-result-status-badge]", resultCard),
      name: $("[data-result-name]", resultCard),
      doctor: $("[data-result-doctor]", resultCard),
      date: $("[data-result-date]", resultCard),
      time: $("[data-result-time]", resultCard),
      position: $("[data-result-position]", resultCard),
      wait: $("[data-result-wait]", resultCard),
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const token = tokenInput.value.trim().toUpperCase();
      const phoneLast4 = phoneLast4Input ? phoneLast4Input.value.trim() : "";
      resultCard.hidden = true;

      if (!token) {
        statusEl.textContent = "Please enter your token number.";
        return;
      }
      if (!/^[0-9]{4}$/.test(phoneLast4)) {
        statusEl.textContent = "Please enter the last 4 digits of the phone number you booked with.";
        return;
      }
      if (!isSupabaseConfigured()) {
        statusEl.textContent = "Booking system isn't connected yet — see the setup guide to link Supabase.";
        return;
      }

      statusEl.textContent = "Looking up your token…";

      try {
        const { data, error } = await sb().rpc("get_appointment_status", {
          p_token: token,
          p_phone_last4: phoneLast4,
        });

        const appt = Array.isArray(data) && data[0] ? data[0] : null;

        if (!error && appt) {
          statusEl.textContent = "";
          fields.token.textContent = appt.token;
          fields.badge.textContent = appt.status;
          fields.badge.setAttribute("data-status", appt.status);
          fields.name.textContent = appt.patient_name;
          fields.doctor.textContent = appt.doctor_name;
          fields.date.textContent = appt.appointment_date;
          fields.time.textContent = appt.appointment_time;
          fields.position.textContent =
            appt.waiting_position > 0 ? `${appt.waiting_position} ahead of you` : "You're up next";
          fields.wait.textContent =
            appt.estimated_wait_minutes > 0 ? `~${appt.estimated_wait_minutes} min` : "Any moment now";
          resultCard.hidden = false;
        } else if (error) {
          statusEl.textContent = "Something went wrong. Please try again.";
        } else {
          // Deliberately generic: the RPC returns an empty result both
          // when the token doesn't exist and when the phone digits
          // don't match, so this message never confirms which one.
          statusEl.textContent = "No matching appointment found. Please check your token and phone number.";
        }
      } catch (err) {
        statusEl.textContent = "Couldn't reach the booking system — please try again shortly.";
      }
    });
  }

  /* ----------------------------------------------------------------
     14. NEWSLETTER FORM (frontend only)
     ---------------------------------------------------------------- */
  function initNewsletterForm() {
    const form = $("#newsletter-form");
    if (!form) return;
    const statusEl = $("[data-newsletter-status]", form);
    const emailInput = $("#newsletter-email", form);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
      if (!isValid) {
        statusEl.textContent = "Please enter a valid email address.";
        return;
      }
      statusEl.textContent = "You're subscribed — thank you!";
      form.reset();
    });
  }

  /* ----------------------------------------------------------------
     15. BACK TO TOP
     ---------------------------------------------------------------- */
  function initBackToTop() {
    const button = $("#back-to-top");
    if (!button) return;

    const onScroll = rafThrottle(() => {
      button.hidden = window.scrollY < 480;
    });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }

  /* ----------------------------------------------------------------
     16. FOOTER CURRENT YEAR
     ---------------------------------------------------------------- */
  function initFooterYear() {
    const el = $("#current-year");
    if (el) el.textContent = new Date().getFullYear();
  }

  /* ----------------------------------------------------------------
     17. INIT — run everything once the DOM is ready
     ---------------------------------------------------------------- */
  function init() {
    initAnnouncementBar();
    initNavbar();
    initScrollReveal();
    initStatsCounter();
    initBeforeAfterSlider();
    initGalleryLightbox();
    initTestimonialSlider();
    initFaqAccordion();
    initAppointmentForm();
    initLiveTokenDisplay();
    initTokenTracker();
    initNewsletterForm();
    initBackToTop();
    initFooterYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
