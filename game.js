// ゲームの基本設定
const gameState = {
    score: 0,
    health: 100,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    enemies: [],
    bullets: [],
    particleEffects: [],
    isPlaying: false,
    isStarted: false,
    enemySpawnInterval: null,
    totalEnemiesKilled: 0,
    bulletSizeMultiplier: 1,
    maxEnemies: 3,
    totalEnemiesToWin: 10,
    isJumping: false,
    jumpVelocity: 0,
    playerY: 1.6,
    audioContext: null,
    masterVolume: 0.3
};

// オーディオシステムの初期化
function initAudio() {
    try {
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('Audio system initialized');
    } catch (error) {
        console.log('Audio not supported');
    }
}

// プロシージャル音響生成クラス
class SoundGenerator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = gameState.masterVolume;
        this.masterGain.connect(audioContext.destination);
    }

    // 銃声を生成
    createGunshot() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // ノイズ生成
        const bufferSize = this.audioContext.sampleRate * 0.1;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // フィルター
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        
        // ゲイン
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.8, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        source.start(now);
        source.stop(now + 0.1);
    }

    // 敵被弾音を生成
    createHitSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // 短いインパクト音
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.05);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }

    // 敵死亡音を生成
    createDeathSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // 低周波のうなり声
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(80, now);
        oscillator.frequency.linearRampToValueAtTime(40, now + 0.5);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.5);
    }

    // リロード音を生成
    createReloadSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        // カチカチ音
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const oscillator = this.audioContext.createOscillator();
                oscillator.type = 'square';
                oscillator.frequency.value = 300 + i * 100;
                
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
                
                oscillator.connect(gain);
                gain.connect(this.masterGain);
                
                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + 0.05);
            }, i * 200);
        }
    }

    // ジャンプ音を生成
    createJumpSound() {
        if (!this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    }
}

let soundGenerator = null;

// バックグラウンドミュージック生成クラス
class BackgroundMusic {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isPlaying = false;
        this.oscillators = [];
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.1; // BGMは控えめに
        this.masterGain.connect(audioContext.destination);
    }

    // タイトル画面用の不気味な音楽
    playTitleMusic() {
        if (!this.audioContext || this.isPlaying) return;
        
        this.isPlaying = true;
        this.createAmbientDrone();
        this.createEeriemelody();
    }

    // ゲーム中の緊張感のある音楽
    playGameMusic() {
        if (!this.audioContext || this.isPlaying) return;
        
        this.isPlaying = true;
        this.createTenseDrone();
        this.createRandomStingers();
    }

    // 不気味なドローン音
    createAmbientDrone() {
        const oscillator1 = this.audioContext.createOscillator();
        oscillator1.type = 'sawtooth';
        oscillator1.frequency.value = 55; // A1
        
        const oscillator2 = this.audioContext.createOscillator();
        oscillator2.type = 'sine';
        oscillator2.frequency.value = 82.5; // E2
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.3;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        
        oscillator1.connect(filter);
        oscillator2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator1.start();
        oscillator2.start();
        
        this.oscillators.push(oscillator1, oscillator2);
    }

    // 不気味なメロディ
    createEeriemelody() {
        const notes = [220, 246.94, 261.63, 293.66, 329.63]; // A3, B3, C4, D4, E4
        let noteIndex = 0;
        
        const playNote = () => {
            if (!this.isPlaying) return;
            
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'triangle';
            oscillator.frequency.value = notes[noteIndex];
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 2);
            
            noteIndex = (noteIndex + 1) % notes.length;
            
            setTimeout(playNote, 3000 + Math.random() * 2000);
        };
        
        setTimeout(playNote, 1000);
    }

    // 緊張感のあるドローン
    createTenseDrone() {
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sawtooth';
        oscillator.frequency.value = 110; // A2
        
        const lfo = this.audioContext.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.1;
        
        const lfoGain = this.audioContext.createGain();
        lfoGain.gain.value = 20;
        
        lfo.connect(lfoGain);
        lfoGain.connect(oscillator.frequency);
        
        const gain = this.audioContext.createGain();
        gain.gain.value = 0.2;
        
        oscillator.connect(gain);
        gain.connect(this.masterGain);
        
        oscillator.start();
        lfo.start();
        
        this.oscillators.push(oscillator, lfo);
    }

    // ランダムな緊張音
    createRandomStingers() {
        const createStinger = () => {
            if (!this.isPlaying) return;
            
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, this.audioContext.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.3);
            
            setTimeout(createStinger, 5000 + Math.random() * 10000);
        };
        
        setTimeout(createStinger, 2000);
    }

    stop() {
        this.isPlaying = false;
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
            } catch (e) {}
        });
        this.oscillators = [];
    }
}

let backgroundMusic = null;

// 環境音クラス
class AmbientSounds {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isPlaying = false;
        this.sources = [];
        this.masterGain = audioContext.createGain();
        this.masterGain.gain.value = 0.15;
        this.masterGain.connect(audioContext.destination);
    }

    startAmbient() {
        if (!this.audioContext || this.isPlaying) return;
        
        this.isPlaying = true;
        this.createWind();
        this.createRandomCreaks();
        this.createDistantHowls();
    }

    // 風の音
    createWind() {
        const createWindGust = () => {
            if (!this.isPlaying) return;
            
            const bufferSize = this.audioContext.sampleRate * 3;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * 0.1 * Math.sin(i / bufferSize * Math.PI);
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 200;
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 1);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 3);
            
            source.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            source.start();
            
            setTimeout(createWindGust, 8000 + Math.random() * 5000);
        };
        
        createWindGust();
    }

    // きしみ音
    createRandomCreaks() {
        const createCreak = () => {
            if (!this.isPlaying) return;
            
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(150 + Math.random() * 100, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(100 + Math.random() * 50, this.audioContext.currentTime + 0.5);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
            
            oscillator.connect(gain);
            gain.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.5);
            
            setTimeout(createCreak, 15000 + Math.random() * 20000);
        };
        
        setTimeout(createCreak, 5000);
    }

    // 遠くの叫び声
    createDistantHowls() {
        const createHowl = () => {
            if (!this.isPlaying) return;
            
            const oscillator = this.audioContext.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(200, this.audioContext.currentTime + 1);
            oscillator.frequency.linearRampToValueAtTime(400, this.audioContext.currentTime + 2);
            
            const gain = this.audioContext.createGain();
            gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, this.audioContext.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
            
            const filter = this.audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 800;
            
            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 2);
            
            setTimeout(createHowl, 30000 + Math.random() * 30000);
        };
        
        setTimeout(createHowl, 10000);
    }

    stop() {
        this.isPlaying = false;
        this.sources.forEach(source => {
            try {
                source.stop();
            } catch (e) {}
        });
        this.sources = [];
    }
}

let ambientSounds = null;

// Three.jsシーンの設定
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2c1810, 20, 80); // ホラー感のある霧

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// カメラの初期位置は後で地面の高さに合わせて設定

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ホラー感のあるライティング
const ambientLight = new THREE.AmbientLight(0x404040, 0.3); // 暗い環境光
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0x8080ff, 0.5); // 青白い光
directionalLight.position.set(-10, 15, -5);
directionalLight.castShadow = true;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
scene.add(directionalLight);

// 点滅する赤い光（ホラー演出）
const redLight = new THREE.PointLight(0xff0000, 1, 30);
redLight.position.set(0, 10, 0);
scene.add(redLight);

// 赤い光の点滅アニメーション
let redLightIntensity = 0;
setInterval(() => {
    redLightIntensity = Math.random() * 0.8 + 0.2;
    redLight.intensity = redLightIntensity;
}, 200);

// ホラー感のある地面の作成（起伏あり）
const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
const groundTexture = createGroundTexture();
const groundMaterial = new THREE.MeshLambertMaterial({ 
    map: groundTexture,
    color: 0x2a1f1a
});

// 地面の高さマップを保存する配列
const groundHeightMap = [];

// 地面に起伏を追加
const positions = groundGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    // 複数の波を組み合わせて自然な起伏を作成（ランダムノイズを除去）
    const height = 
        Math.sin(x * 0.1) * 0.8 +
        Math.cos(y * 0.15) * 0.6 +
        Math.sin(x * 0.05 + y * 0.08) * 1.2;
    
    positions.setZ(i, height);
    
    // 高さマップに保存（後で高さ計算に使用）
    if (!groundHeightMap[Math.floor(x + 50)]) {
        groundHeightMap[Math.floor(x + 50)] = [];
    }
    groundHeightMap[Math.floor(x + 50)][Math.floor(y + 50)] = height;
}
positions.needsUpdate = true;
groundGeometry.computeVertexNormals(); // 法線を再計算

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// レイキャスターを作成
const raycaster = new THREE.Raycaster();

// 地面の高さを取得する関数（レイキャストベース）
function getGroundHeight(x, z) {
    // レイキャストで地面の高さを取得
    const origin = new THREE.Vector3(x, 50, z); // 十分高い位置から
    const direction = new THREE.Vector3(0, -1, 0); // 下向き
    
    raycaster.set(origin, direction);
    const intersects = raycaster.intersectObject(ground);
    
    if (intersects.length > 0) {
        return intersects[0].point.y;
    }
    
    // レイキャストが失敗した場合は計算式で求める
    const groundSize = 100;
    const worldX = x;
    const worldZ = z;
    
    // 地面生成時と同じ式（ランダムノイズなし）
    return Math.sin(worldX * 0.1) * 0.8 +
           Math.cos(worldZ * 0.15) * 0.6 +
           Math.sin(worldX * 0.05 + worldZ * 0.08) * 1.2;
}

// ホラー感のある空の作成
const skyGeometry = new THREE.SphereGeometry(90, 32, 32);
const skyTexture = createSkyTexture();
const skyMaterial = new THREE.MeshBasicMaterial({ 
    map: skyTexture,
    side: THREE.BackSide 
});
const sky = new THREE.Mesh(skyGeometry, skyMaterial);
scene.add(sky);

// 地面テクスチャを作成
function createGroundTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // 暗い土のベース
    ctx.fillStyle = '#1a0f0a';
    ctx.fillRect(0, 0, 512, 512);
    
    // ランダムなノイズを追加
    for (let i = 0; i < 10000; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 100 + 50}, ${Math.random() * 50 + 20}, ${Math.random() * 30 + 10}, 0.3)`;
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
    }
    
    // 血痕のような汚れを追加
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 50 + 80}, ${Math.random() * 20 + 10}, ${Math.random() * 20 + 10}, 0.6)`;
        ctx.beginPath();
        ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 20 + 5, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
}

// 空テクスチャを作成
function createSkyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a0f0f');
    gradient.addColorStop(1, '#2a1010');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    
    // 不気味な雲
    for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(${Math.random() * 30 + 20}, ${Math.random() * 20 + 10}, ${Math.random() * 20 + 10}, 0.4)`;
        ctx.beginPath();
        ctx.arc(Math.random() * 1024, Math.random() * 300, Math.random() * 80 + 20, 0, Math.PI * 2);
        ctx.fill();
    }
    
    return new THREE.CanvasTexture(canvas);
}

// 障害物の管理
const obstacles = [];
let customModel = null;
let customEnemyModel = null;
let enemyPhotoTexture = null;

// ホラー感のある障害物を作成
function createObstacles() {
    // 墓石風の障害物
    const tombstoneGeometry = new THREE.BoxGeometry(1.5, 2.5, 0.5);
    const tombstoneMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    
    // 木風の障害物
    const treeGeometry = new THREE.CylinderGeometry(0.5, 0.8, 4, 8);
    const treeMaterial = new THREE.MeshLambertMaterial({ color: 0x2a1a0f });
    
    for (let i = 0; i < 15; i++) {
        let obstacle;
        
        if (customModel) {
            // カスタムモデルを使用
            obstacle = customModel.clone();
            
            // モデルのスケール調整
            const box = new THREE.Box3().setFromObject(obstacle);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim; // 高さ約3に正規化
            obstacle.scale.multiplyScalar(scale);
        } else {
            // ランダムに墓石か木を選択
            if (Math.random() > 0.5) {
                obstacle = new THREE.Mesh(tombstoneGeometry, tombstoneMaterial);
            } else {
                obstacle = new THREE.Mesh(treeGeometry, treeMaterial);
            }
        }
        
        obstacle.position.set(
            (Math.random() - 0.5) * 60,
            0,
            (Math.random() - 0.5) * 60
        );
        
        // Y位置の調整
        if (customModel) {
            const box = new THREE.Box3().setFromObject(obstacle);
            const size = box.getSize(new THREE.Vector3());
            obstacle.position.y = size.y / 2;
        } else {
            obstacle.position.y = obstacle.geometry.parameters ? 
                obstacle.geometry.parameters.height / 2 : 1.25;
        }
        
        obstacle.castShadow = true;
        obstacle.receiveShadow = true;
        obstacles.push(obstacle);
        scene.add(obstacle);
    }
    
    // 古い建物の廃墟を追加
    createRuins();
}

// 廃墟を作成
function createRuins() {
    const ruinMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3a2a });
    
    // 壊れた壁
    for (let i = 0; i < 5; i++) {
        const wallGeometry = new THREE.BoxGeometry(
            Math.random() * 3 + 2, 
            Math.random() * 2 + 2, 
            0.5
        );
        const wall = new THREE.Mesh(wallGeometry, ruinMaterial);
        wall.position.set(
            (Math.random() - 0.5) * 50,
            wall.geometry.parameters.height / 2,
            (Math.random() - 0.5) * 50
        );
        wall.rotation.y = Math.random() * Math.PI;
        wall.castShadow = true;
        wall.receiveShadow = true;
        obstacles.push(wall);
        scene.add(wall);
    }
}

// 障害物をクリア
function clearObstacles() {
    obstacles.forEach(obstacle => {
        scene.remove(obstacle);
    });
    obstacles.length = 0;
}

// 銃の作成
const gunGroup = new THREE.Group();
const gunBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.8),
    new THREE.MeshPhongMaterial({ color: 0x333333 })
);
gunBarrel.rotation.x = Math.PI / 2;
gunBarrel.position.set(0.3, -0.2, -0.5);
gunGroup.add(gunBarrel);

const gunHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.3, 0.1),
    new THREE.MeshPhongMaterial({ color: 0x222222 })
);
gunHandle.position.set(0.3, -0.35, -0.3);
gunGroup.add(gunHandle);

camera.add(gunGroup);
scene.add(camera);

// パーティクルエフェクト
class ParticleEffect {
    constructor(position) {
        this.particles = [];
        const particleCount = 10;
        
        for (let i = 0; i < particleCount; i++) {
            const geometry = new THREE.SphereGeometry(0.1);
            const material = new THREE.MeshBasicMaterial({ 
                color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00,
                transparent: true,
                opacity: 1
            });
            const particle = new THREE.Mesh(geometry, material);
            particle.position.copy(position);
            
            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                Math.random() * 0.3,
                (Math.random() - 0.5) * 0.3
            );
            
            this.particles.push({ 
                mesh: particle, 
                material: material, 
                life: 1,
                velocity: velocity
            });
            scene.add(particle);
        }
    }
    
    update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.mesh.position.add(particle.velocity);
            particle.velocity.y -= 0.01;
            particle.life -= 0.02;
            particle.material.opacity = particle.life;
            
            if (particle.life <= 0) {
                scene.remove(particle.mesh);
                this.particles.splice(i, 1);
            }
        }
        
        return this.particles.length === 0;
    }
}

// 敵の作成
class Enemy {
    constructor() {
        if (customEnemyModel) {
            // カスタムモデルを使用
            this.mesh = customEnemyModel.clone();
            
            // モデルのスケール調整
            const box = new THREE.Box3().setFromObject(this.mesh);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim; // 高さ約2に正規化
            this.mesh.scale.multiplyScalar(scale);
            
            // マテリアルを保存（フラッシュエフェクト用）
            this.materials = [];
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // マテリアルが配列の場合とそうでない場合を処理
                    if (Array.isArray(child.material)) {
                        // 複数マテリアルの場合
                        child.material.forEach((mat, index) => {
                            this.materials.push({
                                mesh: child,
                                materialIndex: index,
                                original: mat.clone(),
                                current: mat
                            });
                        });
                    } else {
                        // 単一マテリアルの場合
                        this.materials.push({
                            mesh: child,
                            materialIndex: -1,
                            original: child.material.clone(),
                            current: child.material
                        });
                    }
                }
            });
        } else if (enemyPhotoTexture) {
            // 写真テクスチャを使用した平面敵
            const enemyGroup = new THREE.Group();
            
            // 写真を表示する平面
            const planeGeometry = new THREE.PlaneGeometry(2, 2.5);
            const planeMaterial = new THREE.MeshLambertMaterial({ 
                map: enemyPhotoTexture,
                transparent: true,
                side: THREE.DoubleSide
            });
            const photoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
            photoPlane.position.y = 1.25;
            photoPlane.castShadow = true;
            photoPlane.receiveShadow = true;
            
            // サポート用の細い棒（見た目を良くするため）
            const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2.5);
            const supportMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
            const support = new THREE.Mesh(supportGeometry, supportMaterial);
            support.position.y = 1.25;
            support.position.z = -0.1;
            support.castShadow = true;
            
            enemyGroup.add(photoPlane);
            enemyGroup.add(support);
            
            this.mesh = enemyGroup;
            this.material = planeMaterial;
            this.materials = [
                {
                    mesh: photoPlane,
                    original: planeMaterial.clone(),
                    current: planeMaterial
                }
            ];
        } else {
            // デフォルトの敵モデル（CylinderとSphereを組み合わせて作成）
            const enemyGroup = new THREE.Group();
            
            // 体部分（円柱）
            const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
            this.material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
            const body = new THREE.Mesh(bodyGeometry, this.material);
            body.position.y = 0.75;
            body.castShadow = true;
            
            // 頭部分（球）
            const headGeometry = new THREE.SphereGeometry(0.5, 8, 6);
            const head = new THREE.Mesh(headGeometry, this.material);
            head.position.y = 1.75;
            head.castShadow = true;
            
            enemyGroup.add(body);
            enemyGroup.add(head);
            
            this.mesh = enemyGroup;
            this.mesh.castShadow = true;
            this.materials = [
                {
                    mesh: body,
                    original: this.material.clone(),
                    current: this.material
                },
                {
                    mesh: head,
                    original: this.material.clone(),
                    current: this.material
                }
            ];
        }
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 15 + Math.random() * 20;
        const spawnX = Math.sin(angle) * distance;
        const spawnZ = Math.cos(angle) * distance;
        
        // 地面の高さを取得して適切な高さに配置
        const groundHeight = getGroundHeight(spawnX, spawnZ);
        const groundOffset = 0.05; // 地面からの微小オフセット
        let spawnY;
        
        if (customEnemyModel) {
            // カスタムモデルの場合、後でバウンディングボックスで調整
            spawnY = groundHeight + 1 + groundOffset;
        } else if (enemyPhotoTexture) {
            // 写真敵の場合
            spawnY = groundHeight + 1.25 + groundOffset;
        } else {
            // デフォルト敵の場合
            spawnY = groundHeight + 1 + groundOffset;
        }
        
        this.mesh.position.set(spawnX, spawnY, spawnZ);
        
        this.speed = 0.025 + Math.random() * 0.015; // 速度を半分に減少
        this.health = 5;  // 5発で倒せるように変更
        this.maxHealth = 5;
        this.isFlashing = false;
        this.movementAngle = Math.random() * Math.PI * 2;
        this.movementTime = Math.random() * Math.PI * 2; // ランダムな開始位相
        scene.add(this.mesh);
        
        // カスタムモデルの場合、正確な高さを再設定
        if (customEnemyModel) {
            const box = new THREE.Box3().setFromObject(this.mesh);
            const size = box.getSize(new THREE.Vector3());
            this.mesh.position.y = groundHeight + size.y / 2 + groundOffset;
        }
    }
    
    update() {
        // ジグザグ移動パターン
        this.movementTime += 0.05;
        const zigzag = Math.sin(this.movementTime * 2) * 1.5; // より大きなジグザグ
        
        // プレイヤーへの方向を計算
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, this.mesh.position);
        direction.y = 0;
        direction.normalize();
        
        // 横方向の移動ベクトルを計算
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        perpendicular.normalize();
        
        // 移動速度を計算
        const forwardMovement = direction.multiplyScalar(this.speed);
        const sideMovement = perpendicular.multiplyScalar(zigzag * this.speed * 0.5);
        
        // 位置を更新
        this.mesh.position.add(forwardMovement);
        this.mesh.position.add(sideMovement);
        
        // 地面の高さに合わせて敵の位置を調整
        const groundHeight = getGroundHeight(this.mesh.position.x, this.mesh.position.z);
        const groundOffset = 0.05; // 地面からの微小オフセット
        
        if (customEnemyModel) {
            // カスタムモデルの場合
            const box = new THREE.Box3().setFromObject(this.mesh);
            const size = box.getSize(new THREE.Vector3());
            this.mesh.position.y = groundHeight + size.y / 2 + groundOffset;
        } else if (enemyPhotoTexture) {
            // 写真敵の場合
            this.mesh.position.y = groundHeight + 1.25 + groundOffset; // 平面の半分の高さ
        } else {
            // デフォルト敵の場合
            this.mesh.position.y = groundHeight + 1 + groundOffset; // 敵の中心が地面の高さ + 1
        }
        
        // プレイヤーの方を向く
        const lookTarget = camera.position.clone();
        lookTarget.y = this.mesh.position.y;
        this.mesh.lookAt(lookTarget);
        
        // 写真敵の場合は常にプレイヤーの方を向く（ビルボード効果）
        if (enemyPhotoTexture && !customEnemyModel) {
            // 写真平面をプレイヤーの方向に向ける
            const photoPlane = this.mesh.children.find(child => child.geometry instanceof THREE.PlaneGeometry);
            if (photoPlane) {
                photoPlane.lookAt(camera.position);
            }
        }
        
        // デバッグ用：敵が動いているか確認（削除可能）
        // if (Math.random() < 0.01) {
        //     console.log(`Enemy position: ${this.mesh.position.x.toFixed(2)}, ${this.mesh.position.z.toFixed(2)}, Speed: ${this.speed}`);
        // }
    }
    
    takeDamage(hitPosition) {
        this.health--;
        
        // ダメージフラッシュエフェクト
        if (!this.isFlashing) {
            this.isFlashing = true;
            
            // 全てのマテリアルを白くフラッシュ
            this.materials.forEach(mat => {
                const flashMaterial = new THREE.MeshPhongMaterial({
                    color: 0xffffff,
                    emissive: 0xffff00,
                    emissiveIntensity: 0.5
                });
                
                if (mat.materialIndex >= 0) {
                    // 複数マテリアルの場合
                    if (!Array.isArray(mat.mesh.material)) {
                        mat.mesh.material = [];
                    }
                    mat.mesh.material[mat.materialIndex] = flashMaterial;
                } else {
                    // 単一マテリアルの場合
                    mat.mesh.material = flashMaterial;
                }
            });
            
            setTimeout(() => {
                // 体力に応じた色に変更
                const healthRatio = this.health / this.maxHealth;
                this.materials.forEach(mat => {
                    if (customEnemyModel) {
                        // カスタムモデルの場合は赤いオーバーレイを追加
                        const damagedMaterial = mat.original.clone();
                        if (damagedMaterial.emissive) {
                            damagedMaterial.emissive = new THREE.Color(1 - healthRatio, 0, 0);
                            damagedMaterial.emissiveIntensity = 0.3;
                        }
                        
                        if (mat.materialIndex >= 0) {
                            mat.mesh.material[mat.materialIndex] = damagedMaterial;
                        } else {
                            mat.mesh.material = damagedMaterial;
                        }
                        mat.current = damagedMaterial;
                    } else {
                        // デフォルトモデルの場合
                        const r = 1;
                        const g = healthRatio * 0.3;
                        const b = healthRatio * 0.3;
                        mat.current.color.setRGB(r, g, b);
                        mat.current.emissive = new THREE.Color(0x000000);
                        mat.current.emissiveIntensity = 0;
                        mat.mesh.material = mat.current;
                    }
                });
                this.isFlashing = false;
            }, 100);
        }
        
        // ヒットエフェクトを生成
        const effectPosition = hitPosition || this.mesh.position.clone();
        effectPosition.y += 1;
        const effect = new ParticleEffect(effectPosition);
        gameState.particleEffects.push(effect);
        
        // ヒットマーカー（画面中央に一瞬表示）
        const crosshair = document.getElementById('crosshair');
        crosshair.style.transform = 'translate(-50%, -50%) scale(1.5)';
        crosshair.style.filter = 'brightness(2)';
        setTimeout(() => {
            crosshair.style.transform = 'translate(-50%, -50%) scale(1)';
            crosshair.style.filter = 'brightness(1)';
        }, 100);
        
        if (this.health <= 0) {
            // 死亡時の大爆発エフェクト
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const explosionPos = this.mesh.position.clone();
                    explosionPos.x += (Math.random() - 0.5) * 2;
                    explosionPos.y += Math.random() * 2;
                    explosionPos.z += (Math.random() - 0.5) * 2;
                    const bigEffect = new ParticleEffect(explosionPos);
                    gameState.particleEffects.push(bigEffect);
                }, i * 50);
            }
            scene.remove(this.mesh);
            return true;
        }
        return false;
    }
}

// 弾丸の作成
class Bullet {
    constructor(position, direction) {
        const size = 0.05 * gameState.bulletSizeMultiplier;
        const geometry = new THREE.SphereGeometry(size);
        const material = new THREE.MeshBasicMaterial({ 
            color: gameState.bulletSizeMultiplier > 1 ? 0xff6600 : 0xffff00,
            emissive: gameState.bulletSizeMultiplier > 1 ? 0xff6600 : 0xffff00,
            emissiveIntensity: 0.5
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        this.velocity = direction.multiplyScalar(2);
        this.lifeTime = 60;
        
        scene.add(this.mesh);
    }
    
    update() {
        this.mesh.position.add(this.velocity);
        this.lifeTime--;
        
        if (this.lifeTime <= 0) {
            scene.remove(this.mesh);
            return true;
        }
        return false;
    }
}

// FPSコントロール
const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    jump: false
};

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

// ポインターロック
const pointerLockControls = {
    isLocked: false,
    
    onMouseMove: function(event) {
        if (!this.isLocked) return;
        
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
        
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= movementX * 0.002;
        euler.x -= movementY * 0.002;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        
        camera.quaternion.setFromEuler(euler);
    }
};

// モバイル検出
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// タッチコントロール用の変数
let touchStartX = 0;
let touchStartY = 0;
let isTouchMoving = false;

// モバイルコントロールの初期化
function initMobileControls() {
    if (!isMobile) return;
    
    // モバイルボタンを表示
    document.getElementById('mobileControls').style.display = 'block';
    document.getElementById('touchMoveArea').style.display = 'block';
    
    // 射撃ボタン
    const shootButton = document.getElementById('shootButton');
    shootButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        shoot();
    });
    
    // ジャンプボタン
    const jumpButton = document.getElementById('jumpButton');
    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameState.isJumping) {
            controls.jump = true;
            gameState.isJumping = true;
            gameState.jumpVelocity = 0.45;
            if (soundGenerator) {
                soundGenerator.createJumpSound();
            }
        }
    });
    
    // リロードボタン
    const reloadButton = document.getElementById('reloadButton');
    reloadButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        reload();
    });
    
    // タッチ移動コントロール
    initTouchMoveControls();
}

// タッチ移動コントロール
function initTouchMoveControls() {
    const moveStick = document.getElementById('moveStick');
    const moveStickKnob = document.getElementById('moveStickKnob');
    const stickRadius = 75;
    let stickActive = false;
    
    moveStick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        stickActive = true;
        const touch = e.touches[0];
        const rect = moveStick.getBoundingClientRect();
        updateStickPosition(touch.clientX - rect.left - stickRadius, touch.clientY - rect.top - stickRadius);
    });
    
    moveStick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!stickActive) return;
        const touch = e.touches[0];
        const rect = moveStick.getBoundingClientRect();
        updateStickPosition(touch.clientX - rect.left - stickRadius, touch.clientY - rect.top - stickRadius);
    });
    
    moveStick.addEventListener('touchend', (e) => {
        e.preventDefault();
        stickActive = false;
        moveStickKnob.style.transform = 'translate(-50%, -50%)';
        controls.moveForward = false;
        controls.moveBackward = false;
        controls.moveLeft = false;
        controls.moveRight = false;
    });
    
    function updateStickPosition(x, y) {
        const distance = Math.sqrt(x * x + y * y);
        const maxDistance = stickRadius - 30;
        
        if (distance > maxDistance) {
            x = (x / distance) * maxDistance;
            y = (y / distance) * maxDistance;
        }
        
        moveStickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
        
        // 移動方向を設定
        const threshold = 20;
        controls.moveForward = y < -threshold;
        controls.moveBackward = y > threshold;
        controls.moveLeft = x < -threshold;
        controls.moveRight = x > threshold;
    }
}

// タッチで視点移動
function initTouchCameraControls() {
    let touchX = null;
    let touchY = null;
    
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchX = e.touches[0].pageX;
            touchY = e.touches[0].pageY;
            isTouchMoving = true;
        }
    });
    
    renderer.domElement.addEventListener('touchmove', (e) => {
        if (!isTouchMoving || !gameState.isPlaying || e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const deltaX = e.touches[0].pageX - touchX;
        const deltaY = e.touches[0].pageY - touchY;
        
        touchX = e.touches[0].pageX;
        touchY = e.touches[0].pageY;
        
        // カメラ回転（スワイプで視点移動）
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= deltaX * 0.005;
        euler.x -= deltaY * 0.005;
        euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));
        camera.quaternion.setFromEuler(euler);
    });
    
    renderer.domElement.addEventListener('touchend', () => {
        isTouchMoving = false;
    });
}

// イベントリスナー
document.addEventListener('click', (event) => {
    // モバイルの場合はポインターロックを使わない
    if (isMobile) return;
    
    // UIクリックは無視
    if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || 
        event.target.tagName === 'LABEL' || event.target.closest('#startScreen') ||
        event.target.closest('#gameOverScreen') || event.target.closest('#modelLoader')) {
        return;
    }
    
    // スタート画面が表示されている場合は無視
    if (document.getElementById('startScreen').style.display !== 'none') {
        return;
    }
    
    if (!pointerLockControls.isLocked && gameState.isStarted) {
        renderer.domElement.requestPointerLock();
    }
});

document.addEventListener('pointerlockchange', () => {
    pointerLockControls.isLocked = !!document.pointerLockElement;
    
    // モバイルの場合は常にプレイ可能
    if (isMobile) {
        gameState.isPlaying = gameState.isStarted;
    } else {
        gameState.isPlaying = pointerLockControls.isLocked;
    }
    
    if (gameState.isPlaying) {
        document.getElementById('instructions').style.display = 'none';
    }
});

document.addEventListener('mousemove', (event) => {
    pointerLockControls.onMouseMove(event);
});

document.addEventListener('mousedown', (event) => {
    if (event.button === 0 && pointerLockControls.isLocked) {
        shoot();
    }
});

document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'KeyW': controls.moveForward = true; break;
        case 'KeyA': controls.moveLeft = true; break;
        case 'KeyS': controls.moveBackward = true; break;
        case 'KeyD': controls.moveRight = true; break;
        case 'KeyR': reload(); break;
        case 'Space': 
            event.preventDefault();
            if (!gameState.isJumping) {
                controls.jump = true;
                gameState.isJumping = true;
                gameState.jumpVelocity = 0.45; // ジャンプの初速度を1.5倍に増加
                
                // ジャンプ音再生
                if (soundGenerator) {
                    soundGenerator.createJumpSound();
                }
            }
            break;
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'KeyW': controls.moveForward = false; break;
        case 'KeyA': controls.moveLeft = false; break;
        case 'KeyS': controls.moveBackward = false; break;
        case 'KeyD': controls.moveRight = false; break;
        case 'Space': controls.jump = false; break;
    }
});

// 射撃機能
function shoot() {
    if (gameState.ammo <= 0 || gameState.isReloading) return;
    
    gameState.ammo--;
    updateUI();
    
    // 銃声再生
    if (soundGenerator) {
        soundGenerator.createGunshot();
    }
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const bulletPosition = camera.position.clone();
    bulletPosition.add(direction.clone().multiplyScalar(0.5));
    
    const bullet = new Bullet(bulletPosition, direction);
    gameState.bullets.push(bullet);
    
    // 銃の反動アニメーション
    gunGroup.rotation.x -= 0.1;
    setTimeout(() => {
        gunGroup.rotation.x += 0.1;
    }, 100);
}

// リロード機能
function reload() {
    if (gameState.isReloading || gameState.ammo === gameState.maxAmmo) return;
    
    gameState.isReloading = true;
    
    // リロード音再生
    if (soundGenerator) {
        soundGenerator.createReloadSound();
    }
    
    setTimeout(() => {
        gameState.ammo = gameState.maxAmmo;
        gameState.isReloading = false;
        updateUI();
    }, 2000);
}

// 衝突検出
function checkCollisions() {
    // 弾丸と敵の衝突
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
            
            if (distance < 1) {
                const enemyKilled = enemy.takeDamage(bullet.mesh.position);
                
                // 被弾音再生
                if (soundGenerator) {
                    if (enemyKilled) {
                        soundGenerator.createDeathSound();
                    } else {
                        soundGenerator.createHitSound();
                    }
                }
                
                if (enemyKilled) {
                    gameState.enemies.splice(j, 1);
                    gameState.score += 100;
                    gameState.totalEnemiesKilled++;
                    
                    // 3体倒したら弾を大きくする
                    if (gameState.totalEnemiesKilled === 3) {
                        gameState.bulletSizeMultiplier = 2;
                        showPowerUpMessage();
                    }
                    
                    // 10体倒したらゲームクリア
                    if (gameState.totalEnemiesKilled >= gameState.totalEnemiesToWin) {
                        gameClear();
                    }
                    
                    updateUI();
                }
                scene.remove(bullet.mesh);
                gameState.bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // 敵とプレイヤーの衝突
    for (const enemy of gameState.enemies) {
        const distance = enemy.mesh.position.distanceTo(camera.position);
        
        if (distance < 1.5) {
            gameState.health = Math.max(0, gameState.health - 1);
            updateUI();
            
            if (gameState.health <= 0) {
                gameOver();
                break;
            }
        }
    }
}

// UI更新
function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    
    const healthElement = document.getElementById('health');
    healthElement.textContent = gameState.health;
    healthElement.className = 'ui-value ' + 
        (gameState.health > 60 ? 'ui-progress' : 
         gameState.health > 30 ? 'ui-warning' : 'ui-danger');
    
    const ammoElement = document.getElementById('ammo');
    ammoElement.textContent = gameState.ammo;
    ammoElement.className = 'ui-value ' + 
        (gameState.ammo > 10 ? 'ui-progress' : 
         gameState.ammo > 5 ? 'ui-warning' : 'ui-danger');
    
    document.getElementById('enemiesKilled').textContent = gameState.totalEnemiesKilled;
    document.getElementById('enemiesRemaining').textContent = gameState.totalEnemiesToWin - gameState.totalEnemiesKilled;
    
    // レーダーを更新
    updateRadar();
}

// レーダー更新機能
function updateRadar() {
    if (!gameState.isPlaying) return;
    
    const radar = document.getElementById('radar');
    const radarRadius = 70; // レーダーの半径（ピクセル）
    const worldRadius = 40; // レーダーが表示する世界の半径
    
    // 既存の敵ドットをクリア
    const existingDots = radar.querySelectorAll('.radar-enemy');
    existingDots.forEach(dot => dot.remove());
    
    // 各敵の位置をレーダーに表示
    gameState.enemies.forEach(enemy => {
        const playerPos = camera.position;
        const enemyPos = enemy.mesh.position;
        
        // プレイヤーからの相対位置を計算
        const dx = enemyPos.x - playerPos.x;
        const dz = enemyPos.z - playerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // レーダー範囲内の場合のみ表示
        if (distance <= worldRadius) {
            // レーダー座標に変換
            const radarX = (dx / worldRadius) * radarRadius;
            const radarZ = (dz / worldRadius) * radarRadius;
            
            // 敵ドットを作成
            const dot = document.createElement('div');
            dot.className = 'radar-enemy';
            dot.style.left = `calc(50% + ${radarX}px - 2px)`;
            dot.style.top = `calc(50% + ${radarZ}px - 2px)`;
            
            // 距離に応じて色を変更（近いほど明るく）
            const intensity = Math.max(0.3, 1 - (distance / worldRadius));
            dot.style.background = `rgba(255, 0, 0, ${intensity})`;
            dot.style.boxShadow = `0 0 6px rgba(255, 0, 0, ${intensity})`;
            
            radar.appendChild(dot);
        }
    });
}

// パワーアップメッセージ
function showPowerUpMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 100, 0, 0.9);
        color: white;
        padding: 20px 40px;
        border-radius: 10px;
        font-size: 24px;
        font-weight: bold;
        z-index: 1000;
        border: 3px solid #ff6600;
        box-shadow: 0 0 20px rgba(255, 100, 0, 0.5);
    `;
    message.textContent = 'パワーアップ！弾が大きくなりました！';
    document.body.appendChild(message);
    
    setTimeout(() => {
        document.body.removeChild(message);
    }, 3000);
}

// ゲームクリア
function gameClear() {
    try {
        gameState.isPlaying = false;
        gameState.isStarted = false;
        
        // モバイルの場合はポインターロックを使わない
        if (!isMobile) {
            document.exitPointerLock();
        }
        
        // レーダーを非表示
        const radar = document.getElementById('radar');
        if (radar) radar.style.display = 'none';
        
        // モバイルコントロールを非表示
        if (isMobile) {
            document.getElementById('mobileControls').style.display = 'none';
            document.getElementById('touchMoveArea').style.display = 'none';
        }
        
        // ランキングに記録を保存
        saveScore(gameState.score, true);
        
        // ゲームクリア画面を表示
        const finalScore = document.getElementById('finalScore');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const gameOverTitle = document.querySelector('#gameOverContent h2');
        
        if (finalScore) finalScore.textContent = gameState.score;
        if (gameOverScreen) {
            gameOverScreen.style.display = 'flex';
            gameOverScreen.style.zIndex = '9999'; // 最前面に表示
        }
        if (gameOverTitle) {
            gameOverTitle.textContent = 'ゲームクリア！';
            gameOverTitle.style.color = '#4CAF50';
        }
        
        // 敵を停止
        clearEnemies();
        clearBullets();
        clearParticleEffects();
        
        // 敵のスポーンを停止
        if (gameState.enemySpawnInterval) {
            clearInterval(gameState.enemySpawnInterval);
            gameState.enemySpawnInterval = null;
        }
        
        // 3秒後にタイトル画面へ自動遷移（モバイル対応）
        setTimeout(() => {
            returnToTitle();
        }, 3000);
    } catch (error) {
        console.error('Game clear error:', error);
        // エラー時も強制的にタイトルへ
        setTimeout(() => {
            returnToTitle();
        }, 1000);
    }
}

// ゲームオーバー
function gameOver() {
    try {
        gameState.isPlaying = false;
        gameState.isStarted = false;
        
        // モバイルの場合はポインターロックを使わない
        if (!isMobile) {
            document.exitPointerLock();
        }
        
        // レーダーを非表示
        const radar = document.getElementById('radar');
        if (radar) radar.style.display = 'none';
        
        // モバイルコントロールを非表示
        if (isMobile) {
            document.getElementById('mobileControls').style.display = 'none';
            document.getElementById('touchMoveArea').style.display = 'none';
        }
        
        // ランキングに記録を保存
        saveScore(gameState.score, false);
        
        // スコアを表示
        const finalScore = document.getElementById('finalScore');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const gameOverTitle = document.querySelector('#gameOverContent h2');
        
        if (finalScore) finalScore.textContent = gameState.score;
        if (gameOverScreen) {
            gameOverScreen.style.display = 'flex';
            gameOverScreen.style.zIndex = '9999'; // 最前面に表示
        }
        if (gameOverTitle) {
            gameOverTitle.textContent = 'ゲームオーバー';
            gameOverTitle.style.color = 'white';
        }
        
        // 敵を停止
        clearEnemies();
        clearBullets();
        clearParticleEffects();
        
        // 敵のスポーンを停止
        if (gameState.enemySpawnInterval) {
            clearInterval(gameState.enemySpawnInterval);
            gameState.enemySpawnInterval = null;
        }
        
        // 3秒後にタイトル画面へ自動遷移（モバイル対応）
        setTimeout(() => {
            returnToTitle();
        }, 3000);
    } catch (error) {
        console.error('Game over error:', error);
        // エラー時も強制的にタイトルへ
        setTimeout(() => {
            returnToTitle();
        }, 1000);
    }
}

// プレイヤーの移動
function updatePlayer() {
    if (!gameState.isPlaying) return;
    
    velocity.x -= velocity.x * 10.0 * 0.016;
    velocity.z -= velocity.z * 10.0 * 0.016;
    
    direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    direction.x = Number(controls.moveLeft) - Number(controls.moveRight); // A/D方向を修正
    direction.normalize();
    
    // 速度を1.5倍に増加
    const speedMultiplier = 1.5;
    if (controls.moveForward || controls.moveBackward) velocity.z -= direction.z * 40.0 * 0.016 * speedMultiplier;
    if (controls.moveLeft || controls.moveRight) velocity.x -= direction.x * 40.0 * 0.016 * speedMultiplier;
    
    const moveVector = new THREE.Vector3(velocity.x * 0.016, 0, velocity.z * 0.016);
    moveVector.applyQuaternion(camera.quaternion);
    
    const newX = camera.position.x + moveVector.x;
    const newZ = camera.position.z + moveVector.z;
    
    // 障害物との衝突判定
    if (!checkCollisionWithObstacles(newX, camera.position.z)) {
        camera.position.x = newX;
    }
    if (!checkCollisionWithObstacles(camera.position.x, newZ)) {
        camera.position.z = newZ;
    }
    
    // 地面の高さを取得
    const groundHeight = getGroundHeight(camera.position.x, camera.position.z);
    const playerHeightAboveGround = 1.6; // プレイヤーの目の高さ
    const groundOffset = 0.1; // 地面からの微小オフセット（めり込み防止）
    const minPlayerY = groundHeight + playerHeightAboveGround + groundOffset;
    
    // ジャンプの処理
    if (gameState.isJumping) {
        gameState.playerY += gameState.jumpVelocity;
        gameState.jumpVelocity -= 0.02; // 重力
        
        // 地面に着地したかチェック
        if (gameState.playerY <= minPlayerY) {
            gameState.playerY = minPlayerY;
            gameState.isJumping = false;
            gameState.jumpVelocity = 0;
        }
    } else {
        // ジャンプしていない場合は地面の高さに合わせる
        if (gameState.playerY > minPlayerY) {
            // 落下中
            gameState.jumpVelocity -= 0.02;
            gameState.playerY += gameState.jumpVelocity;
            if (gameState.playerY <= minPlayerY) {
                gameState.playerY = minPlayerY;
                gameState.jumpVelocity = 0;
            }
        } else {
            // 地面より下にいる場合は地面の高さに調整
            gameState.playerY = minPlayerY;
        }
    }
    
    camera.position.y = gameState.playerY;
    
    // 境界制限
    camera.position.x = Math.max(-45, Math.min(45, camera.position.x));
    camera.position.z = Math.max(-45, Math.min(45, camera.position.z));
}

// 障害物との衝突判定
function checkCollisionWithObstacles(x, z) {
    const playerRadius = 0.5;
    
    for (const obstacle of obstacles) {
        const distance = Math.sqrt(
            Math.pow(x - obstacle.position.x, 2) + 
            Math.pow(z - obstacle.position.z, 2)
        );
        
        const obstacleRadius = obstacle.geometry.parameters ? 
            Math.max(obstacle.geometry.parameters.width || 1, obstacle.geometry.parameters.depth || 1) / 2 : 1;
        
        if (distance < playerRadius + obstacleRadius) {
            return true; // 衝突している
        }
    }
    
    return false; // 衝突していない
}

// 敵をクリア
function clearEnemies() {
    gameState.enemies.forEach(enemy => {
        scene.remove(enemy.mesh);
    });
    gameState.enemies = [];
}

// 弾丸をクリア
function clearBullets() {
    gameState.bullets.forEach(bullet => {
        scene.remove(bullet.mesh);
    });
    gameState.bullets = [];
}

// パーティクルエフェクトをクリア
function clearParticleEffects() {
    gameState.particleEffects.forEach(effect => {
        effect.particles.forEach(particle => {
            scene.remove(particle.mesh);
        });
    });
    gameState.particleEffects = [];
}

// タイトル画面に戻る
function returnToTitle() {
    try {
        // ゲーム状態を完全リセット
        gameState.isPlaying = false;
        gameState.isStarted = false;
        gameState.score = 0;
        gameState.health = 100;
        gameState.ammo = 30;
        gameState.isReloading = false;
        gameState.totalEnemiesKilled = 0;
        gameState.bulletSizeMultiplier = 1;
        gameState.isJumping = false;
        gameState.jumpVelocity = 0;
        
        // 全てのゲームオブジェクトをクリア
        clearEnemies();
        clearBullets();
        clearParticleEffects();
        
        // インターバルをクリア
        if (gameState.enemySpawnInterval) {
            clearInterval(gameState.enemySpawnInterval);
            gameState.enemySpawnInterval = null;
        }
        
        // 音楽を停止
        if (backgroundMusic) {
            backgroundMusic.stop();
        }
        if (ambientSounds) {
            ambientSounds.stop();
        }
        
        // カメラ位置をリセット
        const initialGroundHeight = getGroundHeight(0, 0);
        const groundOffset = 0.1;
        gameState.playerY = initialGroundHeight + 1.6 + groundOffset;
        camera.position.set(0, gameState.playerY, 0);
        camera.rotation.set(0, 0, 0);
        
        // UIを非表示
        document.getElementById('gameOverScreen').style.display = 'none';
        document.getElementById('radar').style.display = 'none';
        if (isMobile) {
            document.getElementById('mobileControls').style.display = 'none';
            document.getElementById('touchMoveArea').style.display = 'none';
        }
        
        // タイトル画面を表示
        document.getElementById('startScreen').style.display = 'flex';
        
        // タイトル音楽を再生
        if (backgroundMusic) {
            setTimeout(() => {
                backgroundMusic.playTitleMusic();
            }, 100);
        }
        
        // ランキングを更新
        updateRankingDisplay();
        
    } catch (error) {
        console.error('Return to title error:', error);
        // 強制的にリロード
        location.reload();
    }
}

// ゲームをリスタート
function restartGame() {
    // ゲームオーバー画面を非表示
    document.getElementById('gameOverScreen').style.display = 'none';
    
    // ゲーム状態をリセット
    gameState.score = 0;
    gameState.health = 100;
    gameState.ammo = gameState.maxAmmo;
    gameState.isReloading = false;
    gameState.isStarted = true;
    gameState.totalEnemiesKilled = 0;
    gameState.bulletSizeMultiplier = 1;
    gameState.gameStartTime = Date.now(); // ゲーム開始時間をリセット
    gameState.isJumping = false;
    gameState.jumpVelocity = 0;
    
    // ゲームオーバー表示をリセット
    document.querySelector('#gameOverContent h2').textContent = 'ゲームオーバー';
    document.querySelector('#gameOverContent h2').style.color = 'white';
    
    // UI更新
    updateUI();
    
    // プレイヤー位置をリセット（地面の高さに合わせる）
    const initialGroundHeight = getGroundHeight(0, 0);
    const groundOffset = 0.1; // 地面からの微小オフセット
    gameState.playerY = initialGroundHeight + 1.6 + groundOffset;
    camera.position.set(0, gameState.playerY, 0);
    camera.rotation.set(0, 0, 0);
    
    // 既存のオブジェクトをクリア
    clearEnemies();
    clearBullets();
    clearParticleEffects();
    
    // 初期敵を配置
    for (let i = 0; i < gameState.maxEnemies; i++) {
        gameState.enemies.push(new Enemy());
    }
    
    // 操作説明を表示（モバイルは即座にプレイ）
    if (isMobile) {
        gameState.isPlaying = true;
        document.getElementById('radar').style.display = 'block';
        document.getElementById('mobileControls').style.display = 'block';
        document.getElementById('touchMoveArea').style.display = 'block';
    } else {
        document.getElementById('instructions').style.display = 'block';
    }
}

// ゲーム開始前の敵モデル読み込み
function loadStartEnemyModel() {
    const fileInput = document.getElementById('startEnemyModel');
    const file = fileInput.files[0];
    
    if (!file) return Promise.resolve();
    
    const fileName = file.name.toLowerCase();
    const fileURL = URL.createObjectURL(file);
    
    document.getElementById('startModelStatus').textContent = '敵モデルを読み込み中...';
    
    let loader;
    
    if (fileName.endsWith('.fbx')) {
        loader = new THREE.FBXLoader();
    } else if (fileName.endsWith('.obj')) {
        loader = new THREE.OBJLoader();
    } else if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
        loader = new THREE.GLTFLoader();
    } else {
        document.getElementById('startModelStatus').textContent = 'サポートされていないファイル形式です';
        return Promise.reject();
    }
    
    return new Promise((resolve, reject) => {
        loader.load(
            fileURL,
            (result) => {
                const model = result.scene || result;
                
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                customEnemyModel = model;
                document.getElementById('startModelStatus').textContent = '敵モデルの読み込みに成功しました！';
                URL.revokeObjectURL(fileURL);
                resolve();
            },
            (progress) => {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    document.getElementById('startModelStatus').textContent = `読み込み中... ${percent}%`;
                }
            },
            (error) => {
                console.error('モデル読み込みエラー:', error);
                document.getElementById('startModelStatus').textContent = '敵モデルの読み込みに失敗しました';
                URL.revokeObjectURL(fileURL);
                reject(error);
            }
        );
    });
}

// ゲーム開始前の敵写真読み込み
function loadStartEnemyPhoto() {
    const fileInput = document.getElementById('startEnemyPhoto');
    const file = fileInput.files[0];
    
    if (!file) return Promise.resolve();
    
    document.getElementById('startModelStatus').textContent = '写真を読み込み中...';
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // Three.jsテクスチャを作成
                const texture = new THREE.Texture(img);
                texture.needsUpdate = true;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                
                enemyPhotoTexture = texture;
                document.getElementById('startModelStatus').textContent = '写真の読み込みに成功しました！';
                resolve();
            };
            img.onerror = function() {
                document.getElementById('startModelStatus').textContent = '写真の読み込みに失敗しました';
                reject(new Error('Image loading failed'));
            };
            img.src = e.target.result;
        };
        reader.onerror = function() {
            document.getElementById('startModelStatus').textContent = '写真ファイルの読み込みに失敗しました';
            reject(new Error('File reading failed'));
        };
        reader.readAsDataURL(file);
    });
}

// ゲーム開始
async function startGame() {
    const startButton = document.getElementById('startButton');
    startButton.disabled = true;
    startButton.textContent = '準備中...';
    
    // オーディオシステムの初期化
    if (!gameState.audioContext) {
        initAudio();
        if (gameState.audioContext) {
            soundGenerator = new SoundGenerator(gameState.audioContext);
            backgroundMusic = new BackgroundMusic(gameState.audioContext);
            ambientSounds = new AmbientSounds(gameState.audioContext);
            
            // 保存された音量設定を適用
            if (soundGenerator && soundGenerator.masterGain) {
                soundGenerator.masterGain.gain.value = gameState.masterVolume;
            }
            if (backgroundMusic && backgroundMusic.masterGain) {
                backgroundMusic.masterGain.gain.value = gameState.masterVolume * 0.3;
            }
            if (ambientSounds && ambientSounds.masterGain) {
                ambientSounds.masterGain.gain.value = gameState.masterVolume * 0.5;
            }
        }
    }
    
    // タイトル音楽を停止
    if (backgroundMusic) {
        backgroundMusic.stop();
    }
    
    try {
        // 敵タイプの選択を確認
        const enemyTypeModel = document.getElementById('enemyTypeModel').checked;
        const enemyTypePhoto = document.getElementById('enemyTypePhoto').checked;
        
        // 前回の敵設定をクリア
        customEnemyModel = null;
        enemyPhotoTexture = null;
        
        if (enemyTypeModel) {
            // 3Dモデルが選択されている場合
            await loadStartEnemyModel();
        } else if (enemyTypePhoto) {
            // 写真が選択されている場合
            await loadStartEnemyPhoto();
        }
    } catch (error) {
        console.log('カスタムモデル/写真の読み込みに失敗しました。デフォルトモデルを使用します。');
    }
    
    // スタート画面を非表示
    document.getElementById('startScreen').style.display = 'none';
    
    // ゲーム状態を開始
    gameState.isStarted = true;
    gameState.gameStartTime = Date.now(); // ゲーム開始時間を記録
    
    // モバイルの場合は即座にプレイ可能に
    if (isMobile) {
        gameState.isPlaying = true;
        initMobileControls();
        initTouchCameraControls();
    }
    
    // ゲーム中の音楽と環境音を開始
    if (backgroundMusic) {
        backgroundMusic.playGameMusic();
    }
    if (ambientSounds) {
        ambientSounds.startAmbient();
    }
    
    // 操作説明を表示（PCのみ）
    if (!isMobile) {
        document.getElementById('instructions').style.display = 'block';
    }
    
    // レーダーを表示
    document.getElementById('radar').style.display = 'block';
    
    // モバイルコントロールを表示
    if (isMobile) {
        document.getElementById('mobileControls').style.display = 'block';
        document.getElementById('touchMoveArea').style.display = 'block';
    }
    
    // 初期敵を配置
    for (let i = 0; i < gameState.maxEnemies; i++) {
        gameState.enemies.push(new Enemy());
    }
    
    // 敵のスポーンを開始
    if (gameState.enemySpawnInterval) {
        clearInterval(gameState.enemySpawnInterval);
    }
    gameState.enemySpawnInterval = setInterval(() => {
        if (gameState.isPlaying && gameState.enemies.length < gameState.maxEnemies && 
            gameState.totalEnemiesKilled < gameState.totalEnemiesToWin) {
            gameState.enemies.push(new Enemy());
        }
    }, 3000);
}

// 初期化
function init() {
    createObstacles();
    
    // プレイヤーの初期位置を地面の高さに合わせて設定
    const initialGroundHeight = getGroundHeight(0, 0);
    const groundOffset = 0.1; // 地面からの微小オフセット
    gameState.playerY = initialGroundHeight + 1.6 + groundOffset;
    camera.position.set(0, gameState.playerY, 0);
    
    // 敵の配置はゲーム開始時に行うように変更
}

// アニメーションループ
function animate() {
    requestAnimationFrame(animate);
    
    updatePlayer();
    
    // 敵の更新
    for (const enemy of gameState.enemies) {
        enemy.update();
    }
    
    // 弾丸の更新
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        if (gameState.bullets[i].update()) {
            gameState.bullets.splice(i, 1);
        }
    }
    
    // パーティクルエフェクトの更新
    for (let i = gameState.particleEffects.length - 1; i >= 0; i--) {
        if (gameState.particleEffects[i].update()) {
            gameState.particleEffects.splice(i, 1);
        }
    }
    
    checkCollisions();
    
    renderer.render(scene, camera);
}

// ウィンドウリサイズ対応
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// モデルローダー機能
function loadCustomModel() {
    const fileInput = document.getElementById('modelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        updateModelStatus('ファイルを選択してください', 'error');
        return;
    }
    
    const fileName = file.name.toLowerCase();
    const fileURL = URL.createObjectURL(file);
    
    updateModelStatus('モデルを読み込み中...', 'loading');
    
    let loader;
    
    if (fileName.endsWith('.fbx')) {
        loader = new THREE.FBXLoader();
    } else if (fileName.endsWith('.obj')) {
        loader = new THREE.OBJLoader();
    } else if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
        loader = new THREE.GLTFLoader();
    } else {
        updateModelStatus('サポートされていないファイル形式です', 'error');
        return;
    }
    
    loader.load(
        fileURL,
        (result) => {
            // GLTFの場合はsceneプロパティから取得
            const model = result.scene || result;
            
            // モデルの準備
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            customModel = model;
            
            // 既存の障害物をクリアして新しいモデルで再作成
            clearObstacles();
            createObstacles();
            
            updateModelStatus('モデルの読み込みに成功しました！', 'success');
            
            // メモリリークを防ぐためURLを解放
            URL.revokeObjectURL(fileURL);
        },
        (progress) => {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                updateModelStatus(`読み込み中... ${percent}%`, 'loading');
            }
        },
        (error) => {
            console.error('モデル読み込みエラー:', error);
            updateModelStatus('モデルの読み込みに失敗しました', 'error');
            URL.revokeObjectURL(fileURL);
        }
    );
}

// 敵モデルを読み込む
function loadCustomEnemyModel() {
    const fileInput = document.getElementById('enemyModelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        updateModelStatus('ファイルを選択してください', 'error');
        return;
    }
    
    const fileName = file.name.toLowerCase();
    const fileURL = URL.createObjectURL(file);
    
    updateModelStatus('敵モデルを読み込み中...', 'loading');
    
    let loader;
    
    if (fileName.endsWith('.fbx')) {
        loader = new THREE.FBXLoader();
    } else if (fileName.endsWith('.obj')) {
        loader = new THREE.OBJLoader();
    } else if (fileName.endsWith('.gltf') || fileName.endsWith('.glb')) {
        loader = new THREE.GLTFLoader();
    } else {
        updateModelStatus('サポートされていないファイル形式です', 'error');
        return;
    }
    
    loader.load(
        fileURL,
        (result) => {
            // GLTFの場合はsceneプロパティから取得
            const model = result.scene || result;
            
            // モデルの準備
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            customEnemyModel = model;
            
            updateModelStatus('敵モデルの読み込みに成功しました！', 'success');
            
            // メモリリークを防ぐためURLを解放
            URL.revokeObjectURL(fileURL);
        },
        (progress) => {
            if (progress.total > 0) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                updateModelStatus(`読み込み中... ${percent}%`, 'loading');
            }
        },
        (error) => {
            console.error('モデル読み込みエラー:', error);
            updateModelStatus('敵モデルの読み込みに失敗しました', 'error');
            URL.revokeObjectURL(fileURL);
        }
    );
}

// デフォルトに戻す
function resetToDefault() {
    customModel = null;
    customEnemyModel = null;
    enemyPhotoTexture = null;
    clearObstacles();
    createObstacles();
    updateModelStatus('全てデフォルトモデルに戻しました', 'success');
    
    // ファイル入力をクリア
    document.getElementById('modelFile').value = '';
    document.getElementById('enemyModelFile').value = '';
    
    // スタート画面の設定もリセット
    if (document.getElementById('startEnemyModel')) {
        document.getElementById('startEnemyModel').value = '';
    }
    if (document.getElementById('startEnemyPhoto')) {
        document.getElementById('startEnemyPhoto').value = '';
    }
    if (document.getElementById('enemyTypeModel')) {
        document.getElementById('enemyTypeModel').checked = true;
    }
    if (document.getElementById('enemyTypePhoto')) {
        document.getElementById('enemyTypePhoto').checked = false;
    }
}

// ステータス表示を更新
function updateModelStatus(message, type) {
    const statusElement = document.getElementById('modelStatus');
    statusElement.textContent = message;
    
    switch(type) {
        case 'error':
            statusElement.style.color = '#ff6666';
            break;
        case 'success':
            statusElement.style.color = '#66ff66';
            break;
        case 'loading':
            statusElement.style.color = '#ffff66';
            break;
        default:
            statusElement.style.color = '#ffffff';
    }
}

// ランキングシステム
function saveScore(score, isCleared) {
    try {
        const now = new Date();
        const record = {
            score: score,
            cleared: isCleared,
            date: now.toLocaleDateString('ja-JP'),
            time: now.toLocaleTimeString('ja-JP'),
            playTime: getPlayTime()
        };
        
        // ローカルランキングに保存
        let rankings = JSON.parse(localStorage.getItem('horrorFpsRankings') || '[]');
        rankings.push(record);
        rankings.sort((a, b) => b.score - a.score);
        rankings = rankings.slice(0, 10); // トップ10まで保存
        
        localStorage.setItem('horrorFpsRankings', JSON.stringify(rankings));
        
        // グローバルランキングにも保存（プレイヤー名入力があれば）
        try {
            const playerName = document.getElementById('playerName')?.value?.trim();
            if (isFirebaseAvailable && (playerName || score > 500)) { // 高スコアなら自動的にグローバルに保存
                const finalPlayerName = playerName || `Player${Math.floor(Math.random() * 1000)}`;
                saveGlobalScore(score, isCleared, finalPlayerName);
            }
        } catch (firebaseError) {
            console.log('Firebase save failed, continuing with local save:', firebaseError);
        }
        
        updateRankingDisplay();
    } catch (error) {
        console.error('Score save error:', error);
    }
}

function getPlayTime() {
    // 簡易的なプレイ時間計算（実際のゲーム開始からの時間）
    if (gameState.gameStartTime) {
        const playTimeMs = Date.now() - gameState.gameStartTime;
        const minutes = Math.floor(playTimeMs / 60000);
        const seconds = Math.floor((playTimeMs % 60000) / 1000);
        return `${minutes}分${seconds}秒`;
    }
    return '0分0秒';
}

function updateRankingDisplay(customRankings = null, isGlobal = false) {
    console.log('updateRankingDisplay called with:', { customRankings, isGlobal });
    try {
        const globalRankingEl = document.getElementById('globalRanking');
        const isGlobalSelected = (globalRankingEl && globalRankingEl.checked) || isGlobal;
        console.log('Global selected:', isGlobalSelected);
        let rankings;
        
        if (customRankings) {
            rankings = customRankings;
        } else if (isGlobalSelected) {
            // グローバルランキングを非同期で読み込み
            if (typeof loadGlobalRankings === 'function') {
                loadGlobalRankings().then(globalRankings => {
                    updateRankingDisplay(globalRankings, true);
                }).catch(error => {
                    console.log('Global ranking load failed:', error);
                    updateRankingDisplay([], true);
                });
            }
            return;
        } else {
            rankings = JSON.parse(localStorage.getItem('gameRankings') || '[]');
        }
        
        const rankingList = document.getElementById('rankingList');
        if (!rankingList) {
            console.log('Ranking list element not found');
            return;
        }
        
        if (rankings.length === 0) {
            rankingList.innerHTML = `<div style="color: #ccc;">${isGlobalSelected ? 'グローバルランキングがありません' : 'まだ記録がありません'}</div>`;
            return;
        }
    
    // ランキングの色とアイコンを取得する関数
    function getRankingStyle(index, record) {
        switch(index) {
            case 0: // 1位 - 金
                return {
                    color: '#FFD700',
                    background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 215, 0, 0.1))',
                    border: '2px solid #FFD700',
                    icon: '👑',
                    shadow: '0 0 15px rgba(255, 215, 0, 0.5)'
                };
            case 1: // 2位 - 銀
                return {
                    color: '#C0C0C0',
                    background: 'linear-gradient(135deg, rgba(192, 192, 192, 0.3), rgba(192, 192, 192, 0.1))',
                    border: '2px solid #C0C0C0',
                    icon: '🥈',
                    shadow: '0 0 15px rgba(192, 192, 192, 0.5)'
                };
            case 2: // 3位 - 銅
                return {
                    color: '#CD7F32',
                    background: 'linear-gradient(135deg, rgba(205, 127, 50, 0.3), rgba(205, 127, 50, 0.1))',
                    border: '2px solid #CD7F32',
                    icon: '🥉',
                    shadow: '0 0 15px rgba(205, 127, 50, 0.5)'
                };
            default: // 4位以下
                return {
                    color: record.cleared ? '#4CAF50' : '#ff6666',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    icon: '',
                    shadow: 'none'
                };
        }
    }
    
        rankingList.innerHTML = rankings.map((record, index) => {
            const style = getRankingStyle(index, record);
            return `
            <div style="
                margin-bottom: 10px; 
                padding: 12px; 
                background: ${style.background}; 
                border-radius: 8px;
                border: ${style.border};
                box-shadow: ${style.shadow};
                transition: transform 0.2s;
            " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                <div style="
                    font-weight: bold; 
                    color: ${style.color};
                    font-size: ${index < 3 ? '16px' : '14px'};
                    text-shadow: ${index < 3 ? '0 0 5px currentColor' : 'none'};
                ">
                    ${style.icon} ${index + 1}位: ${record.score || 0}点 ${record.cleared ? '【クリア】' : '【失敗】'}
                    ${isGlobalSelected && record.playerName ? ` - ${record.playerName}` : ''}
                </div>
                <div style="font-size: 12px; color: #ccc; margin-top: 4px;">
                    ${record.date || '不明'} ${record.time || '不明'} (プレイ時間: ${record.playTime || '不明'})
                </div>
            </div>
        `;
        }).join('');
    } catch (error) {
        console.error('Ranking display error:', error);
        const rankingList = document.getElementById('rankingList');
        if (rankingList) {
            rankingList.innerHTML = '<div style="color: #ff6666;">ランキング表示エラー</div>';
        }
    }
}

function clearRanking() {
    if (confirm('ランキングをクリアしますか？')) {
        localStorage.removeItem('horrorFpsRankings');
        updateRankingDisplay();
    }
}

// 音量設定の読み込み
function loadVolumeSettings() {
    const savedVolume = localStorage.getItem('nightmareFrontierVolume');
    if (savedVolume !== null) {
        const volume = parseInt(savedVolume);
        gameState.masterVolume = volume / 100;
        document.getElementById('volumeSlider').value = volume;
        document.getElementById('volumeValue').textContent = volume + '%';
    }
}

// 音量調整機能
function updateVolume(value) {
    gameState.masterVolume = value / 100;
    document.getElementById('volumeValue').textContent = value + '%';
    
    // ローカルストレージに保存
    localStorage.setItem('nightmareFrontierVolume', value);
    
    // 既存のオーディオオブジェクトの音量を更新
    if (soundGenerator && soundGenerator.masterGain) {
        soundGenerator.masterGain.gain.value = gameState.masterVolume;
    }
    if (backgroundMusic && backgroundMusic.masterGain) {
        backgroundMusic.masterGain.gain.value = gameState.masterVolume * 0.3; // BGMは控えめ
    }
    if (ambientSounds && ambientSounds.masterGain) {
        ambientSounds.masterGain.gain.value = gameState.masterVolume * 0.5; // 環境音も控えめ
    }
}

// ゲーム開始時間を記録
gameState.gameStartTime = null;

// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyD9XJK7vK5dT9q3C1EH8mN2rP4sW6vY8zA",
    authDomain: "nightmare-frontier-game.firebaseapp.com",
    projectId: "nightmare-frontier-game",
    storageBucket: "nightmare-frontier-game.appspot.com",
    messagingSenderId: "471825936170",
    appId: "1:471825936170:web:8a2e3f4c5d6e7f8g9h0i1j2k"
};

// Firebase初期化
let db = null;
let isFirebaseAvailable = false;

function initFirebase() {
    // Firebase無効化 - ローカルベースのグローバルランキングを使用
    console.log('Using local-based global ranking system');
    isFirebaseAvailable = false;
    db = null;
}

// シミュレートされたグローバルランキング管理
async function saveGlobalScore(score, isCleared, playerName) {
    // ローカルストレージベースのグローバルランキング
    try {
        const globalRankings = JSON.parse(localStorage.getItem('simulatedGlobalRankings') || '[]');
        
        const now = new Date();
        const newScore = {
            score: score,
            cleared: isCleared,
            playerName: playerName || 'Anonymous',
            date: now.toLocaleDateString('ja-JP'),
            time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
            playTime: getPlayTime(),
            timestamp: Date.now()
        };
        
        globalRankings.push(newScore);
        globalRankings.sort((a, b) => b.score - a.score);
        
        // 上位50位まで保持
        if (globalRankings.length > 50) {
            globalRankings.splice(50);
        }
        
        localStorage.setItem('simulatedGlobalRankings', JSON.stringify(globalRankings));
        console.log('Simulated global score saved successfully');
        
        // グローバルランキングを更新
        if (typeof refreshGlobalRanking === 'function') {
            refreshGlobalRanking();
        }
    } catch (error) {
        console.error('Error saving simulated global score:', error);
    }
}

async function loadGlobalRankings() {
    if (!isFirebaseAvailable || !db) {
        // デモ用グローバルランキング
        return getDemoGlobalRankings();
    }
    
    try {
        const snapshot = await db.collection('rankings')
            .orderBy('score', 'desc')
            .limit(10)
            .get();
        
        const rankings = [];
        snapshot.forEach(doc => {
            rankings.push(doc.data());
        });
        
        return rankings;
    } catch (error) {
        console.error('Error loading global rankings:', error);
        // エラー時もデモランキングを表示
        return getDemoGlobalRankings();
    }
}

// シミュレートされたグローバルランキング取得
function getDemoGlobalRankings() {
    // まずシミュレートされたグローバルランキングを取得
    const simulatedGlobal = JSON.parse(localStorage.getItem('simulatedGlobalRankings') || '[]');
    
    // デモデータ（初回用）
    const demoRankings = [
        { score: 1250, playerName: "TopPlayer", cleared: true, date: "2024-12-13", time: "15:30", playTime: "3:45" },
        { score: 980, playerName: "SnipeKing", cleared: true, date: "2024-12-13", time: "14:20", playTime: "4:12" },
        { score: 875, playerName: "Hunter99", cleared: false, date: "2024-12-13", time: "13:45", playTime: "2:38" },
        { score: 720, playerName: "GameMaster", cleared: true, date: "2024-12-12", time: "20:15", playTime: "5:22" },
        { score: 650, playerName: "Shooter", cleared: false, date: "2024-12-12", time: "19:30", playTime: "3:10" }
    ];
    
    // ローカルスコアも追加
    const localScores = JSON.parse(localStorage.getItem('gameRankings') || '[]');
    
    // 全てを統合
    const allScores = [...simulatedGlobal, ...demoRankings, ...localScores];
    
    // 重複除去とソート
    const uniqueScores = allScores.reduce((acc, current) => {
        const existing = acc.find(item => 
            item.score === current.score && 
            item.playerName === current.playerName &&
            item.date === current.date &&
            item.time === current.time
        );
        if (!existing) {
            acc.push(current);
        }
        return acc;
    }, []);
    
    return uniqueScores.sort((a, b) => b.score - a.score).slice(0, 10);
}

async function refreshGlobalRanking() {
    console.log('Refreshing global ranking...');
    try {
        const rankings = await loadGlobalRankings();
        console.log('Loaded rankings:', rankings);
        updateRankingDisplay(rankings, true);
        
        console.log('Successfully updated global ranking display');
    } catch (error) {
        console.error('Error refreshing global ranking:', error);
        alert('グローバルランキングの取得に失敗しました: ' + error.message);
    }
}

// ゲーム開始
init();
animate();

// 初期ランキング表示と音量設定の読み込み
updateRankingDisplay();
loadVolumeSettings();

// タイトル画面でのオーディオ初期化（ユーザーインタラクション後）
document.addEventListener('click', function initAudioOnFirstClick() {
    if (!gameState.audioContext) {
        initAudio();
        if (gameState.audioContext) {
            soundGenerator = new SoundGenerator(gameState.audioContext);
            backgroundMusic = new BackgroundMusic(gameState.audioContext);
            ambientSounds = new AmbientSounds(gameState.audioContext);
            
            // 保存された音量設定を適用
            if (soundGenerator && soundGenerator.masterGain) {
                soundGenerator.masterGain.gain.value = gameState.masterVolume;
            }
            if (backgroundMusic && backgroundMusic.masterGain) {
                backgroundMusic.masterGain.gain.value = gameState.masterVolume * 0.3;
            }
            if (ambientSounds && ambientSounds.masterGain) {
                ambientSounds.masterGain.gain.value = gameState.masterVolume * 0.5;
            }
            
            // タイトル音楽を開始
            if (backgroundMusic && document.getElementById('startScreen').style.display !== 'none') {
                backgroundMusic.playTitleMusic();
            }
        }
        document.removeEventListener('click', initAudioOnFirstClick);
    }
});