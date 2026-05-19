const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
const app = document.getElementById('app');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';

if (isDark) document.documentElement.classList.add('dark');

function render() {
  if (!user) return renderLogin();
  renderDashboard();
}

function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center min-h-screen p-4">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <div class="text-center mb-6">
        <div class="bg-maroon w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3">
          <i class="fa-solid fa-fingerprint text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-maroon dark:text-white">Login Absensi</h1>
      </div>
      <div class="space-y-4">
        <input id="username" placeholder="Username" class="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
        <div class="relative">
          <input id="password" type="password" placeholder="Password" class="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white">
          <i onclick="togglePass()" class="fa-solid fa-eye absolute right-3 top-4 cursor-pointer text-gray-400"></i>
        </div>
        <button onclick="login()" class="w-full bg-maroon hover:bg-maroon-dark text-white p-3 rounded-lg font-bold transition">Masuk</button>
      </div>
    </div>
  </div>`;
}

function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-maroon text-white p-4 flex justify-between items-center shadow-lg">
    <h1 class="font-bold text-lg">Hi, ${user.nama}</h1>
    <div class="flex gap-4 items-center">
      <button onclick="toggleDark()"><i class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'}"></i></button>
      <button onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i></button>
    </div>
  </nav>
  
  <div class="p-4 max-w-2xl mx-auto">
    <div id="statusCard" class="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4 text-center dark:text-white">Loading...</div>
    
    <div class="grid grid-cols-2 gap-4 mb-6">
      <button id="btnIn" onclick="openCamera('IN')" class="bg-green-600 text-white p-6 rounded-xl shadow-lg disabled:bg-gray-400">
        <i class="fa-solid fa-right-to-bracket text-3xl mb-2"></i><br>Absen Masuk
      </button>
      <button id="btnOut" onclick="openCamera('OUT')" class="bg-red-600 text-white p-6 rounded-xl shadow-lg disabled:bg-gray-400">
        <i class="fa-solid fa-right-from-bracket text-3xl mb-2"></i><br>Absen Pulang
      </button>
    </div>
    
    <div class="grid grid-cols-3 gap-3 text-center">
      <button class="bg-blue-600 text-white p-4 rounded-xl"><i class="fa-solid fa-calendar-days"></i><br>Rekap</button>
      <button class="bg-amber-600 text-white p-4 rounded-xl"><i class="fa-solid fa-person-walking"></i><br>Patroli</button>
      <button class="bg-purple-600 text-white p-4 rounded-xl"><i class="fa-solid fa-triangle-exclamation"></i><br>Kejadian</button>
    </div>
  </div>
  
  <!-- Modal Camera -->
  <div id="modalCam" class="fixed inset-0 bg-black/80 hidden items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-md">
      <video id="video" class="w-full rounded-lg" autoplay></video>
      <canvas id="canvas" class="hidden"></canvas>
      <div class="flex gap-2 mt-3">
        <button onclick="capture()" class="flex-1 bg-maroon text-white p-3 rounded-lg">Ambil Foto</button>
        <button onclick="closeCam()" class="bg-gray-500 text-white p-3 rounded-lg">Batal</button>
      </div>
    </div>
  </div>`;
  
  cekStatus();
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const res = await api('login', {username, password});
  if (res.status === 'success') {
    user = res;
    localStorage.setItem('user', JSON.stringify(user));
    render();
  } else {
    alert(res.message);
  }
}

function logout() {
  localStorage.removeItem('user');
  user = null;
  render();
}

function togglePass() {
  const p = document.getElementById('password');
  p.type = p.type === 'password'? 'text' : 'password';
}

function toggleDark() {
  isDark =!isDark;
  localStorage.setItem('dark', isDark);
  document.documentElement.classList.toggle('dark');
  render();
}

async function cekStatus() {
  const s = await api('getStatus', {username: user.username});
  document.getElementById('btnIn').disabled =!s.bisaIn;
  document.getElementById('btnOut').disabled =!s.bisaOut;
  let txt = 'Silakan absen masuk';
  if (!s.bisaIn && s.bisaOut) txt = 'Anda sudah absen masuk. Silakan absen pulang';
  if (!s.bisaIn &&!s.bisaOut) txt = `Semua tombol dikunci. Tunggu ${s.sisaJam} jam lagi`;
  document.getElementById('statusCard').innerHTML = txt;
}

let currentType = '';
let stream = null;

async function openCamera(type) {
  currentType = type;
  document.getElementById('modalCam').classList.remove('hidden');
  document.getElementById('modalCam').classList.add('flex');
  stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
  document.getElementById('video').srcObject = stream;
}

function closeCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  document.getElementById('modalCam').classList.add('hidden');
}

async function capture() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  
  // Watermark TIMEMARK
  const now = new Date();
  const timeStr = now.toLocaleString('id-ID');
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.fillText(`TIMEMARK - ${user.nama}`, 10, canvas.height - 35);
  ctx.fillText(timeStr, 10, canvas.height - 10);
  
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
  closeCam();
  
  // Get lokasi
  navigator.geolocation.getCurrentPosition(async pos => {
    const res = await api('absen', {
      username: user.username,
      type: currentType,
      lat: pos.coords.latitude,
      long: pos.coords.longitude,
      fotoBase64: fotoBase64
    });
    alert(res.message);
    cekStatus();
  }, () => alert('Gagal ambil lokasi. Aktifkan GPS'));
}

async function api(action, data) {
  const res = await fetch(URL_GAS, {
    method: 'POST',
    body: JSON.stringify({action,...data})
  });
  return await res.json();
}

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

render();
