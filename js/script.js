// ── UTILS ────────────────────────────────────────────────────────────────────
function sanitizeText(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ── MOBILE MENU ──────────────────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}
document.addEventListener('click', function(e) {
  const menu = document.getElementById('mobileMenu');
  const ham  = document.querySelector('.hamburger');
  if (menu && ham && !menu.contains(e.target) && !ham.contains(e.target)) {
    menu.classList.remove('open');
  }
});

// ── LIGHTBOX (imagen + video) ─────────────────────────────────────────────────
function openLightbox(type, src) {
  if (!/^(blob:|\.\/|\/(?!\/)|https?:\/\/)/.test(src)) return;
  const lb       = document.getElementById('lightbox');
  const imgEl    = document.getElementById('lightboxImg');
  const videoEl  = document.getElementById('lightboxVideo');

  if (type === 'video') {
    imgEl.style.display   = 'none';
    imgEl.src             = '';
    videoEl.style.display = 'block';
    videoEl.src           = src;
    videoEl.play().catch(function() {});
  } else {
    videoEl.style.display = 'none';
    videoEl.pause();
    videoEl.src           = '';
    imgEl.style.display   = 'block';
    imgEl.src             = src;
  }

  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lb      = document.getElementById('lightbox');
  const videoEl = document.getElementById('lightboxVideo');
  lb.classList.remove('open');
  document.body.style.overflow = '';
  videoEl.pause();
  videoEl.src = '';
  videoEl.style.display = 'none';
  document.getElementById('lightboxImg').style.display = 'none';
}

// Evitar que click en el video cierre el lightbox
document.getElementById('lightboxVideo').addEventListener('click', function(e) {
  e.stopPropagation();
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeLightbox();
});

// ── CARRUSEL (fábrica reutilizable) ──────────────────────────────────────────
function createCarousel(trackId, dotsId, prevSelector, nextSelector) {
  const track    = document.getElementById(trackId);
  const dotsWrap = document.getElementById(dotsId);
  if (!track || !dotsWrap) return null;

  // Seleccionamos los botones dentro del mismo .carousel-wrapper que el track
  const wrapper  = track.closest('.carousel-wrapper');
  const prevBtn  = wrapper ? wrapper.querySelector('.carousel-prev') : null;
  const nextBtn  = wrapper ? wrapper.querySelector('.carousel-next') : null;

  let current = 0;
  let perView = getSlidesPerView();

  function getSlidesPerView() {
    const w = window.innerWidth;
    if (w <= 560) return 1;
    if (w <= 900) return 2;
    return 3;
  }

  function allSlides() {
    return track.querySelectorAll('.carousel-slide');
  }

  function totalPages() {
    return Math.ceil(allSlides().length / perView);
  }

  function buildDots() {
    dotsWrap.innerHTML = '';
    for (let i = 0; i < totalPages(); i++) {
      const btn = document.createElement('button');
      btn.className = 'carousel-dot' + (i === current ? ' active' : '');
      btn.setAttribute('aria-label', 'Página ' + (i + 1));
      (function(idx) {
        btn.addEventListener('click', function() { goTo(idx); });
      })(i);
      dotsWrap.appendChild(btn);
    }
  }

  function goTo(page) {
    perView  = getSlidesPerView();
    const tp = totalPages();
    current  = Math.max(0, Math.min(page, tp - 1));

    const slides  = allSlides();
    if (!slides.length) return;
    const slideW  = slides[0].offsetWidth;
    const gap     = parseFloat(getComputedStyle(track).gap) || 17.6;
    const offset  = current * perView * (slideW + gap);
    track.style.transform = 'translateX(-' + offset + 'px)';

    Array.from(dotsWrap.children).forEach(function(d, i) {
      d.classList.toggle('active', i === current);
    });
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current >= tp - 1;

    // Pausa todos los videos del track cuando se navega
    track.querySelectorAll('video').forEach(function(v) { v.pause(); });
  }

  function move(dir) { goTo(current + dir); }

  // Touch/swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  track.addEventListener('touchend', function(e) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) move(diff > 0 ? 1 : -1);
  }, { passive: true });

  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      const newPer = getSlidesPerView();
      if (newPer !== perView) {
        perView  = newPer;
        current  = 0;
        buildDots();
      }
      goTo(current);
    }, 100);
  });

  buildDots();
  goTo(0);

  return { goTo: goTo, move: move };
}

// Instancias independientes
const photoCarousel = createCarousel('photoTrack', 'photoDots');
const videoCarousel = createCarousel('videoTrack', 'videoDots');

// Función global para los onclick del HTML
window.carouselMove = function(type, dir) {
  if (type === 'photo' && photoCarousel) photoCarousel.move(dir);
  if (type === 'video' && videoCarousel) videoCarousel.move(dir);
};

// ── UPLOAD DE FOTOS ───────────────────────────────────────────────────────────
function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  const track = document.getElementById('photoTrack');
  if (!track) return;
  files.forEach(function(file) {
    if (!file.type.startsWith('image/')) return;
    const url  = URL.createObjectURL(file);
    const slide = document.createElement('div');
    slide.className = 'carousel-slide gallery-item';
    const img = document.createElement('img');
    img.src   = url;
    img.alt   = 'Trabajo';
    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';
    const span = document.createElement('span');
    span.textContent = file.name.replace(/\.[^.]+$/, '');
    overlay.appendChild(span);
    slide.appendChild(img);
    slide.appendChild(overlay);
    slide.addEventListener('click', function() { openLightbox('image', url); });
    track.appendChild(slide);
  });
  event.target.value = '';
  if (photoCarousel) photoCarousel.goTo(0);
}

// ── UPLOAD DE VIDEOS ──────────────────────────────────────────────────────────
function handleVideoUpload(event) {
  const files = Array.from(event.target.files);
  const track = document.getElementById('videoTrack');
  if (!track) return;
  files.forEach(function(file) {
    if (!file.type.startsWith('video/')) return;
    const url   = URL.createObjectURL(file);
    const slide = document.createElement('div');
    slide.className = 'carousel-slide video-item';
    const video = document.createElement('video');
    video.src        = url;
    video.muted      = true;
    video.loop       = true;
    video.playsInline = true;
    video.preload    = 'metadata';
    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay video-overlay';
    const playBtn = document.createElement('div');
    playBtn.className = 'play-btn';
    playBtn.textContent = '▶';
    const span = document.createElement('span');
    span.textContent = file.name.replace(/\.[^.]+$/, '');
    overlay.appendChild(playBtn);
    overlay.appendChild(span);
    slide.appendChild(video);
    slide.appendChild(overlay);
    slide.addEventListener('click', function() { openLightbox('video', url); });
    track.appendChild(slide);
  });
  event.target.value = '';
  if (videoCarousel) videoCarousel.goTo(0);
}

// ── REVIEWS ──────────────────────────────────────────────────────────────────
let selectedStars = 5;
function setStars(n) {
  selectedStars = n;
  document.querySelectorAll('#starPick span').forEach(function(s, i) {
    s.classList.toggle('active', i < n);
  });
}
setStars(5);

function submitReview() {
  const nameEl = document.getElementById('reviewName');
  const locEl  = document.getElementById('reviewLoc');
  const textEl = document.getElementById('reviewText');
  if (!nameEl || !locEl || !textEl) return;
  const name = nameEl.value.trim();
  const loc  = locEl.value.trim();
  const text = textEl.value.trim();
  if (!name || !text) { alert('Por favor completá el nombre y el comentario.'); return; }
  if (name.length > 80 || text.length > 800) { alert('El texto es demasiado largo.'); return; }

  const initials  = name.split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
  const starsHtml = '★'.repeat(selectedStars) + '☆'.repeat(5 - selectedStars);

  const card = document.createElement('div');
  card.className = 'review-card';
  card.style.animation = 'fadeUp .4s ease both';
  const starsDiv = document.createElement('div');
  starsDiv.className = 'stars';
  starsDiv.textContent = starsHtml;
  const reviewP = document.createElement('p');
  reviewP.className = 'review-text';
  reviewP.textContent = '"' + text + '"';
  const authorDiv = document.createElement('div');
  authorDiv.className = 'review-author';
  const avatar = document.createElement('div');
  avatar.className = 'author-avatar';
  avatar.textContent = initials;
  const infoDiv = document.createElement('div');
  const nameDiv = document.createElement('div');
  nameDiv.className = 'author-name';
  nameDiv.textContent = name;
  const locDiv = document.createElement('div');
  locDiv.className = 'author-loc';
  locDiv.textContent = loc || 'Argentina';
  infoDiv.appendChild(nameDiv);
  infoDiv.appendChild(locDiv);
  authorDiv.appendChild(avatar);
  authorDiv.appendChild(infoDiv);
  card.appendChild(starsDiv);
  card.appendChild(reviewP);
  card.appendChild(authorDiv);

  const container = document.getElementById('reviewsContainer');
  container.insertBefore(card, container.firstChild);
  nameEl.value = ''; locEl.value = ''; textEl.value = '';
  setStars(5);
}

// ── NAV ACTIVE HIGHLIGHT ──────────────────────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const links    = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', function() {
  let cur = '';
  sections.forEach(function(s) {
    if (window.scrollY >= s.offsetTop - 80) cur = s.id;
  });
  links.forEach(function(a) {
    a.style.color = a.getAttribute('href') === '#' + cur ? 'var(--yellow)' : '';
  });
}, { passive: true });
