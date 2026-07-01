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

const mapCloudField = document.querySelector('.map-cloud-field');
const mapCloudCanvas = document.querySelector('.map-cloud-canvas');

if (mapCloudField && mapCloudCanvas) {
  const context = mapCloudCanvas.getContext('2d');
  const sourceImage = mapCloudField.querySelector('.essay-image');
  const mapPopupBase = `${import.meta.env.BASE_URL}map-popups/`;
  const mapPopupVersion = '20260701-map-popups-edited';
  const mapPhotoSources = [
    'DSC00028 (1).jpeg',
    'IMG_6472.jpeg',
    'IMG_6376.jpeg',
    'IMG_6347.jpeg',
    'IMG_6342.jpeg',
    '021ab0bf-e517-42b3-89f1-79a6cafbfff5.jpeg',
    'cab5f357-df02-4781-ab3f-807c98c51c7a.jpeg',
    'IMG_6170.jpeg',
    'IMG_6151.jpeg',
    'IMG_6113.jpeg',
    'IMG_6087.jpeg',
    'IMG_6056.jpeg',
    'IMG_6048.jpeg',
    'IMG_5214.jpg',
    'IMG_5185.jpg',
    'IMG_5170 (2).jpg',
    'IMG_8076.jpeg',
    'IMG_8741 (1).jpeg',
    'IMG_8044.jpeg',
    'IMG_8037.jpeg',
    'IMG_7993.jpeg',
    'IMG_7873.jpeg',
    'IMG_3131.JPG',
    'DSC00080.jpeg',
    'DSC00074 (1).jpeg',
    'DSC00056 (1).jpeg',
    'IMG_6326.HEIC'
  ].map(fileName => `${mapPopupBase}${encodeURIComponent(fileName)}?v=${mapPopupVersion}`);
  const photoPreview = document.createElement('div');
  const photoPreviewImage = document.createElement('img');
  const pointer = { x: 0, y: 0, active: false };
  const points = [];
  const loadedPhotoSources = new Set();
  const availablePhotoSources = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let lastFrame = 0;
  let ready = false;
  let activePhotoSource = '';

  const random = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  photoPreview.className = 'map-photo-preview';
  photoPreviewImage.alt = '';
  photoPreview.appendChild(photoPreviewImage);
  mapCloudField.appendChild(photoPreview);

  mapPhotoSources.forEach(source => {
    const image = new Image();
    image.onload = () => {
      loadedPhotoSources.add(source);
      if (!availablePhotoSources.includes(source)) {
        availablePhotoSources.push(source);
        buildImagePoints();
      }
    };
    image.src = source;
  });

  const buildImagePoints = () => {
    const photoSources = availablePhotoSources.length ? availablePhotoSources : mapPhotoSources;
    if (!sourceImage?.complete || !sourceImage.naturalWidth || !width || !height || !photoSources.length) return;

    points.length = 0;

    const spiralStep = Math.PI * (3 - Math.sqrt(5));

    photoSources.forEach((source, index) => {
      const progress = (index + 0.5) / photoSources.length;
      const angle = index * spiralStep;
      const radius = Math.sqrt(progress) * 0.42;
      const baseX = width * (0.5 + Math.cos(angle) * radius);
      const baseY = height * (0.52 + Math.sin(angle) * radius * 0.72);

      points.push({
        x: baseX + random(-0.7, 0.7),
        y: baseY + random(-0.7, 0.7),
        baseX,
        baseY,
        vx: 0,
        vy: 0,
        size: random(2.1, 3.2),
        hoverRadius: random(38, 54),
        phase: random(0, Math.PI * 2) + index * 0.37,
        color: 'rgba(255, 255, 255, 0.48)',
        featured: true,
        photoSource: source
      });
    });
    ready = true;
  };

  const resizeCloudCanvas = () => {
    const rect = mapCloudField.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    mapCloudCanvas.width = Math.round(width * pixelRatio);
    mapCloudCanvas.height = Math.round(height * pixelRatio);
    mapCloudCanvas.style.width = `${width}px`;
    mapCloudCanvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    buildImagePoints();
  };

  const updatePointer = event => {
    const rect = mapCloudField.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
  };

  mapCloudField.addEventListener('pointermove', updatePointer);
  mapCloudField.addEventListener('pointerenter', updatePointer);
  mapCloudField.addEventListener('pointerleave', () => {
    pointer.active = false;
    activePhotoSource = '';
    photoPreview.classList.remove('is-visible');
  });

  const drawClouds = time => {
    if (!lastFrame) lastFrame = time;
    const elapsed = Math.min(32, time - lastFrame);
    lastFrame = time;

    context.clearRect(0, 0, width, height);

    if (!ready) {
      window.requestAnimationFrame(drawClouds);
      return;
    }

    let closestPhotoPoint = null;
    let closestPhotoDistance = Infinity;

    points.forEach(point => {
      const vibrationX = Math.cos(time * 0.006 + point.phase) * 1.15;
      const vibrationY = Math.sin(time * 0.007 + point.phase) * 1.15;

      if (pointer.active) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const radius = Math.min(width, height) * 0.18;

        if (distance < radius && distance > 0.001) {
          const force = (1 - distance / radius) ** 2;
          point.vx += (dx / distance) * force * 0.55;
          point.vy += (dy / distance) * force * 0.55;
        }
      }

      point.vx += (point.baseX - point.x) * 0.012;
      point.vy += (point.baseY - point.y) * 0.012;
      point.vx *= 0.86;
      point.vy *= 0.86;
      point.x += point.vx * elapsed;
      point.y += point.vy * elapsed;

      const drawX = point.x + vibrationX;
      const drawY = point.y + vibrationY;
      const radius = point.size + Math.sin(time * 0.005 + point.phase) * 0.35;
      context.fillStyle = point.color;
      context.beginPath();
      context.arc(drawX, drawY, radius, 0, Math.PI * 2);
      context.fill();

      if (point.featured) {
        context.strokeStyle = 'rgba(255, 255, 255, 0.38)';
        context.lineWidth = 1;
        context.beginPath();
        context.arc(drawX, drawY, radius + 1.8, 0, Math.PI * 2);
        context.stroke();

        if (pointer.active) {
          const photoDistance = Math.hypot(pointer.x - point.baseX, pointer.y - point.baseY);
          if (photoDistance < closestPhotoDistance) {
            closestPhotoDistance = photoDistance;
            closestPhotoPoint = point;
          }
        }
      }
    });

    if (closestPhotoPoint && closestPhotoDistance < closestPhotoPoint.hoverRadius) {
      if (activePhotoSource !== closestPhotoPoint.photoSource) {
        activePhotoSource = closestPhotoPoint.photoSource;
        photoPreviewImage.src = activePhotoSource;
      }

      const previewWidth = photoPreview.offsetWidth || 260;
      const previewHeight = photoPreview.offsetHeight || 180;
      const previewX = clamp(closestPhotoPoint.baseX, previewWidth / 2 + 12, width - previewWidth / 2 - 12);
      const previewY = clamp(closestPhotoPoint.baseY - 18, previewHeight + 12, height - 12);

      photoPreview.style.left = `${previewX}px`;
      photoPreview.style.top = `${previewY}px`;
      photoPreview.classList.toggle('is-visible', loadedPhotoSources.has(activePhotoSource));
    } else {
      activePhotoSource = '';
      photoPreview.classList.remove('is-visible');
    }

    window.requestAnimationFrame(drawClouds);
  };

  resizeCloudCanvas();
  if (!sourceImage.complete) sourceImage.addEventListener('load', resizeCloudCanvas, { once: true });
  window.addEventListener('resize', resizeCloudCanvas);
  window.requestAnimationFrame(drawClouds);
}
