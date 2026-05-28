const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
console.log('App.js loaded');

// === POPUP MODERN ===
function showSuccess(msg){ Swal.fire({icon:'success',title:msg,showConfirmButton:false,timer:2000,background:document.documentElement.classList.contains('dark')?'#064e3b':'#ecfdf5',customClass:{popup:'rounded-3xl'}}); }
function showError(msg){ Swal.fire({icon:'error',title:'Oops!',text:msg,confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}}); }
async function showConfirm(msg){ return (await Swal.fire({title:msg,icon:'question',showCancelButton:true,confirmButtonText:'Ya',cancelButtonText:'Batal',confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}})).isConfirmed; }
window.alert = showSuccess;

// === PWA INSTALL ===
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const btnInstall = document.getElementById('btnInstall');
const isInStandaloneMode = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; if (!isInStandaloneMode()) { installPopup.classList.remove('hidden'); installPopup.classList.add('flex'); }});
btnInstall?.addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { installPopup.classList.add('hidden'); } deferredPrompt = null; });
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }
if (isInStandaloneMode()) { installPopup?.classList.add('hidden'); }

const app = document.getElementById('app');
if(!app) console.error('Div #app tidak ditemukan!');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';
let currentType = ''; let stream = null; let animationFrame = null;
let currentLocation = { lat: 0, long: 0, alamat: 'Mencari sinyal GPS...' };
let currentPage = 'home'; let statusServer = {}; let dataRekap = []; let dataPatroli = []; let dataKejadian = []; let dataPembinaan = [];
if (isDark) document.documentElement.classList.add('dark');

function render() { if (!user) return renderLogin(); renderDashboard(); }

function renderLogin() {
  app.innerHTML = `
  <div class="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-800 to-red-900">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
      <div class="text-center mb-6">
        <div class="bg-red-800 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg">
          <i class="fa-solid fa-fingerprint text-white text-2xl"></i>
        </div>
        <h1 class="text-2xl font-bold text-red-800 dark:text-white">Absensi Karyawan</h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-1">Silakan login untuk absen</p>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
          <input id="username" placeholder="Masukkan username" class="w-full p-3 border border-gray-300 rounded-lg mt-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-800 outline-none">
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <div class="relative mt-1">
            <input id="password" type="password" placeholder="Masukkan password" class="w-full p-3 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-red-800 outline-none">
            <i id="eyeIcon" onclick="togglePass()" class="fa-solid fa-eye absolute right-3 top-4 cursor-pointer text-gray-400 hover:text-red-800"></i>
          </div>
        <button onclick="login()" id="btnLogin" class="w-full bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition shadow-lg">
          <i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk
        </button>
      </div>
    </div>
  </div>`;
}

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username ||!password) return showError('Username & password wajib diisi');
  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';
  const res = await api('login', {username, password});
  if (res.status === 'success') {
    user = res;
    localStorage.setItem('user', JSON.stringify(user));
    render();
  } else {
    showError(res.message);
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk';
  }
}

async function logout() {
  if (!(await showConfirm('Yakin mau logout?'))) return;
  localStorage.removeItem('user');
  user = null;
  currentPage = 'home';
  render();
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
  document.getElementById('darkIcon').className = `fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl`;
}

function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-red-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-user-shield text-xl"></i>
      <div>
        <h1 class="font-bold text-lg leading-tight">Hi, ${user.nama}</h1>
        <p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
      </div>
    </div>
    <div class="flex gap-3 items-center">
      <button onclick="toggleDark()" class="hover:bg-red-900 p-2 rounded-lg transition">
        <i id="darkIcon" class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl"></i>
      </button>
      <button onclick="openProfil()" class="flex items-center gap-2 hover:bg-red-900 p-1 pr-3 rounded-full transition">
        <img id="avatarNav" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff'}" class="w-9 h-9 rounded-full object-cover border-2 border-white">
      </button>
    </div>
  </nav>

  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">
    ${renderPage()}
  </div>

  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg z-20">
    <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
      <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage==='home'?'text-red-800':'text-gray-500'}">
        <i class="fa-solid fa-house text-xl mb-1"></i>
        <span class="text-xs font-semibold">Home</span>
      </button>
      <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage==='rekap'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage==='rekap'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Rekap</span>
      </button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage==='patroli'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage==='patroli'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Patroli</span>
      </button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage==='kejadian'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage==='kejadian'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Kejadian</span>
      </button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage==='pembinaan'?'text-red-800':'text-gray-500'}">
        <img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage==='pembinaan'?'':'opacity-50'}">
        <span class="text-xs font-semibold">Bina</span>
      </button>
    </div>
  </div>

  <!-- MODAL KAMERA -->
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-red-800 dark:text-white text-center">
        <i class="fa-solid fa-camera mr-2"></i>Ambil Foto Selfie
      </h3>
      <div style="position:relative">
        <video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video>
        <canvas id="canvas" class="hidden w-full rounded-lg"></canvas>
        <div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 border-l-4 border-red-800 px-3 py-2 rounded text-white text- font-semibold z-10 space-y-0.5">
          <div id="previewHari"></div>
          <div id="previewJam" class="text-yellow-400 font-bold text-xs"></div>
          <div id="previewNama" class="text-white opacity-90"></div>
          <div id="previewGps" class="text-green-400 font-mono"></div>
        </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Pastikan wajah terlihat jelas</p>
      <div class="flex gap-2 mt-4">
        <button onclick="capture()" id="btnCapture" class="flex-1 bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition">
          <i class="fa-solid fa-camera mr-1"></i>Kirim Absen
        </button>
        <button onclick="closeCam()" class="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg transition">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL PROFIL -->
  <div id="modalProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
      <div class="bg-red-800 px-5 pt-8 pb-6 relative">
        <button onclick="closeProfil()" class="absolute top-3 right-3 bg-white/95 hover:bg-white text-red-800 w-9 h-9 rounded-full transition flex items-center justify-center z-20">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="text-center">
          <div class="relative inline-block mb-3">
            <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=fff&color=800000&size=256'}" class="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white shadow-2xl">
            <button onclick="gantiFotoProfil()" class="absolute -bottom-1 -right-1 bg-white text-red-800 w-9 h-9 rounded-xl shadow-xl flex items-center justify-center"><i class="fa-solid fa-camera"></i></button>
          </div>
          <h3 class="font-extrabold text-xl text-white mb-1">${user.nama}</h3>
          <p class="text-sm text-white/90 font-medium">@${user.username}</p>
        </div>
      </div>
      <div class="p-4 space-y-2">
        <button onclick="openEditProfil()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition"><div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-user-pen"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Edit Profil</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
        <button onclick="openGantiPassword()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl transition"><div class="w-12 h-12 bg-red-800/10 text-red-800 rounded-xl flex items-center justify-center"><i class="fa-solid fa-key"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-gray-900 dark:text-white">Ganti Password</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
        <button onclick="logout()" class="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl transition"><div class="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center"><i class="fa-solid fa-right-from-bracket"></i></div><div class="text-left flex-1"><p class="font-bold text-sm text-red-600">Logout</p></div><i class="fa-solid fa-chevron-right text-gray-400"></i></button>
      </div>
      <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
    </div>
  </div>

  <!-- MODAL EDIT PROFIL -->
  <div id="modalEditProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Edit Profil</h3><button onclick="closeEditProfil()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Lengkap</label><input id="editNama" value="${user.nama||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No KTP</label><input id="editKtp" value="${user.ktp||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">No HP</label><input id="editHp" value="${user.hp||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Alamat</label><textarea id="editAlamat" rows="2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white">${user.alamat||''}</textarea></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Tempat, Tgl Lahir</label><input id="editTtl" value="${user.ttl||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="text-xs font-bold text-red-800 block mb-1">Bank</label><input id="editBank" value="${user.bank||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
          <div><label class="text-xs font-bold text-red-800 block mb-1">No Rekening</label><input id="editRek" value="${user.rekening||''}" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        </div>
      </div>
      <div class="p-4"><button onclick="simpanProfil()" id="btnSimpanProfil" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>

  <!-- MODAL GANTI PASSWORD, PATROLI, KEJADIAN, PEMBINAAN (gunakan HTML asli lengkap dari file kamu) -->
  `;
  if (currentPage === 'home') { cekStatus(); dapatkanLokasiGPS(); }
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
}

function renderPage(){ switch(currentPage){ case 'home': return renderHome(); case 'rekap': return renderRekap(); case 'patroli': return renderPatroli(); case 'kejadian': return renderKejadian(); case 'pembinaan': return renderPembinaan(); default: return renderHome(); } }

function renderHome() {
  const { bisaIn = false, bisaOut = false, lock12Jam = false, sisaJam = 0, jamMasuk = '--:--', jamPulang = '--:--' } = statusServer;
  const statusText = lock12Jam ? `Terkunci ${sisaJam} jam lagi` : bisaIn ? 'Siap Absen Masuk' : bisaOut ? 'Siap Absen Pulang' : 'Sudah Selesai';
  const statusColor = lock12Jam ? 'bg-amber-500' : bisaIn || bisaOut ? 'bg-green-500' : 'bg-gray-500';
  return `
  <div class="space-y-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center"><i class="fa-solid fa-satellite-dish text-red-800 text-sm"></i></div>
          <div><p class="text-xs text-gray-500 dark:text-gray-400">Lokasi GPS</p><p class="text-xs font-bold text-red-800 dark:text-white">REAL-TIME</p></div>
        </div>
        <div class="flex items-center gap-1"><div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span class="text-xs text-green-600 font-medium">Aktif</span></div>
      </div>
      <div class="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 space-y-2">
        <div class="flex items-start gap-2"><i class="fa-solid fa-location-dot text-red-800 mt-0.5 text-sm"></i><div class="flex-1 min-w-0"><p class="text-xs text-gray-500 dark:text-gray-400">Alamat</p><p id="gpsAlamat" class="text-sm font-medium text-gray-900 dark:text-white leading-snug">${currentLocation.alamat}</p></div></div>
        <div class="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700"><div><p class="text-xs text-gray-500">Latitude</p><p id="gpsLat" class="text-sm font-mono font-bold text-gray-900 dark:text-white">${currentLocation.lat}</p></div><div><p class="text-xs text-gray-500">Longitude</p><p id="gpsLong" class="text-sm font-mono font-bold text-gray-900 dark:text-white">${currentLocation.long}</p></div></div>
      </div>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex items-center justify-between mb-4"><h2 class="font-bold text-gray-900 dark:text-white">Status Hari Ini</h2><span class="px-3 py-1 ${statusColor} text-white text-xs font-bold rounded-full">${statusText}</span></div>
      <div class="grid grid-cols-2 gap-3 mb-4"><div class="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800"><i class="fa-solid fa-right-to-bracket text-green-600 text-lg mb-1"></i><p class="text-xs text-gray-600 dark:text-gray-400">Masuk</p><p class="text-lg font-bold text-green-600">${jamMasuk}</p></div><div class="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-200 dark:border-red-800"><i class="fa-solid fa-right-from-bracket text-red-600 text-lg mb-1"></i><p class="text-xs text-gray-600 dark:text-gray-400">Pulang</p><p class="text-lg font-bold text-red-600">${jamPulang}</p></div></div>
      <div class="text-center py-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl"><p class="text-xs text-gray-500 dark:text-gray-400">Waktu Sekarang</p><p id="jamRealtime" class="text-2xl font-mono font-bold text-red-800 dark:text-white">--:--:--</p></div>
    </div>
    <div class="space-y-3">
      <button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn ? 'disabled' : ''} class="w-full relative overflow-hidden group ${bisaIn ? 'bg-green-600 hover:bg-green-700 active:scale-98' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'} text-white p-5 rounded-2xl font-bold text-lg shadow-xl transition-all"><div class="flex items-center justify-center gap-3"><div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-fingerprint text-2xl"></i></div><div class="text-left"><p class="text-lg">Absen Masuk</p><p class="text-xs opacity-80 font-normal">Tap untuk scan wajah & GPS</p></div></div>${!bisaIn ? '<div class="absolute inset-0 bg-black/10 backdrop-blur-"></div>' : ''}</button>
      <button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut ? 'disabled' : ''} class="w-full relative overflow-hidden group ${bisaOut ? 'bg-red-800 hover:bg-red-900 active:scale-98' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'} text-white p-5 rounded-2xl font-bold text-lg shadow-xl transition-all"><div class="flex items-center justify-center gap-3"><div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm"><i class="fa-solid fa-hand-wave text-2xl"></i></div><div class="text-left"><p class="text-lg">Absen Pulang</p><p class="text-xs opacity-80 font-normal">Selesaikan shift hari ini</p></div></div>${!bisaOut ? '<div class="absolute inset-0 bg-black/10 backdrop-blur-"></div>' : ''}</button>
    </div>
    ${lock12Jam ? `<div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3"><i class="fa-solid fa-lock text-amber-600 mt-0.5"></i><div><p class="font-bold text-amber-800 dark:text-amber-400 text-sm">Terkunci Sementara</p><p class="text-xs text-amber-700 dark:text-amber-300 mt-1">Anda baru saja absen pulang. Tunggu ${sisaJam} jam lagi untuk absen masuk berikutnya.</p></div></div>` : ''}
  </div>`;
}

function updateJamRealtime() {
  const now = new Date();
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  const el = document.getElementById('jamRealtime');
  if (el) el.textContent = `${jam}:${menit}:${detik}`;
}
setInterval(updateJamRealtime, 1000);

async function loadHomeStats() {
  const res = await api('getRekap', { username: user.username });
  if (res.status === 'success') {
    dataRekap = res.data || [];
  }
}

function updateGpsCard(lat, long, alamat) {
  currentLocation.lat = lat;
  currentLocation.long = long;
  currentLocation.alamat = alamat;
  const elLat = document.getElementById('gpsLat');
  const elLong = document.getElementById('gpsLong');
  const elAlamat = document.getElementById('gpsAlamat');
  if (elLat) elLat.textContent = lat;
  if (elLong) elLong.textContent = long;
  if (elAlamat) elAlamat.textContent = alamat;
}

function renderRekap() {
  return `<div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"><h2 class="font-bold mb-3">Rekap Bulan Ini</h2><div id="listRekap" class="space-y-2 text-sm">Loading...</div></div>`;
}
async function loadRekap() {
  const res = await api('getRekap', { username: user.username });
  const container = document.getElementById('listRekap');
  if (!container) return;
  if (res.status!== 'success' ||!res.data.length) {
    container.innerHTML = '<p class="text-gray-500">Belum ada data</p>';
    return;
  }
  container.innerHTML = res.data.map(d => {
    const tgl = new Date(d.tanggal);
    return `<div class="flex justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"><span>${tgl.toLocaleDateString('id-ID')}</span><span class="font-mono">${d.keterangan}</span></div>`;
  }).join('');
}

function renderPatroli() {
  return `<div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"><div class="flex justify-between mb-3"><h2 class="font-bold">Patroli</h2><button onclick="openFormPatroli()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Tambah</button></div><div id="listPatroli">Loading...</div></div>`;
}
async function loadPatroli() {
  const res = await api('getPatroli', { username: user.username });
  const el = document.getElementById('listPatroli');
  if (res.status === 'success') {
    dataPatroli = res.data;
    el.innerHTML = dataPatroli.map(p => `<div class="p-2 border-b">${p.lokasi} - ${p.keterangan}</div>`).join('') || 'Kosong';
  }
}
function openFormPatroli() { document.getElementById('modalPatroli')?.classList.remove('hidden'); }
function closeFormPatroli() { document.getElementById('modalPatroli')?.classList.add('hidden'); }
async function simpanPatroli() {
  const res = await api('tambahPatroli', { username: user.username, lokasi: document.getElementById('patroliLokasi').value, keterangan: document.getElementById('patroliKet').value, foto: '', lat: currentLocation.lat, long: currentLocation.long });
  if (res.status === 'success') { showSuccess(res.message); closeFormPatroli(); loadPatroli(); } else { showError(res.message); }
}

function renderKejadian() {
  return `<div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"><div class="flex justify-between mb-3"><h2 class="font-bold">Kejadian</h2><button onclick="openFormKejadian()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Lapor</button></div><div id="listKejadian">Loading...</div></div>`;
}
async function loadKejadian() {
  const res = await api('getKejadian', { username: user.username });
  const el = document.getElementById('listKejadian');
  if (res.status === 'success') {
    dataKejadian = res.data;
    el.innerHTML = dataKejadian.map(k => `<div class="p-2 border-b">${k.jenis} - ${k.lokasi}</div>`).join('') || 'Kosong';
  }
}
function openFormKejadian() { document.getElementById('modalKejadian')?.classList.remove('hidden'); }
function closeFormKejadian() { document.getElementById('modalKejadian')?.classList.add('hidden'); }
async function simpanKejadian() {
  const res = await api('tambahKejadian', { username: user.username, jenis: document.getElementById('kejadianJenis').value, lokasi: document.getElementById('kejadianLokasi').value, kronologi: document.getElementById('kejadianKronologi').value, foto: '', lat: currentLocation.lat, long: currentLocation.long });
  if (res.status === 'success') { showSuccess(res.message); closeFormKejadian(); loadKejadian(); } else { showError(res.message); }
}

function renderPembinaan() {
  return `<div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"><div class="flex justify-between mb-3"><h2 class="font-bold">Pembinaan</h2><button onclick="openFormPembinaan()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Tambah</button></div><div id="listPembinaan">Loading...</div></div>`;
}
async function loadPembinaan() {
  const res = await api('getPembinaan', { username: user.username });
  const el = document.getElementById('listPembinaan');
  if (res.status === 'success') {
    dataPembinaan = res.data;
    el.innerHTML = dataPembinaan.map(b => `<div class="p-2 border-b">${b.materi} - Nilai: ${b.nilai}</div>`).join('') || 'Kosong';
  }
}
function openFormPembinaan() { document.getElementById('modalPembinaan')?.classList.remove('hidden'); }
function closeFormPembinaan() { document.getElementById('modalPembinaan')?.classList.add('hidden'); }
async function simpanPembinaan() {
  const res = await api('tambahPembinaan', { username: user.username, materi: document.getElementById('binaMateri').value, pelatih: document.getElementById('binaPelatih').value, nilai: document.getElementById('binaNilai').value, keterangan: document.getElementById('binaKet').value });
  if (res.status === 'success') { showSuccess(res.message); closeFormPembinaan(); loadPembinaan(); } else { showError(res.message); }
}

function switchPage(page) { currentPage = page; renderDashboard(); }

function dapatkanLokasiGPS() {
  if (!navigator.geolocation) return;
  navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude.toFixed(6);
    const long = pos.coords.longitude.toFixed(6);
    updateGpsCard(lat, long, currentLocation.alamat);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${long}`).then(r => r.json()).then(d => { if (d.display_name) updateGpsCard(lat, long, d.display_name); }).catch(()=>{});
  }, err => console.error(err), { enableHighAccuracy: true });
}

function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371e3; const φ1 = lat1 * Math.PI/180; const φ2 = lat2 * Math.PI/180; const Δφ = (lat2-lat1) * Math.PI/180; const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function startTimemark() {
  function update() {
    const now = new Date();
    document.getElementById('previewHari').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('previewJam').textContent = now.toLocaleTimeString('id-ID');
    document.getElementById('previewNama').textContent = user.nama;
    document.getElementById('previewGps').textContent = `${currentLocation.lat}, ${currentLocation.long}`;
    animationFrame = requestAnimationFrame(update);
  }
  update();
}

function bukaKameraAbsen(tipe) { currentType = tipe; openCam(); }
function openCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  startTimemark();
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
   .then(s => { stream = s; document.getElementById('video').srcObject = s; })
   .catch(err => { showError('Gagal mengakses kamera: ' + err.message); closeCam(); });
}
function closeCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.add('hidden'); modal.classList.remove('flex');
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  if (animationFrame) { cancelAnimationFrame(animationFrame); }
}

async function capture() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0);
  const foto = canvas.toDataURL('image/jpeg', 0.8);
  closeCam();
  const btn = document.getElementById('btnCapture');
  btn.disabled = true;
  const res = await api('absen', { username: user.username, tipeAbsen: currentType, foto, lat: currentLocation.lat, long: currentLocation.long });
  btn.disabled = false;
  if (res.status === 'success') { showSuccess(res.message); cekStatus(); } else { showError(res.message); }
}

async function api(aksi, payload = {}) {
  try {
    const response = await fetch(URL_GAS, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ aksi, data: payload }) });
    return await response.json();
  } catch (error) {
    return { status: 'error', message: 'Koneksi bermasalah: ' + error.message };
  }
}

function openProfil() { document.getElementById('modalProfil').classList.remove('hidden'); document.getElementById('modalProfil').classList.add('flex'); }
function closeProfil() { document.getElementById('modalProfil').classList.add('hidden'); document.getElementById('modalProfil').classList.remove('flex'); }
function openEditProfil() { document.getElementById('modalEditProfil').classList.remove('hidden'); document.getElementById('modalEditProfil').classList.add('flex'); closeProfil(); }
function closeEditProfil() { document.getElementById('modalEditProfil').classList.add('hidden'); document.getElementById('modalEditProfil').classList.remove('flex'); }
function openGantiPassword() { document.getElementById('modalGantiPassword')?.classList.remove('hidden'); document.getElementById('modalGantiPassword')?.classList.add('flex'); closeProfil(); }
function closeGantiPassword() { document.getElementById('modalGantiPassword')?.classList.add('hidden'); document.getElementById('modalGantiPassword')?.classList.remove('flex'); }
function gantiFotoProfil() { document.getElementById('inputFotoProfil').click(); }

async function uploadFotoProfil(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    document.getElementById('fotoProfil').src = base64;
    const res = await api('uploadFoto', { username: user.username, fotoBase64: base64 });
    if (res.status === 'success') { user.foto = res.urlFoto; localStorage.setItem('user', JSON.stringify(user)); document.getElementById('avatarNav').src = res.urlFoto; showSuccess('Foto profil berhasil diupdate'); } else { showError(res.message); }
  };
  reader.readAsDataURL(file);
}

async function simpanProfil() {
  const btn = document.getElementById('btnSimpanProfil'); btn.disabled = true;
  const data = { username: user.username, nama: document.getElementById('editNama').value, ktp: document.getElementById('editKtp').value, hp: document.getElementById('editHp').value, alamat: document.getElementById('editAlamat').value, ttl: document.getElementById('editTtl').value, bank: document.getElementById('editBank').value, rekening: document.getElementById('editRek').value };
  const res = await api('updateProfil', data);
  if (res.status === 'success') { showSuccess(res.message); Object.assign(user, data); localStorage.setItem('user', JSON.stringify(user)); closeEditProfil(); renderDashboard(); } else { showError(res.message); }
  btn.disabled = false;
}

async function gantiPassword() {
  const passLama = document.getElementById('passLama').value; const passBaru = document.getElementById('passBaru').value; const passBaru2 = document.getElementById('passBaru2').value;
  if (passBaru!== passBaru2) return showError('Password baru tidak sama');
  const res = await api('gantiPassword', { username: user.username, passLama, passBaru });
  if (res.status === 'success') { showSuccess(res.message); closeGantiPassword(); } else { showError(res.message); }
}

async function cekStatus() {
  const res = await api('cekStatus', { username: user.username });
  if (res.status === 'success') { statusServer = res; document.getElementById('contentArea').innerHTML = renderPage(); updateJamRealtime(); }
}

console.log('Starting app...');
render();
