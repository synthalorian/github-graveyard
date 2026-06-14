import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('app').appendChild(renderer.domElement);

scene.background = new THREE.Color(0x05070a);
scene.fog = new THREE.FogExp2(0x05070a, 0.035);

const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.6);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x8899bb, 0.8);
moonLight.position.set(20, 40, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 0.5;
moonLight.shadow.camera.far = 100;
moonLight.shadow.camera.left = -40;
moonLight.shadow.camera.right = 40;
moonLight.shadow.camera.top = 40;
moonLight.shadow.camera.bottom = -40;
scene.add(moonLight);

const groundGeo = new THREE.PlaneGeometry(120, 120, 64, 64);
const posAttr = groundGeo.attributes.position;
for (let i = 0; i < posAttr.count; i++) {
  const x = posAttr.getX(i);
  const y = posAttr.getY(i);
  const z = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 + (Math.random() - 0.5) * 0.3;
  posAttr.setZ(i, z);
}
groundGeo.computeVertexNormals();
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1f1a, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function createDeadTree(x, z) {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 3 + Math.random() * 2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1.0 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = (3 + Math.random() * 2) / 2;
  trunk.castShadow = true;
  group.add(trunk);
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    const branchGeo = new THREE.CylinderGeometry(0.03, 0.08, 1 + Math.random(), 4);
    const branch = new THREE.Mesh(branchGeo, trunkMat);
    branch.position.y = 1 + Math.random() * 2;
    branch.rotation.z = (Math.random() - 0.5) * 1.5;
    branch.rotation.x = (Math.random() - 0.5) * 1.0;
    branch.castShadow = true;
    group.add(branch);
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

for (let i = 0; i < 15; i++) {
  const x = (Math.random() - 0.5) * 80;
  const z = (Math.random() - 0.5) * 80;
  if (Math.abs(x) > 5 || Math.abs(z) > 5) createDeadTree(x, z);
}

const tombstones = [];
const tombstoneGroup = new THREE.Group();
scene.add(tombstoneGroup);

function createTombstone(repo, x, z) {
  const group = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(1.2, 0.2, 0.8);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.9 });
  const base = new THREE.Mesh(baseGeo, stoneMat);
  base.position.y = 0.1;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const bodyGeo = new THREE.BoxGeometry(1.0, 1.4, 0.6);
  const body = new THREE.Mesh(bodyGeo, stoneMat);
  body.position.y = 0.9;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const topGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.6, 3, 1, false, 0, Math.PI);
  const top = new THREE.Mesh(topGeo, stoneMat);
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  top.position.y = 1.7;
  top.castShadow = true;
  group.add(top);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#888';
  ctx.font = 'bold 32px Georgia';
  ctx.textAlign = 'center';
  const name = repo.name.length > 20 ? repo.name.slice(0, 18) + '..' : repo.name;
  ctx.fillText(name, 256, 80);
  ctx.font = '20px Georgia';
  ctx.fillStyle = '#666';
  const lang = repo.language || 'Unknown';
  ctx.fillText(`Language: ${lang}`, 256, 120);
  const date = new Date(repo.updatedAt).getFullYear();
  ctx.fillText(`Died: ${date}`, 256, 160);
  ctx.fillStyle = '#555';
  ctx.font = '16px Georgia';
  const stars = `Stars: ${repo.stargazerCount}`;
  ctx.fillText(stars, 256, 200);

  const tex = new THREE.CanvasTexture(canvas);
  const plaqueGeo = new THREE.PlaneGeometry(0.9, 0.45);
  const plaqueMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaque.position.set(0, 1.0, 0.31);
  group.add(plaque);

  group.position.set(x, 0, z);
  group.userData = { repo, id: repo.id };
  tombstoneGroup.add(group);
  tombstones.push(group);
}

async function fetchGraveyardRepos() {
  const query = `
    query {
      search(query: "stars:0 pushed:<2023-01-01 sort:updated-asc", type: REPOSITORY, first: 30) {
        edges {
          node {
            ... on Repository {
              id
              name
              owner { login }
              description
              stargazerCount
              language { name }
              updatedAt
              url
            }
          }
        }
      }
    }
  `;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error('GraphQL errors:', json.errors);
    return [];
  }
  return json.data.search.edges.map(e => ({
    ...e.node,
    language: e.node.language?.name,
  }));
}

async function fetchFallbackRepos() {
  const res = await fetch('https://api.github.com/search/repositories?q=stars:0+pushed:<2023-01-01&sort=updated&order=asc&per_page=30');
  const json = await res.json();
  return (json.items || []).map(item => ({
    id: item.id,
    name: item.full_name,
    owner: { login: item.owner.login },
    description: item.description,
    stargazerCount: item.stargazers_count,
    language: item.language,
    updatedAt: item.updated_at,
    url: item.html_url,
  }));
}

async function loadRepos() {
  let repos = [];
  try {
    repos = await fetchGraveyardRepos();
  } catch (e) {
    console.warn('GraphQL failed, falling back to REST', e);
  }
  if (!repos.length) {
    try {
      repos = await fetchFallbackRepos();
    } catch (e) {
      console.error('REST also failed', e);
    }
  }
  if (!repos.length) {
    repos = generateMockRepos();
  }
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  layoutTombstones(repos);
}

function generateMockRepos() {
  const names = [
    'old-php-cms',' abandoned-flask-app',' dead-react-boilerplate',' rust-orphan-lib',
    ' forgotten-go-cli',' stale-node-module',' dusty-java-swing',' legacy-perl-script',
    ' rotting-ruby-gem',' moldy-python-web',' decaying-angular-app',' skeletal-vue-plugin',
    ' crumbling-django-site',' withered-laravel-package',' ghostly-svelte-kit',
  ];
  return names.map((name, i) => ({
    id: i,
    name,
    owner: { login: 'ghost' },
    description: 'A repository long forgotten by time and developers.',
    stargazerCount: 0,
    language: ['PHP','Python','JavaScript','Rust','Go','Java','Ruby','Perl'][i % 8],
    updatedAt: `2020-0${(i % 9) + 1}-15T00:00:00Z`,
    url: `https://github.com/ghost/${name}`,
  }));
}

function layoutTombstones(repos) {
  const rows = Math.ceil(Math.sqrt(repos.length));
  const spacing = 4;
  const offset = (rows * spacing) / 2;
  repos.forEach((repo, i) => {
    const row = Math.floor(i / rows);
    const col = i % rows;
    const x = col * spacing - offset + (Math.random() - 0.5) * 0.5;
    const z = row * spacing - offset + (Math.random() - 0.5) * 0.5;
    createTombstone(repo, x, z);
  });
}

camera.position.set(0, 2.5, 12);

const keys = { w: false, a: false, s: false, d: false };
window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (keys.hasOwnProperty(k)) keys[k] = true;
});
window.addEventListener('keyup', e => {
  const k = e.key.toLowerCase();
  if (keys.hasOwnProperty(k)) keys[k] = false;
});

let yaw = 0;
let pitch = 0;
const mouse = new THREE.Vector2();
let isPointerLocked = false;

renderer.domElement.addEventListener('click', () => {
  renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', e => {
  if (!isPointerLocked) return;
  yaw -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));
});

const raycaster = new THREE.Raycaster();
const tooltip = document.getElementById('tooltip');
let hoveredTombstone = null;

window.addEventListener('click', e => {
  if (!isPointerLocked) return;
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(tombstoneGroup.children, true);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj.parent && obj.parent !== tombstoneGroup) obj = obj.parent;
    const repo = obj.userData.repo;
    if (repo) {
      const issueTitle = encodeURIComponent('Resurrection request: breathe new life into this repo');
      const issueBody = encodeURIComponent('This repository was found in the GitHub Graveyard. Let\'s bring it back!');
      window.open(`${repo.url}/issues/new?title=${issueTitle}&body=${issueBody}`, '_blank');
    }
  }
});

function animate() {
  requestAnimationFrame(animate);

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(Math.sin(yaw + Math.PI / 2), 0, Math.cos(yaw + Math.PI / 2));
  const speed = 0.08;
  if (keys.w) camera.position.addScaledVector(forward, speed);
  if (keys.s) camera.position.addScaledVector(forward, -speed);
  if (keys.a) camera.position.addScaledVector(right, -speed);
  if (keys.d) camera.position.addScaledVector(right, speed);
  camera.position.y = 2.5;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;

  if (isPointerLocked) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const hits = raycaster.intersectObjects(tombstoneGroup.children, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj.parent && obj.parent !== tombstoneGroup) obj = obj.parent;
      if (obj.userData.repo) {
        hoveredTombstone = obj;
        const repo = obj.userData.repo;
        tooltip.style.display = 'block';
        tooltip.innerHTML = `
          <div class="repo-name">${repo.name}</div>
          <div class="repo-desc">${repo.description || 'No description'}</div>
          <div class="repo-meta">${repo.language || 'Unknown'} | Stars: ${repo.stargazerCount} | Last push: ${new Date(repo.updatedAt).toLocaleDateString()}</div>
        `;
        tooltip.style.left = (window.innerWidth / 2 + 20) + 'px';
        tooltip.style.top = (window.innerHeight / 2 - 20) + 'px';
      }
    } else {
      hoveredTombstone = null;
      tooltip.style.display = 'none';
    }
  }

  const time = Date.now() * 0.001;
  tombstones.forEach((ts, i) => {
    ts.rotation.y = Math.sin(time * 0.5 + i) * 0.03;
  });

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

loadRepos();
animate();
