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
  const mapPhotoSources = [
    'dsc00028-1.jpg',
    'img-6472.jpg',
    'img-6376.jpg',
    'img-6347.jpg',
    'img-6342.jpg',
    '021ab0bf-e517-42b3-89f1-79a6cafbfff5.jpg',
    'cab5f357-df02-4781-ab3f-807c98c51c7a.jpg',
    'img-6170.jpg',
    'img-6151.jpg',
    'img-6113.jpg',
    'img-6087.jpg',
    'img-6056.jpg',
    'img-6048.jpg',
    'img-5214.jpg',
    'img-5185.jpg',
    'img-5170-2.jpg',
    'img-8076.jpg',
    'img-8741-1.jpg',
    'img-8044.jpg',
    'img-8037.jpg',
    'img-7993.jpg',
    'img-7873.jpg',
    'img-3131.jpg',
    'dsc00080.jpg',
    'dsc00074-1.jpg',
    'dsc00056-1.jpg',
    'img-6326.jpg'
  ].map(fileName => `${mapPopupBase}${fileName}`);
  const photoPreview = document.createElement('div');
  const photoPreviewImage = document.createElement('img');
  const pointer = { x: 0, y: 0, active: false };
  const points = [];
  const loadedPhotoSources = new Set();
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
    image.onload = () => loadedPhotoSources.add(source);
    image.src = source;
  });

  const assignPhotoPoints = () => {
    const usedPoints = new Set();
    const spiralStep = Math.PI * (3 - Math.sqrt(5));

    mapPhotoSources.forEach((source, index) => {
      const progress = (index + 0.5) / mapPhotoSources.length;
      const angle = index * spiralStep;
      const radius = Math.sqrt(progress) * 0.42;
      const targetX = width * (0.5 + Math.cos(angle) * radius);
      const targetY = height * (0.52 + Math.sin(angle) * radius * 0.72);
      let closestPoint = null;
      let closestDistance = Infinity;

      points.forEach(point => {
        if (usedPoints.has(point)) return;

        const distance = Math.hypot(point.baseX - targetX, point.baseY - targetY);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPoint = point;
        }
      });

      if (!closestPoint) return;

      usedPoints.add(closestPoint);
      closestPoint.featured = true;
      closestPoint.photoSource = source;
      closestPoint.size = Math.max(closestPoint.size * random(3.2, 4.6), random(3.2, 5.2));
      closestPoint.hoverRadius = random(34, 48);
      closestPoint.phase += index * 0.37;
    });
  };

  const buildImagePoints = () => {
    if (!sourceImage?.complete || !sourceImage.naturalWidth || !width || !height) return;

    const sampleCanvas = document.createElement('canvas');
    const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });
    const sampleWidth = 620;
    const sampleHeight = Math.max(1, Math.round(sampleWidth * height / width));
    sampleCanvas.width = sampleWidth;
    sampleCanvas.height = sampleHeight;
    sampleContext.drawImage(sourceImage, 0, 0, sampleWidth, sampleHeight);

    const imageData = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    const step = Math.max(1, Math.round(sampleWidth / 360));
    points.length = 0;

    for (let y = 0; y < sampleHeight; y += step) {
      for (let x = 0; x < sampleWidth; x += step) {
        const index = (y * sampleWidth + x) * 4;
        const red = imageData[index];
        const green = imageData[index + 1];
        const blue = imageData[index + 2];
        const alpha = imageData[index + 3] / 255;
        const brightness = (red + green + blue) / 3;
        const darkness = 1 - brightness / 255;

        if (alpha < 0.2 || darkness < 0.006) continue;

        const baseX = x / sampleWidth * width;
        const baseY = y / sampleHeight * height;
        points.push({
          x: baseX + random(-0.7, 0.7),
          y: baseY + random(-0.7, 0.7),
          baseX,
          baseY,
          vx: 0,
          vy: 0,
          size: random(0.52, 1.08) + darkness * 1.08,
          phase: random(0, Math.PI * 2),
          color: `rgba(${Math.round(red * 0.44)}, ${Math.round(green * 0.44)}, ${Math.round(blue * 0.44)}, ${0.58 + darkness * 0.38})`
        });
      }
    }

    assignPhotoPoints();
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
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

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
        context.strokeStyle = 'rgba(255, 255, 255, 0.86)';
        context.lineWidth = 1.4;
        context.beginPath();
        context.arc(drawX, drawY, radius + 2.4, 0, Math.PI * 2);
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
