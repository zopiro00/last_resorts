import './styles.css';
import {
  CanvasTexture,
  Color,
  Data3DTexture,
  HalfFloatType,
  LinearFilter,
  LinearMipMapLinearFilter,
  NearestFilter,
  NoColorSpace,
  NoToneMapping,
  PerspectiveCamera,
  RedFormat,
  RepeatWrapping,
  Scene,
  TextureLoader,
  Uniform,
  Vector3,
  WebGLRenderer
} from 'three';
import {
  BlendFunction,
  Effect,
  EffectComposer,
  EffectPass,
  NormalPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode
} from 'postprocessing';
import {
  AerialPerspectiveEffect,
  getSunDirectionECEF,
  PrecomputedTexturesLoader
} from '@takram/three-atmosphere';
import {
  CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  CLOUD_SHAPE_TEXTURE_SIZE,
  CloudsEffect
} from '@takram/three-clouds';
import {
  DataTextureLoader,
  Ellipsoid,
  Geodetic,
  parseUint8Array,
  radians
} from '@takram/three-geospatial';

import localWeatherUrl from '../node_modules/@takram/three-clouds/assets/local_weather.png?url';
import shapeUrl from '../node_modules/@takram/three-clouds/assets/shape.bin?url';
import shapeDetailUrl from '../node_modules/@takram/three-clouds/assets/shape_detail.bin?url';
import turbulenceUrl from '../node_modules/@takram/three-clouds/assets/turbulence.png?url';

const canvas = document.querySelector('#three');
const asciiCanvas = document.querySelector('#ascii');
const asciiCtx = asciiCanvas.getContext('2d', { alpha: true });

class GroundASCIIEffect extends Effect {
  constructor() {
    const fragmentShader = `
      uniform sampler2D uCharacters;
      uniform vec3 uColor;
      uniform float uCellSize;
      uniform float uThreshold;
      uniform float uContrast;
      uniform float uInvert;
      uniform float uHorizon;
      uniform float uReflect;
      uniform float uTime;

      float luminanceOf(vec3 color) {
        return dot(color, vec3(0.2126, 0.7152, 0.0722));
      }

      float glyph(vec2 uv, vec2 cellCount) {
        vec2 charUv = fract(uv * cellCount);
        return texture2D(uCharacters, charUv).r;
      }

      vec3 referenceGrade(vec3 color) {
        float gray = luminanceOf(color);
        gray = (gray - 0.5) * 1.74 + 0.5;
        gray *= 0.62;
        return vec3(clamp(gray, 0.0, 1.0));
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 base = referenceGrade(inputColor.rgb);
        float screenY = 1.0 - gl_FragCoord.y / resolution.y;
        float lowerBand = smoothstep(0.56, 0.60, screenY) * (1.0 - smoothstep(0.93, 0.97, screenY));
        if (lowerBand <= 0.0) {
          outputColor = vec4(base, inputColor.a);
          return;
        }

        // Inside the ASCII band, fade the photo down to a near-black canvas
        // so the glyphs read like the reference video.
        vec3 canvas = mix(base, base * 0.05, lowerBand);

        vec2 cellCount = resolution / uCellSize;
        vec2 cellSize = 1.0 / cellCount;
        vec2 cellUv = cellSize * (0.5 + floor(uv / cellSize));

        // The water/foreground below the horizon is flat, so it carries no
        // cloud-shadow detail. Instead sample the CLOUD region above the
        // horizon (mirrored downward) so the moving cloud shadows drive the
        // glyphs — the band reads like a reflection of the sky.
        vec2 sampleUv = vec2(
          cellUv.x,
          clamp(uHorizon + (uHorizon - cellUv.y) * uReflect, 0.0, 1.0)
        );
        // inputBuffer is now the finished cloud image (this is its own pass),
        // so we can read the real cloud luminance at the reflected point.
        float lum = luminanceOf(texture2D(inputBuffer, sampleUv).rgb);

        // Hard on/off cutoff: glyphs stay at full strength where it is dark and
        // disappear where it is lighter. uContrast controls how sharp the edge
        // is (high = almost binary), uThreshold sets where dark/light splits.
        float v = clamp((lum - uThreshold) * uContrast + 0.5, 0.0, 1.0);
        // uInvert = 1 -> glyphs stay on the DARK pixels, 0 -> on the light pixels.
        float keep = mix(v, 1.0 - v, uInvert);
        keep = smoothstep(0.4, 0.6, keep);

        float mask = lowerBand * keep;
        if (mask <= 0.05) {
          outputColor = vec4(canvas, inputColor.a);
          return;
        }

        // glyph is full strength wherever it is kept (no fading by tone).
        float shimmer = 0.85 + 0.15 * sin(uTime * 3.0 + cellUv.x * 90.0 + cellUv.y * 130.0);
        float mark = glyph(uv, cellCount) * shimmer;
        outputColor = vec4(canvas + uColor * mark * mask * 1.7, inputColor.a);
      }
    `;

    super('GroundASCIIEffect', fragmentShader, {
      blendFunction: BlendFunction.SRC,
      uniforms: new Map([
        ['uCharacters', new Uniform(createCharacterTexture('⟡'))],
        ['uColor', new Uniform(new Color('#AEE700'))],
        ['uCellSize', new Uniform(13.0)],
        ['uThreshold', new Uniform(0.42)],
        ['uContrast', new Uniform(12.0)],
        ['uInvert', new Uniform(1.0)],
        ['uHorizon', new Uniform(0.44)],
        ['uReflect', new Uniform(1.3)],
        ['uTime', new Uniform(0)]
      ])
    });
  }

  update(renderer, inputBuffer, deltaTime) {
    this.uniforms.get('uTime').value += deltaTime;
  }
}

function createCharacterTexture(character) {
  const size = 128;
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = size;
  textureCanvas.height = size;
  const ctx = textureCanvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#fff';
  ctx.shadowBlur = 6;
  ctx.font = '700 88px "IBM Plex Mono", "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(character, size / 2, size / 2 + 2);

  const texture = new CanvasTexture(textureCanvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

const renderer = new WebGLRenderer({
  canvas,
  depth: false,
  antialias: false,
  logarithmicDepthBuffer: false,
  preserveDrawingBuffer: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.toneMapping = NoToneMapping;
renderer.toneMappingExposure = 10;

const scene = new Scene();
// Wider FOV -> more sky in frame, clouds read as more distant (the "25% zoom" look).
const camera = new PerspectiveCamera(95, 1, 10, 1e6);

const geodetic = new Geodetic(radians(30), radians(67), 500);
const position = geodetic.toECEF();
const east = new Vector3();
const north = new Vector3();
const up = new Vector3();
Ellipsoid.WGS84.getEastNorthUpVectors(position, east, north, up);

camera.position.copy(position);
camera.up.copy(up);
camera.lookAt(
  position
    .clone()
    .add(north.clone().multiplyScalar(16000))
    .add(up.clone().multiplyScalar(1350))
);

const aerialPerspective = new AerialPerspectiveEffect(camera);
aerialPerspective.sky = true;
aerialPerspective.sunLight = true;
aerialPerspective.skyLight = true;

const clouds = new CloudsEffect(camera, { resolutionScale: 0.62 });
clouds.coverage = 0.3;
clouds.qualityPreset = 'medium';
clouds.temporalUpscale = true;
clouds.lightShafts = false;
clouds.localWeatherVelocity.set(0.00045, 0.00008);
clouds.shapeVelocity.set(0.000018, 0, 0.000006);

const sunDirection = new Vector3();
getSunDirectionECEF(new Date('2000-06-01T10:00:00Z'), sunDirection);
aerialPerspective.sunDirection.copy(sunDirection);
clouds.sunDirection.copy(sunDirection);
clouds.shadow.maxFar = 1e5;
clouds.events.addEventListener('change', event => {
  switch (event.property) {
    case 'atmosphereOverlay':
      aerialPerspective.overlay = clouds.atmosphereOverlay;
      break;
    case 'atmosphereShadow':
      aerialPerspective.shadow = clouds.atmosphereShadow;
      break;
    case 'atmosphereShadowLength':
      aerialPerspective.shadowLength = clouds.atmosphereShadowLength;
      break;
    default:
  }
});

clouds.cloudLayers.set([
  {
    channel: 'r',
    altitude: 1000,
    height: 1000,
    shapeAmount: 0.8,
    weatherExponent: 0.6,
    shadow: true
  },
  {
    channel: 'g',
    altitude: 2000,
    height: 800,
    shapeAmount: 0.8,
    shapeAlteringBias: 0.5,
    densityScale: 0.1
  },
  {
    channel: 'b',
    altitude: 2000,
    height: 2000,
    densityScale: 2e-3,
    shapeAmount: 0.3
  },
  {
    channel: 'a',
    height: 300,
    densityScale: 0.05,
    shapeAmount: 0.2,
    shapeDetailAmount: 0,
    shapeAlteringBias: 0.5,
    coverageFilterWidth: 1,
    densityProfile: {
      expTerm: 1,
      exponent: 1e-3,
      constantTerm: 0,
      linearTerm: 0
    }
  }
]);

const composer = new EffectComposer(renderer, {
  frameBufferType: HalfFloatType,
  multisampling: 0
});
const normalPass = new NormalPass(scene, camera);
const groundASCIIEffect = new GroundASCIIEffect();
aerialPerspective.normalBuffer = normalPass.texture;
composer.addPass(new RenderPass(scene, camera));
composer.addPass(normalPass);
composer.addPass(
  new EffectPass(
    camera,
    clouds,
    aerialPerspective,
    new ToneMappingEffect({ mode: ToneMappingMode.AGX })
  )
);
// Separate pass so the ASCII effect's inputBuffer is the finished cloud image
// and it can sample the moving clouds at any coordinate.
composer.addPass(new EffectPass(camera, groundASCIIEffect));

new PrecomputedTexturesLoader({ format: 'binary' })
  .setType(renderer)
  .load(`${import.meta.env.BASE_URL}atmosphere`, textures => {
    Object.assign(aerialPerspective, textures);
    Object.assign(clouds, textures);
  });

const textureLoader = new TextureLoader();
textureLoader.load(localWeatherUrl, texture => {
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  clouds.localWeatherTexture = texture;
});
textureLoader.load(turbulenceUrl, texture => {
  texture.minFilter = LinearMipMapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  clouds.turbulenceTexture = texture;
});

new DataTextureLoader(Data3DTexture, parseUint8Array, {
  width: CLOUD_SHAPE_TEXTURE_SIZE,
  height: CLOUD_SHAPE_TEXTURE_SIZE,
  depth: CLOUD_SHAPE_TEXTURE_SIZE
}).load(shapeUrl, texture => {
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  clouds.shapeTexture = texture;
});

new DataTextureLoader(Data3DTexture, parseUint8Array, {
  width: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  height: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE,
  depth: CLOUD_SHAPE_DETAIL_TEXTURE_SIZE
}).load(shapeDetailUrl, texture => {
  texture.format = RedFormat;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.wrapR = RepeatWrapping;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  clouds.shapeDetailTexture = texture;
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);

  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  asciiCanvas.width = Math.floor(width * pixelRatio);
  asciiCanvas.height = Math.floor(height * pixelRatio);
  asciiCanvas.style.width = `${width}px`;
  asciiCanvas.style.height = `${height}px`;
  asciiCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

let previousTime = performance.now();
function animate(time) {
  const delta = Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  clouds.localWeatherOffset.x += delta * 0.0015;
  clouds.shapeOffset.x += delta * 0.00002;
  composer.render(delta);
  asciiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  requestAnimationFrame(animate);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(animate);
