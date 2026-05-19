const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
const app = document.getElementById('app');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';
let currentType = '';
let stream = null;
let animationFrame = null;
let currentLocation = { lat: 0, long: 0, alamat: 'Mengambil lokasi...' };

if (isDark) document.documentElement.classList.add('dark');

function render() {
  if (!user) return renderLogin();
  renderDashboard();
}

function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-maroon to-red-900">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <div class="text-center mb-6">
        <div class="bg-maroon w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg">
          <i class="fa-solid fa-fingerprint text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-maroon dark:text-white">Absensi Karyawan</h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Silakan login untuk absen</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input id="username" placeholder="Masukkan username" class="w-full p-3 border border-gray-300 rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-maroon outline-none">
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div class="relative mt-1">
            <input id="password" type="password" placeholder="Masukkan password" class="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-maroon outline-none">
            <i id="eyeIcon" onclick="togglePass()" class="fa-solid fa-eye absolute right-3 top-4 cursor-pointer text-gray-400 hover:text-maroon"></i>
          </div>
        </div>
        <button onclick="login()" id="btnLogin" class="w-full bg-maroon hover:bg-maroon-dark text-white p-3 rounded-lg font-bold transition shadow-lg">
          <i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk
        </button>
      </div>
    </div>
  </div>`;
}

function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-maroon text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-user-shield text-xl"></i>
      <div>
        <h1 class="font-bold text-lg leading-tight">Hi, ${user.nama}</h1>
        <p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
      </div>
    </div>
    <div class="flex gap-4 items-center">
      <button onclick="toggleDark()" class="hover:bg-maroon-dark p-2 rounded-lg transition">
        <i class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl"></i>
      </button>
      <button onclick="logout()" class="hover:bg-maroon-dark p-2 rounded-lg transition">
        <i class="fa-solid fa-right-from-bracket text-xl"></i>
      </button>
    </div>
  </nav>
  
  <div class="p-4 max-w-2xl mx-auto pb-20">
    <div id="statusCard" class="bg-white dark:bg-gray-800 p-4 rounded-xl mb-4 text-center dark:text-white shadow-md border-l-4 border-maroon">
      <i class="fa-solid fa-spinner fa-spin mr-2"></i>Loading status...
    </div>
    
    <div class="grid grid-cols-2 gap-4 mb-6">
      <button id="btnIn" onclick="openCamera('IN')" class="bg-gradient-to-br from-green-500 to-green-700 text-white p-6 rounded-xl shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition transform active:scale-95">
        <i class="fa-solid fa-right-to-bracket text-3xl mb-2"></i><br>
        <span class="font-bold">Absen Masuk</span>
      </button>
      <button id="btnOut" onclick="openCamera('OUT')" class="bg-gradient-to-br from-red-500 to-red-700 text-white p-6 rounded-xl shadow-lg disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition transform active:scale-95">
        <i class="fa-solid fa-right-from-bracket text-3xl mb-2"></i><br>
        <span class="font-bold">Absen Pulang</span>
      </button>
    </div>
    
    <h3 class="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm">MENU LAINNYA</h3>
    <div class="grid grid-cols-2 gap-3 text-center">
      <button onclick="alert('Fitur Rekap Absen - Coming Soon')" class="bg-gradient-to-br from-blue-500 to-blue-700 text-white p-5 rounded-xl shadow-md active:scale-95 transition">
        <i class="fa-solid fa-calendar-check text-2xl mb-1"></i><br>
        <span class="text-sm font-semibold">Rekap Absen</span>
      </button>
      <button onclick="alert('Fitur Patroli - Coming Soon')" class="bg-gradient-to-br from-amber-500 to-amber-700 text-white p-5 rounded-xl shadow-md active:scale-95 transition">
        <i class="fa-solid fa-person-walking text-2xl mb-1"></i><br>
        <span class="text-sm font-semibold">Patroli</span>
      </button>
      <button onclick="alert('Fitur Kejadian - Coming Soon')" class="bg-gradient-to-br from-purple-500 to-purple-700 text-white p-5 rounded-xl shadow-md active:scale-95 transition">
        <i class="fa-solid fa-triangle-exclamation text-2xl mb-1"></i><br>
        <span class="text-sm font-semibold">Kejadian</span>
      </button>
      <button onclick="alert('Fitur Pembinaan Anggota - Coming Soon')" class="bg-gradient-to-br from-teal-500 to-teal-700 text-white p-5 rounded-xl shadow-md active:scale-95 transition">
        <i class="fa-solid fa-users text-2xl mb-1"></i><br>
        <span class="text-sm font-semibold">Pembinaan</span>
      </button>
    </div>
  </div>
  
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-maroon dark:text-white text-center">
        <i class="fa-solid fa-camera mr-2"></i>Ambil Foto Selfie
      </h3>
      <div style="position:relative">
        <video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video>
        <canvas id="canvas" class="hidden w-full rounded-lg"></canvas>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Pastikan wajah terlihat jelas</p>
      <div class="flex gap-2 mt-4">
        <button onclick="capture()" class="flex-1 bg-maroon hover:bg-maroon-dark text-white p-3 rounded-lg font-bold transition">
          <i class="fa-solid fa-camera mr-1"></i>Ambil Foto
        </button>
        <button onclick="closeCam()" class="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>`;
  
  cekStatus();
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username ||!password) return alert('Username & password wajib diisi');
  
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';
  
  const res = await api('login', {username, password});
  if (res.status === 'success') {
    user = res;
    localStorage.setItem('user', JSON.stringify(user));
    render();
  } else {
    alert(res.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk';
  }
}

function logout() {
  if (confirm('Yakin mau logout?')) {
    localStorage.removeItem('user');
    user = null;
    render();
  }
}

function togglePass() {
  const p = document.getElementById('password');
  const icon = document.getElementById('eyeIcon');
  if (p.type === 'password') {
    p.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    p.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

function toggleDark() {
  isDark =!isDark;
  localStorage.setItem('dark', isDark);
  document.documentElement.classList.toggle('dark');
  render();
}

async function cekStatus() {
  const s = await api('getStatus', {username: user.username});
  
  if (s.error) {
    document.getElementById('statusCard').innerHTML = `<i class="fa-solid fa-circle-exclamation text-red-500 mr-2"></i><span class="text-red-500">Error: ${s.error}</span>`;
    return;
  }
  
  document.getElementById('btnIn').disabled =!s.bisaIn;
  document.getElementById('btnOut').disabled =!s.bisaOut;
  
  let txt = '';
  let icon = '';
  if (s.lock12Jam) {
    icon = '<i class="fa-solid fa-lock text-amber-500 mr-2"></i>';
    txt = `Semua tombol dikunci. Tunggu <b>${s.sisaJam} jam</b> lagi`;
  } else if (s.sudahIn && s.sudahOut) {
    icon = '<i class="fa-solid fa-circle-check text-green-500 mr-2"></i>';
    txt = 'Anda sudah absen masuk & pulang hari ini';
  } else if (s.sudahIn &&!s.sudahOut) {
    icon = '<i class="fa-solid fa-clock text-blue-500 mr-2"></i>';
    txt = 'Anda sudah absen masuk. Silakan absen pulang';
  } else {
    icon = '<i class="fa-solid fa-hand text-maroon mr-2"></i>';
    txt = 'Silakan absen masuk untuk memulai';
  }
  
  document.getElementById('statusCard').innerHTML = icon + txt;
}

async function openCamera(type) {
  currentType = type;
  document.getElementById('modalCam').classList.remove('hidden');
  document.getElementById('modalCam').classList.add('flex');
  
  navigator.geolocation.getCurrentPosition(async pos => {
    currentLocation.lat = pos.coords.latitude;
    currentLocation.long = pos.coords.longitude;
    currentLocation.alamat = await getAddress(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    currentLocation.alamat = 'Lokasi tidak ditemukan';
  }, { enableHighAccuracy: true, timeout: 5000 });
  
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
    });
    const video = document.getElementById('video');
    video.srcObject = stream;
    
    video.onloadedmetadata = () => {
      video.play();
      drawLiveWatermark();
    };
    
  } catch (err) {
    alert('Gagal akses kamera: ' + err.message);
    closeCam();
  }
}

function drawLiveWatermark() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  
  video.style.display = 'none';
  canvas.style.display = 'block';
  
  function draw() {
    if (!stream || video.paused || video.ended) {
      cancelAnimationFrame(animationFrame);
      return;
    }
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // WATERMARK KIRI BAWAH - GEDE
    const scale = canvas.width / 800;
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tgl = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'numeric', year: 'numeric' });
    
    const boxHeight = 120 * scale;
    const boxWidth = 360 * scale;
    const padding = 20 * scale;
    
    // KIRI BAWAH: x = padding, y = canvas.height - boxHeight - padding
    const x = padding;
    const y = canvas.height - boxHeight - padding;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = `bold ${34 * scale}px Arial`;
    ctx.fillText(jam, x + 12, y + 35 * scale);
    
    ctx.font = `${18 * scale}px Arial`;
    ctx.fillText(tgl, x + 12, y + 58 * scale);
    ctx.fillText(`${currentLocation.lat.toFixed(6)},${currentLocation.long.toFixed(6)}`, x + 12, y + 78 * scale);
    
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText(currentLocation.alamat.substring(0, 45), x + 12, y + 98 * scale);
    
    animationFrame = requestAnimationFrame(draw);
  }
  draw();
}

function closeCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (animationFrame) cancelAnimationFrame(animationFrame);
  
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  video.style.display = 'block';
  canvas.style.display = 'none';
  
  document.getElementById('modalCam').classList.add('hidden');
  document.getElementById('modalCam').classList.remove('flex');
}

async function capture() {
  const canvas = document.getElementById('canvas');
  // Canvas udah ada watermark, langsung kompres & kirim
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
  
  const sizeKB = Math.round((fotoBase64.length * 3/4) / 1024);
  console.log(`Ukuran foto: ${sizeKB} KB`);
  
  closeCam();
  
  document.getElementById('statusCard').innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengirim data... (${sizeKB} KB)`;
  
  const res = await api('absen', {
    username: user.username,
    type: currentType,
    lat: currentLocation.lat,
    long: currentLocation.long,
    fotoBase64: fotoBase64
  });
  alert(res.message);
  cekStatus();
}

async function getAddress(lat, long) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}&zoom=18&addressdetails=1`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(6)}, ${long.toFixed(6)}`;
  } catch (e) {
    return `${lat.toFixed(6)}, ${long.toFixed(6)}`;
  }
}

async function api(action, data) {
  try {
    const res = await fetch(URL_GAS, {
      method: 'POST',
      body: JSON.stringify({action,...data})
    });
    return await res.json();
  } catch (err) {
    return {status: 'error', message: 'Gagal koneksi ke server: ' + err.message};
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

render();
