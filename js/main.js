/* ==========================================================================
   MAISON NOIR — script.js
   Vanilla JS + GSAP + ScrollTrigger + Lenis
   Sections:
   0. Utilities & feature flags
   1. Loader
   2. Lenis smooth scroll + GSAP ticker bridge
   3. Header state, scroll progress, active nav
   4. Mobile navigation
   5. In-page smooth anchor links
   6. Custom cursor
   7. Reveal-on-scroll (GSAP ScrollTrigger)
   8. Thread dividers
   9. Parallax
   10. Hero intro animation
   11. Stat counters
   12. Testimonial slider
   13. Gallery lightbox
   14. Reservation form
   15. Newsletter form
   16. Back to top / footer year
   17. Init
   ========================================================================== */

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * 0. Utilities & feature flags
   * ------------------------------------------------------------------ */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isCoarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  var hasLenis = typeof window.Lenis !== "undefined";

  if (hasGSAP && hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
  }

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  /* ------------------------------------------------------------------ *
   * Shared state
   * ------------------------------------------------------------------ */
  var lenis = null;
  var headerEl = qs("#siteHeader");

  /* ------------------------------------------------------------------ *
   * 1. Loader
   * ------------------------------------------------------------------ */
  function initLoader() {
    var loader = qs("#loader");
    if (!loader) return Promise.resolve();

    document.documentElement.classList.add("is-loading");

    return new Promise(function (resolve) {
      var minDelay = reduceMotion ? 0 : 900;
      var start = Date.now();

      function finish() {
        var elapsed = Date.now() - start;
        var remaining = Math.max(0, minDelay - elapsed);
        setTimeout(function () {
          loader.classList.add("is-hidden");
          document.documentElement.classList.remove("is-loading");
          loader.addEventListener("transitionend", function handler() {
            loader.removeEventListener("transitionend", handler);
            loader.setAttribute("hidden", "");
          }, { once: true });
          resolve();
        }, remaining);
      }

      if (document.readyState === "complete") {
        finish();
      } else {
        window.addEventListener("load", finish, { once: true });
        // Safety net in case 'load' never fires promptly (slow video/fonts)
        setTimeout(finish, 4000);
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * 2. Lenis smooth scroll + GSAP ticker bridge
   * ------------------------------------------------------------------ */
  function initSmoothScroll() {
    if (reduceMotion || !hasLenis) return;

    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.1,
    });

    if (hasGSAP) {
      lenis.on("scroll", function () {
        if (hasScrollTrigger) ScrollTrigger.update();
      });
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target, offset) {
    if (lenis) {
      lenis.scrollTo(target, { offset: offset || 0, duration: 1.2 });
    } else {
      var el = typeof target === "string" ? qs(target) : target;
      var top = target === 0 ? 0 : (el ? el.getBoundingClientRect().top + window.scrollY + (offset || 0) : 0);
      window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  /* ------------------------------------------------------------------ *
   * 3. Header state, scroll progress, active nav
   * ------------------------------------------------------------------ */
  function initHeaderAndProgress() {
    var progressBarFill = qs("#scrollProgress span");
    var navLinks = qsa('.nav__list a[href^="#"]');
    var mobileLinks = qsa('.mobile-nav a[href^="#"]');
    var sections = [];

    navLinks.concat ? null : null;
    var seenIds = {};
    navLinks.concat(mobileLinks).forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (id && !seenIds[id]) {
        var sec = document.getElementById(id);
        if (sec) { sections.push({ id: id, el: sec }); seenIds[id] = true; }
      }
    });

    function setActive(id) {
      navLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
      });
      mobileLinks.forEach(function (a) {
        a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
      });
    }

    function updateHeaderScrolled() {
      var y = window.scrollY || window.pageYOffset;
      if (headerEl) headerEl.classList.toggle("is-scrolled", y > 24);
    }

    function updateProgress() {
      var doc = document.documentElement;
      var scrollTop = window.scrollY || doc.scrollTop;
      var height = doc.scrollHeight - doc.clientHeight;
      var pct = height > 0 ? clamp((scrollTop / height) * 100, 0, 100) : 0;
      if (progressBarFill) progressBarFill.style.width = pct + "%";
    }

    function updateActiveByPosition() {
      var probe = window.innerHeight * 0.4;
      var current = sections[0] ? sections[0].id : null;
      for (var i = 0; i < sections.length; i++) {
        var rect = sections[i].el.getBoundingClientRect();
        if (rect.top <= probe) current = sections[i].id;
      }
      if (current) setActive(current);
    }

    if (hasGSAP && hasScrollTrigger) {
      sections.forEach(function (s) {
        ScrollTrigger.create({
          trigger: s.el,
          start: "top 55%",
          end: "bottom 55%",
          onEnter: function () { setActive(s.id); },
          onEnterBack: function () { setActive(s.id); },
        });
      });
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: function () {
          updateHeaderScrolled();
          updateProgress();
        },
      });
    } else {
      var onScroll = function () {
        updateHeaderScrolled();
        updateProgress();
        updateActiveByPosition();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    updateHeaderScrolled();
    updateProgress();
    if (sections.length) setActive(sections[0].id);
  }

  /* ------------------------------------------------------------------ *
   * 4. Mobile navigation
   * ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = qs("#navToggle");
    var panel = qs("#mobileNav");
    if (!toggle || !panel) return;

    var focusableSel = 'a[href], button:not([disabled])';
    var lastFocused = null;

    function openMenu() {
      lastFocused = document.activeElement;
      panel.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      var first = qs(focusableSel, panel);
      if (first) first.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function closeMenu() {
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      document.removeEventListener("keydown", onKeydown);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") {
        closeMenu();
        return;
      }
      if (e.key === "Tab") {
        var focusables = qsa(focusableSel, panel);
        if (!focusables.length) return;
        var firstEl = focusables[0];
        var lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }

    toggle.addEventListener("click", function () {
      if (panel.classList.contains("is-open")) closeMenu(); else openMenu();
    });

    qsa("a", panel).forEach(function (a) {
      a.addEventListener("click", closeMenu);
    });

    window.addEventListener("resize", debounce(function () {
      if (window.innerWidth > 960 && panel.classList.contains("is-open")) closeMenu();
    }, 150));
  }

  /* ------------------------------------------------------------------ *
   * 5. In-page smooth anchor links
   * ------------------------------------------------------------------ */
  function initAnchorLinks() {
    qsa('a[href^="#"]').forEach(function (a) {
      var href = a.getAttribute("href");
      if (!href || href === "#") return;
      a.addEventListener("click", function (e) {
        var target = qs(href);
        if (!target) return;
        e.preventDefault();
        var offset = headerEl ? -headerEl.offsetHeight + 1 : 0;
        scrollToTarget(target, offset);
        history.pushState ? history.pushState(null, "", href) : (window.location.hash = href);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * 6. Custom cursor
   * ------------------------------------------------------------------ */
  function initCursor() {
    var cursor = qs("#cursor");
    if (!cursor || reduceMotion || isCoarsePointer) return;

    var dot = qs(".cursor__dot", cursor);
    var ring = qs(".cursor__ring", cursor);

    var moveDot, moveRing;
    if (hasGSAP) {
      moveDot = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3.out" });
      var moveDotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3.out" });
      var moveRingX = gsap.quickTo(ring, "x", { duration: 0.32, ease: "power3.out" });
      var moveRingY = gsap.quickTo(ring, "y", { duration: 0.32, ease: "power3.out" });
      moveRing = true;

      window.addEventListener("mousemove", function (e) {
        moveDot(e.clientX);
        moveDotY(e.clientY);
        moveRingX(e.clientX);
        moveRingY(e.clientY);
      });
    } else {
      window.addEventListener("mousemove", function (e) {
        dot.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
        ring.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px) translate(-50%,-50%)";
      });
    }

    var hoverTargets = 'a, button, .gallery__item, input, select, textarea, .testimonial-btn';
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest && e.target.closest(hoverTargets)) {
        cursor.classList.add("is-active");
      }
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest && e.target.closest(hoverTargets)) {
        cursor.classList.remove("is-active");
      }
    });
    document.addEventListener("mouseleave", function () { cursor.style.opacity = "0"; });
    document.addEventListener("mouseenter", function () { cursor.style.opacity = "1"; });
  }

  /* ------------------------------------------------------------------ *
   * 7. Reveal-on-scroll
   * ------------------------------------------------------------------ */
  function initReveal() {
    // Hero's reveal-up elements are handled by initHeroIntro() to avoid
    // fighting over inline styles during the mask/timeline entrance.
    var items = qsa(".reveal-up").filter(function (el) { return !el.closest(".hero"); });
    if (!items.length) return;

    if (reduceMotion) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    if (hasGSAP && hasScrollTrigger) {
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: function (batch) {
          batch.forEach(function (el) { el.classList.add("is-visible"); });
        },
      });
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
      items.forEach(function (el) { observer.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* ------------------------------------------------------------------ *
   * 8. Thread dividers
   * ------------------------------------------------------------------ */
  function initThreads() {
    var threads = qsa(".thread");
    if (!threads.length) return;

    if (reduceMotion) {
      threads.forEach(function (t) { t.classList.add("is-drawn"); });
      return;
    }

    if (hasGSAP && hasScrollTrigger) {
      threads.forEach(function (t) {
        ScrollTrigger.create({
          trigger: t,
          start: "top 85%",
          once: true,
          onEnter: function () { t.classList.add("is-drawn"); },
        });
      });
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-drawn");
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      threads.forEach(function (t) { observer.observe(t); });
    } else {
      threads.forEach(function (t) { t.classList.add("is-drawn"); });
    }
  }

  /* ------------------------------------------------------------------ *
   * 9. Parallax
   * ------------------------------------------------------------------ */
  function initParallax() {
    if (reduceMotion || !hasGSAP || !hasScrollTrigger) return;
    var items = qsa(".parallax[data-speed]");
    items.forEach(function (el) {
      var speed = parseFloat(el.getAttribute("data-speed")) || 0.2;
      var distance = 120 * speed;
      gsap.fromTo(
        el,
        { y: -distance },
        {
          y: distance,
          ease: "none",
          scrollTrigger: {
            trigger: el.closest("section") || el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });
  }

  /* ------------------------------------------------------------------ *
   * 10. Hero intro animation
   * ------------------------------------------------------------------ */
  function initHeroIntro() {
    var hero = qs(".hero");
    if (!hero) return;

    // Wrap split-line text for a mask reveal
    var lines = qsa(".split-line", hero);
    lines.forEach(function (line) {
      var inner = document.createElement("span");
      inner.className = "split-line__inner";
      inner.style.display = "inline-block";
      inner.style.willChange = "transform";
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
    });

    if (reduceMotion || !hasGSAP) {
      lines.forEach(function (line) {
        var inner = qs(".split-line__inner", line);
        if (inner) inner.style.transform = "none";
      });
      qsa(".hero .reveal-up", hero).forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var innerLines = lines.map(function (l) { return qs(".split-line__inner", l); });
    gsap.set(innerLines, { yPercent: 110 });
    gsap.set(qsa(".hero .reveal-up", hero), { opacity: 0, y: 24 });

    var tl = gsap.timeline({ delay: 0.15, defaults: { ease: "power4.out" } });
    tl.to(innerLines, { yPercent: 0, duration: 1.1, stagger: 0.12 })
      .to(qsa(".hero .reveal-up", hero), {
        opacity: 1, y: 0, duration: 0.9, stagger: 0.12,
        onComplete: function () {
          qsa(".hero .reveal-up", hero).forEach(function (el) { el.classList.add("is-visible"); });
        },
      }, "-=0.6");
  }

  /* ------------------------------------------------------------------ *
   * 11. Stat counters
   * ------------------------------------------------------------------ */
  function initCounters() {
    var counters = qsa("[data-count]");
    if (!counters.length) return;

    function animateCounter(el) {
      var target = parseFloat(el.getAttribute("data-count")) || 0;
      if (reduceMotion || !hasGSAP) {
        el.textContent = target;
        return;
      }
      var obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: function () { el.textContent = Math.round(obj.val); },
      });
    }

    if (hasGSAP && hasScrollTrigger) {
      counters.forEach(function (el) {
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: function () { animateCounter(el); },
        });
      });
    } else if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (el) { observer.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ------------------------------------------------------------------ *
   * 12. Testimonial slider
   * ------------------------------------------------------------------ */
  function initTestimonials() {
    var slider = qs("#testimonialSlider");
    var track = qs("#testimonialTrack");
    var prevBtn = qs("#testimonialPrev");
    var nextBtn = qs("#testimonialNext");
    var dotsWrap = qs("#testimonialDots");
    if (!slider || !track || !dotsWrap) return;

    var slides = qsa(".testimonial", track);
    if (!slides.length) return;

    var index = 0;
    var autoplayDelay = 6500;
    var autoplayTimer = null;

    slides.forEach(function (_, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", "Go to testimonial " + (i + 1));
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", function () { goTo(i); restartAutoplay(); });
      dotsWrap.appendChild(dot);
    });
    var dots = qsa("button", dotsWrap);

    function render() {
      var offset = -index * 100;
      track.style.transform = "translateX(" + offset + "%)";
      dots.forEach(function (d, i) { d.classList.toggle("is-active", i === index); });
      slides.forEach(function (s, i) {
        s.setAttribute("aria-hidden", i === index ? "false" : "true");
      });
    }

    function goTo(i) {
      index = (i + slides.length) % slides.length;
      render();
    }

    function next() { goTo(index + 1); }
    function prev() { goTo(index - 1); }

    function startAutoplay() {
      if (reduceMotion || slides.length < 2) return;
      stopAutoplay();
      autoplayTimer = setInterval(next, autoplayDelay);
    }
    function stopAutoplay() {
      if (autoplayTimer) clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    function restartAutoplay() { stopAutoplay(); startAutoplay(); }

    if (nextBtn) nextBtn.addEventListener("click", function () { next(); restartAutoplay(); });
    if (prevBtn) prevBtn.addEventListener("click", function () { prev(); restartAutoplay(); });

    slider.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { next(); restartAutoplay(); }
      if (e.key === "ArrowLeft") { prev(); restartAutoplay(); }
    });

    slider.addEventListener("mouseenter", stopAutoplay);
    slider.addEventListener("mouseleave", startAutoplay);
    slider.addEventListener("focusin", stopAutoplay);
    slider.addEventListener("focusout", startAutoplay);

    // Basic touch swipe support
    var touchStartX = null;
    track.addEventListener("touchstart", function (e) {
      touchStartX = e.touches[0].clientX;
      stopAutoplay();
    }, { passive: true });
    track.addEventListener("touchend", function (e) {
      if (touchStartX === null) return;
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      touchStartX = null;
      startAutoplay();
    }, { passive: true });

    render();
    startAutoplay();
  }

  /* ------------------------------------------------------------------ *
   * 13. Gallery lightbox
   * ------------------------------------------------------------------ */
  function initLightbox() {
    var lightbox = qs("#lightbox");
    var lightboxImg = qs("#lightboxImg");
    var closeBtn = qs("#lightboxClose");
    var items = qsa(".gallery__item");
    if (!lightbox || !lightboxImg || !items.length) return;

    var lastFocused = null;

    function open(item) {
      var full = item.getAttribute("data-full");
      var img = qs("img", item);
      lastFocused = document.activeElement;
      lightboxImg.src = full || (img ? img.src : "");
      lightboxImg.alt = img ? img.alt : "";
      lightbox.removeAttribute("hidden");
      requestAnimationFrame(function () { lightbox.classList.add("is-visible"); });
      document.body.style.overflow = "hidden";
      if (lenis) lenis.stop();
      if (closeBtn) closeBtn.focus();
      document.addEventListener("keydown", onKeydown);
    }

    function close() {
      lightbox.classList.remove("is-visible");
      document.body.style.overflow = "";
      if (lenis) lenis.start();
      document.removeEventListener("keydown", onKeydown);
      var finish = function () {
        lightbox.setAttribute("hidden", "");
        lightboxImg.src = "";
        lightbox.removeEventListener("transitionend", finish);
      };
      lightbox.addEventListener("transitionend", finish);
      if (lastFocused) lastFocused.focus();
    }

    function onKeydown(e) {
      if (e.key === "Escape") close();
    }

    items.forEach(function (item) {
      item.addEventListener("click", function () { open(item); });
    });

    if (closeBtn) closeBtn.addEventListener("click", close);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) close();
    });
  }

  /* ------------------------------------------------------------------ *
   * 14. Reservation form
   * ------------------------------------------------------------------ */
  function initReservationForm() {
    var form = qs("#reservationForm");
    var status = qs("#formStatus");
    if (!form) return;

    var dateInput = qs("#resDate", form);
    if (dateInput) {
      var today = new Date();
      var yyyy = today.getFullYear();
      var mm = String(today.getMonth() + 1).padStart(2, "0");
      var dd = String(today.getDate()).padStart(2, "0");
      dateInput.setAttribute("min", yyyy + "-" + mm + "-" + dd);
    }

    var validators = {
      resName: function (v) {
        if (!v.trim()) return "Please enter your name.";
        if (v.trim().length < 2) return "Name looks too short.";
        return "";
      },
      resPhone: function (v) {
        if (!v.trim()) return "Please enter a phone number.";
        if (!/^[0-9+\-\s()]{7,16}$/.test(v.trim())) return "Enter a valid phone number.";
        return "";
      },
      resEmail: function (v) {
        if (!v.trim()) return "Please enter your email.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return "Enter a valid email address.";
        return "";
      },
      resDate: function (v) {
        if (!v) return "Please choose a date.";
        var selected = new Date(v + "T00:00:00");
        var now = new Date();
        now.setHours(0, 0, 0, 0);
        if (selected < now) return "Please choose a future date.";
        if (selected.getDay() === 1) return "We're closed on Mondays — please pick another day.";
        return "";
      },
      resTime: function (v) { return v ? "" : "Please select a time."; },
      resGuests: function (v) { return v ? "" : "Please select party size."; },
    };

    function getErrorEl(field) {
      var wrap = field.closest(".form-field");
      var el = wrap ? qs(".field-error", wrap) : null;
      if (!el && wrap) {
        el = document.createElement("small");
        el.className = "field-error";
        el.setAttribute("role", "alert");
        wrap.appendChild(el);
      }
      return el;
    }

    function setFieldError(field, message) {
      var wrap = field.closest(".form-field");
      var errEl = getErrorEl(field);
      if (message) {
        if (wrap) wrap.classList.add("has-error");
        field.setAttribute("aria-invalid", "true");
        if (errEl) { errEl.textContent = message; errEl.classList.add("is-visible"); }
      } else {
        if (wrap) wrap.classList.remove("has-error");
        field.removeAttribute("aria-invalid");
        if (errEl) { errEl.textContent = ""; errEl.classList.remove("is-visible"); }
      }
    }

    function validateField(field) {
      var validator = validators[field.id];
      if (!validator) return true;
      var message = validator(field.value);
      setFieldError(field, message);
      return !message;
    }

    Object.keys(validators).forEach(function (id) {
      var field = qs("#" + id, form);
      if (!field) return;
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.closest(".form-field").classList.contains("has-error")) validateField(field);
      });
      field.addEventListener("change", function () { validateField(field); });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var fieldIds = Object.keys(validators);
      var firstInvalid = null;
      var allValid = true;

      fieldIds.forEach(function (id) {
        var field = qs("#" + id, form);
        if (!field) return;
        var valid = validateField(field);
        if (!valid) {
          allValid = false;
          if (!firstInvalid) firstInvalid = field;
        }
      });

      if (!allValid) {
        if (status) {
          status.textContent = "Please correct the highlighted fields.";
          status.classList.add("is-error");
        }
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      if (status) {
        status.classList.remove("is-error");
        status.textContent = "";
      }

      var submitBtn = qs('button[type="submit"]', form);
      var btnText = submitBtn ? qs(".btn__text", submitBtn) : null;
      var originalText = btnText ? btnText.textContent : "";

      if (submitBtn) submitBtn.setAttribute("disabled", "true");
      if (btnText) btnText.textContent = "Confirming…";

      var name = qs("#resName", form).value.trim();
      var date = qs("#resDate", form).value;
      var time = qs("#resTime", form).value;
      var guests = qs("#resGuests", form).value;

      setTimeout(function () {
        if (submitBtn) submitBtn.removeAttribute("disabled");
        if (btnText) btnText.textContent = originalText || "Confirm Reservation";

        if (status) {
          var prettyDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
            weekday: "long", day: "numeric", month: "long",
          });
          status.textContent = "Thank you, " + name + " — your table for " + guests + " on " + prettyDate + " at " + time + " is confirmed. A confirmation email is on its way.";
        }
        form.reset();
        if (dateInput) dateInput.setAttribute("min", dateInput.getAttribute("min"));
        fieldIds.forEach(function (id) {
          var field = qs("#" + id, form);
          if (field) setFieldError(field, "");
        });
      }, 900);
    });
  }

  /* ------------------------------------------------------------------ *
   * 15. Newsletter form
   * ------------------------------------------------------------------ */
  function initNewsletterForm() {
    var form = qs("#newsletterForm");
    var status = qs("#newsletterStatus");
    if (!form) return;

    var input = qs("#newsletterEmail", form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input ? input.value.trim() : "";
      var valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      if (!valid) {
        if (status) {
          status.textContent = "Please enter a valid email address.";
          status.classList.add("is-error");
        }
        if (input) input.focus();
        return;
      }

      if (status) {
        status.classList.remove("is-error");
        status.textContent = "Subscribing…";
      }

      setTimeout(function () {
        if (status) status.textContent = "Thank you — you're on the list.";
        form.reset();
      }, 600);
    });
  }

  /* ------------------------------------------------------------------ *
   * 16. Back to top / footer year
   * ------------------------------------------------------------------ */
  function initMisc() {
    var yearEl = qs("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var backToTop = qs("#backToTop");
    if (backToTop) {
      backToTop.addEventListener("click", function () { scrollToTarget(0, 0); });
    }
  }

  /* ------------------------------------------------------------------ *
   * 17. Init
   * ------------------------------------------------------------------ */
  function initAll() {
    initSmoothScroll();
    initHeaderAndProgress();
    initMobileNav();
    initAnchorLinks();
    initCursor();
    initHeroIntro();
    initReveal();
    initThreads();
    initParallax();
    initCounters();
    initTestimonials();
    initLightbox();
    initReservationForm();
    initNewsletterForm();
    initMisc();

    if (hasGSAP && hasScrollTrigger) {
      window.addEventListener("load", function () { ScrollTrigger.refresh(); });
      window.addEventListener("resize", debounce(function () { ScrollTrigger.refresh(); }, 200));
    }
  }

  function boot() {
    initAll();
    initLoader();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
