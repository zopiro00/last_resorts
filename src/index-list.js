// Scrolly essay: hovering a highlighted word reveals a cursor-following image
// preview. Everything is mockup — the preview box just shows the word's label.

const preview = document.querySelector('.hover-preview');
const words = document.querySelectorAll('.reveal-word');

if (preview && words.length) {
  const imageBox = preview.querySelector('.preview-image');
  let active = false;

  words.forEach(word => {
    word.addEventListener('mouseenter', () => {
      imageBox.textContent = word.dataset.image || 'image';
      preview.classList.add('is-visible');
      active = true;
    });
    word.addEventListener('mouseleave', () => {
      preview.classList.remove('is-visible');
      active = false;
    });
  });

  window.addEventListener('mousemove', event => {
    if (!active) return;
    preview.style.left = `${event.clientX}px`;
    preview.style.top = `${event.clientY}px`;
  });
}

const teamRow = document.querySelector('.team-row');

if (teamRow) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let direction = 1;
  let lastTime = 0;
  let paused = false;
  let resumeTimer;

  const hasOverflow = () => teamRow.scrollWidth > teamRow.clientWidth + 2;

  const pauseBriefly = () => {
    paused = true;
    window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      paused = false;
    }, 1200);
  };

  const drift = time => {
    if (!lastTime) lastTime = time;
    const elapsed = time - lastTime;
    lastTime = time;

    if (!reduceMotion.matches && !paused && hasOverflow()) {
      const maxScroll = teamRow.scrollWidth - teamRow.clientWidth;
      teamRow.scrollLeft += direction * elapsed * 0.018;

      if (teamRow.scrollLeft >= maxScroll - 1) direction = -1;
      if (teamRow.scrollLeft <= 1) direction = 1;
    }

    window.requestAnimationFrame(drift);
  };

  teamRow.addEventListener('wheel', event => {
    if (!hasOverflow()) return;
    event.preventDefault();
    const scrollAmount = Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;

    teamRow.scrollLeft += scrollAmount;
    direction = scrollAmount >= 0 ? 1 : -1;
    pauseBriefly();
  }, { passive: false });

  teamRow.addEventListener('pointerenter', () => {
    paused = true;
  });

  teamRow.addEventListener('pointerleave', () => {
    pauseBriefly();
  });

  window.requestAnimationFrame(drift);
}

// Location figure: clicking a caption swaps which satellite GIF is shown.
const gifDisplay = document.querySelector('.gif-display');
const gifCaptionOptions = document.querySelectorAll('.gif-caption-option');

if (gifDisplay && gifCaptionOptions.length) {
  const selectOption = option => {
    gifDisplay.src = option.dataset.gifSrc;
    gifDisplay.alt = option.dataset.gifAlt;

    gifCaptionOptions.forEach(other => {
      const isActive = other === option;
      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-selected', String(isActive));
    });
  };

  gifCaptionOptions.forEach(option => {
    option.addEventListener('click', () => selectOption(option));
    option.addEventListener('keydown', event => {
      if (event.target !== option) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectOption(option);
      }
    });
  });
}
