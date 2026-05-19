const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
const app = document.getElementById('app');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';
let currentType = '';
let stream = null;
let animationFrame = null;
let currentLocation = { lat: 0, long: 0, alamat: 'Mengambil lokasi...' };
let currentPage = 'home';

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
    <div class="flex gap-3 items-center">
      <button onclick="toggleDark()" class="hover:bg-maroon-dark p-2 rounded-lg transition">
        <i class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl"></i>
      </button>
      <button onclick="openProfil()" class="flex items-center gap-2 hover:bg-maroon-dark p-1 pr-3 rounded-full transition">
        <img id="avatarNav" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff'}" 
             class="w-9 h-9 rounded-full object-cover border-2 border-white">
      </button>
    </div>
  </nav>
  
  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-24">
    ${renderPage()}
  </div>
  
  <!-- BOTTOM NAV -->
  <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
    <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
      <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage==='home'?'text-maroon':'text-gray-500'}">
        <i class="fa-solid fa-house text-xl mb-1"></i>
        <span class="text-xs font-semibold">Home</span>
      </button>
      <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage==='rekap'?'text-maroon':'text-gray-500'}">
        <img src="icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage!=='rekap'?'opacity-50':''}">
        <span class="text-xs font-semibold">Rekap</span>
      </button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage==='patroli'?'text-maroon':'text-gray-500'}">
        <img src="icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage!=='patroli'?'opacity-50':''}">
        <span class="text-xs font-semibold">Patroli</span>
      </button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage==='kejadian'?'text-maroon':'text-gray-500'}">
        <img src="icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage!=='kejadian'?'opacity-50':''}">
        <span class="text-xs font-semibold">Kejadian</span>
      </button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage==='pembinaan'?'text-maroon':'text-gray-500'}">
        <img src="icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage!=='pembinaan'?'opacity-50':''}">
        <span class="text-xs font-semibold">Bina</span>
      </button>
    </div>
  </div>
  
  <!-- MODAL CAM -->
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
  </div>
  
  <!-- MODAL PROFIL -->
  <div id="modalProfil" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
      <div class="text-center mb-4">
        <div class="relative inline-block">
          <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff&size=128'}" 
               class="w-28 h-28 rounded-full object-cover mx-auto border-4 border-maroon shadow-lg">
          <button onclick="gantiFotoProfil()" class="absolute bottom-0 right-0 bg-maroon text-white p-2 rounded-full shadow-lg hover:bg-maroon-dark">
            <i class="fa-solid fa-camera text-sm"></i>
          </button>
        </div>
        <h3 class="font-bold text-xl mt-3 text-maroon dark:text-white">${user.nama}</h3>
        <p class="text-gray-500 dark:text-gray-400 text-sm">@${user.username}</p>
      </div>
      
      <div class="space-y-3 mb-4">
        <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
          <p class="text-xs text-gray-500 dark:text-gray-400">Jabatan</p>
          <p class="font-semibold dark:text-white">${user.jabatan || 'Karyawan'}</p>
        </div>
        <div class="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
          <p class="text-xs text-gray-500 dark:text-gray-400">No. HP</p>
          <p class="font-semibold dark:text-white">${user.hp || '-'}</p>
        </div>
      </div>
      
      <div class="flex gap-2">
        <button onclick="closeProfil()" class="flex-1 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg font-bold">
          Tutup
        </button>
        <button onclick="logout()" class="flex-1 bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg font-bold">
          <i class="fa-solid fa-right-from-bracket mr-1"></i>Logout
        </button>
      </div>
      
      <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
    </div>
  </div>`;
  
  if (currentPage === 'home') cekStatus();
}

function switchPage(page) {
  currentPage = page;
  renderDashboard();
}

function renderPage() {
  switch(currentPage) {
    case 'home': return renderHome();
    case 'rekap': return renderRekap();
    case 'patroli': return renderPatroli();
    case 'kejadian': return renderKejadian();
    case 'pembinaan': return renderPembinaan();
    default: return renderHome();
  }
}

function renderHome() {
  return `
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
  `;
}

function renderRekap() {
  return `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
      <img src="icon-rekap.png" class="w-20 h-20 mx-auto mb-3">
      <h2 class="text-xl font-bold text-maroon dark:text-white mb-2">Rekap Absen</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Fitur rekap kehadiran bulanan</p>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <i class="fa-solid fa-tools text-yellow-600 mr-2"></i>
        <span class="text-sm text-yellow-800 dark:text-yellow-200">Dalam pengembangan</span>
      </div>
    </div>
  `;
}

function renderPatroli() {
  return `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
      <img src="icon-patroli.png" class="w-20 h-20 mx-auto mb-3">
      <h2 class="text-xl font-bold text-maroon dark:text-white mb-2">Patroli</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Laporkan kegiatan patroli dengan foto & GPS</p>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <i class="fa-solid fa-tools text-yellow-600 mr-2"></i>
        <span class="text-sm text-yellow-800 dark:text-yellow-200">Dalam pengembangan</span>
      </div>
    </div>
  `;
}

function renderKejadian() {
  return `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
      <img src="icon-kejadian.png" class="w-20 h-20 mx-auto mb-3">
      <h2 class="text-xl font-bold text-maroon dark:text-white mb-2">Lapor Kejadian</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Laporkan kejadian penting di lokasi</p>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <i class="fa-solid fa-tools text-yellow-600 mr-2"></i>
        <span class="text-sm text-yellow-800 dark:text-yellow-200">Dalam pengembangan</span>
      </div>
    </div>
  `;
}

function renderPembinaan() {
  return `
    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center">
      <img src="icon-pembinaan.png" class="w-20 h-20 mx-auto mb-3">
      <h2 class="text-xl font-bold text-maroon dark:text-white mb-2">Pembinaan Anggota</h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">Form penilaian & pembinaan anggota</p>
      <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
        <i class="fa-solid fa-tools text-yellow-600 mr-2"></i>
        <span class="text-sm text-yellow-800 dark:text-yellow-200">Dalam pengembangan</span>
      </div>
    </div>
  `;
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
    currentPage = 'home';
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

function openProfil() {
  document.getElementById('modalProfil').classList.remove('hidden');
  document.getElementById('modalProfil').classList.add('flex');
}

function closeProfil() {
  document.getElementById('modalProfil').classList.add('hidden');
  document.getElementById('modalProfil').classList.remove('flex');
}

function gantiFotoProfil() {
  document.getElementById('inputFotoProfil').click();
}

async function uploadFotoProfil(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    const fotoBase64 = event.target.result;
    
    document.getElementById('fotoProfil').src = fotoBase64;
    document.getElementById('avatarNav').src = fotoBase64;
    
    const res = await api('updateFotoProfil', {
      username: user.username,
      fotoBase64: fotoBase64
    });
    
    if (res.status === 'success') {
      user.foto = res.urlFoto;
      localStorage.setItem('user', JSON.stringify(user));
      alert('Foto profil berhasil diupdate');
    } else {
      alert('Gagal: ' + res.message);
      renderDashboard();
    }
  };
  reader.readAsDataURL(file);
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
    
    const scale = canvas.width / 800;
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tgl = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'numeric', year: 'numeric' });
    
    const boxHeight = 120 * scale;
    const boxWidth = 360 * scale;
    const padding = 20 * scale;
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
  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.7);
  
  const sizeKB = Math.round((fotoBase64.length * 3/4) / 1024);
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
