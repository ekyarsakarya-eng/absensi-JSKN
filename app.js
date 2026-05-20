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
        <i id="darkIcon" class="fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl"></i>
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
  <div class="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
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
  
  <!-- MODAL PROFIL ELEGAN V2 -->
<div id="modalProfil" class="fixed inset-0 bg-black/60 backdrop-blur-md hidden items-center justify-center p-4 z-50">
  <div class="bg-white dark:bg-gray-900 rounded- w-full max-w-md overflow-hidden shadow-2xl border border-gray-200/50 dark:border-gray-700/50 animate-[slideUp_0.3s_ease]">
    <!-- HEADER + AVATAR -->
    <div class="relative bg-gradient-to-br from-maroon via-red-700 to-red-900 px-6 pt-8 pb-20">
      <button onclick="closeProfil()" class="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur p-2.5 rounded-full transition text-white">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="text-center text-white">
        <div class="relative inline-block">
          <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=fff&color=800000&size=256'}"
               class="w-28 h-28 rounded-3xl object-cover mx-auto border-4 border-white/30 shadow-2xl ring-4 ring-white/10">
          <button onclick="gantiFotoProfil()" class="absolute -bottom-1 -right-1 bg-white text-maroon p-2.5 rounded-2xl shadow-xl hover:scale-110 transition">
            <i class="fa-solid fa-camera"></i>
          </button>
        </div>
        <h3 class="font-bold text-2xl mt-4">${user.nama}</h3>
        <p class="text-white/70 text-sm">@${user.username}</p>
      </div>
    </div>

    <!-- TABS -->
    <div class="flex bg-gray-50 dark:bg-gray-800/50 px-2 -mt-8 relative z-10">
      <button onclick="switchProfilTab('info')" id="tabInfo" class="flex-1 py-3.5 font-bold text-sm transition-all rounded-t-2xl bg-white dark:bg-gray-900 text-maroon shadow-sm">
        <i class="fa-solid fa-user mr-1.5"></i>Data Diri
      </button>
      <button onclick="switchProfilTab('password')" id="tabPassword" class="flex-1 py-3.5 font-bold text-sm transition-all text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
        <i class="fa-solid fa-lock mr-1.5"></i>Keamanan
      </button>
    </div>

    <!-- TAB INFO -->
    <div id="profilInfo" class="p-5 space-y-4 max-h- overflow-y-auto bg-white dark:bg-gray-900">
      <!-- FLOATING LABEL INPUT -->
      <div class="relative">
        <input id="editNama" value="${user.nama||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
        <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Nama Lengkap</label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="relative">
          <input id="editKtp" value="${user.ktp||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
          <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">No KTP</label>
        </div>
        <div class="relative">
          <input id="editHp" value="${user.hp||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
          <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">No HP</label>
        </div>
      </div>

      <div class="relative">
        <textarea id="editAlamat" rows="2" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition resize-none">${user.alamat||''}</textarea>
        <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Alamat Lengkap</label>
      </div>

      <div class="relative">
        <input id="editTtl" value="${user.ttl||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
        <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Tempat, Tanggal Lahir</label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="relative">
          <input id="editBank" value="${user.bank||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
          <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Nama Bank</label>
        </div>
        <div class="relative">
          <input id="editRek" value="${user.rekening||''}" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm font-semibold text-gray-900 dark:text-white outline-none transition">
          <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">No Rekening</label>
        </div>
      </div>

      <button onclick="simpanProfil()" class="w-full bg-gradient-to-r from-maroon via-red-700 to-red-800 hover:shadow-xl hover:scale-[1.02] text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95 mt-2">
        <i class="fa-solid fa-floppy-disk mr-2"></i>Simpan Perubahan
      </button>
    </div>

    <!-- TAB PASSWORD -->
    <div id="profilPassword" class="p-5 space-y-4 hidden bg-white dark:bg-gray-900">
      <div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
        <p class="text-sm text-amber-800 dark:text-amber-200"><i class="fa-solid fa-shield-halved mr-2"></i>Kosongkan jika tidak mau ganti password</p>
      </div>

      <div class="relative">
        <input id="passLama" type="password" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm text-gray-900 dark:text-white outline-none transition">
        <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Password Lama</label>
        <i onclick="togglePassProfil('passLama', this)" class="fa-solid fa-eye absolute right-4 top-5 cursor-pointer text-gray-400 hover:text-maroon"></i>
      </div>

      <div class="relative">
        <input id="passBaru" type="password" placeholder=" " class="peer w-full p-4 pt-6 bg-gray-100 dark:bg-gray-800 border-2 border-transparent focus:border-maroon rounded-2xl text-sm text-gray-900 dark:text-white outline-none transition">
        <label class="absolute left-4 top-2 text-xs text-gray-500 dark:text-gray-400 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-xs peer-focus:text-maroon transition-all">Password Baru</label>
        <i onclick="togglePassProfil('passBaru', this)" class="fa-solid fa-eye absolute right-4 top-5 cursor-pointer text-gray-400 hover:text-maroon"></i>
      </div>

      <button onclick="gantiPassword()" class="w-full bg-gradient-to-r from-maroon via-red-700 to-red-800 hover:shadow-xl hover:scale-[1.02] text-white p-4 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
        <i class="fa-solid fa-key mr-2"></i>Update Password
      </button>

      <button onclick="logout()" class="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-4 rounded-2xl font-bold transition">
        <i class="fa-solid fa-right-from-bracket mr-2"></i>Logout
      </button>
    </div>

    <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
  </div>
</div>

<style>
@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>

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
  document.getElementById('darkIcon').className = `fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl`;
}

function openProfil() {
  document.getElementById('modalProfil').classList.remove('hidden');
  document.getElementById('modalProfil').classList.add('flex');
  switchProfilTab('info');
}

function closeProfil() {
  document.getElementById('modalProfil').classList.add('hidden');
  document.getElementById('modalProfil').classList.remove('flex');
  document.getElementById('passLama').value = '';
  document.getElementById('passBaru').value = '';
}

function switchProfilTab(tab) {
  const tabInfo = document.getElementById('tabInfo');
  const tabPass = document.getElementById('tabPassword');
  const infoDiv = document.getElementById('profilInfo');
  const passDiv = document.getElementById('profilPassword');
  
  if (tab === 'info') {
    tabInfo.className = 'flex-1 py-3 font-semibold text-sm transition border-b-2 border-maroon text-maroon';
    tabPass.className = 'flex-1 py-3 font-semibold text-sm transition border-b-2 border-transparent text-gray-500';
    infoDiv.classList.remove('hidden');
    passDiv.classList.add('hidden');
  } else {
    tabInfo.className = 'flex-1 py-3 font-semibold text-sm transition border-b-2 border-transparent text-gray-500';
    tabPass.className = 'flex-1 py-3 font-semibold text-sm transition border-b-2 border-maroon text-maroon';
    infoDiv.classList.add('hidden');
    passDiv.classList.remove('hidden');
  }
}

async function simpanProfil() {
  const dataUpdate = {
    username: user.username,
    nama: document.getElementById('editNama').value.trim(),
    ktp: document.getElementById('editKtp').value.trim(),
    hp: document.getElementById('editHp').value.trim(),
    alamat: document.getElementById('editAlamat').value.trim(),
    ttl: document.getElementById('editTtl').value.trim(),
    bank: document.getElementById('editBank').value.trim(),
    rekening: document.getElementById('editRek').value.trim()
  };
  
  if (!dataUpdate.nama) return alert('Nama wajib diisi');
  
  const res = await api('updateProfil', dataUpdate);
  alert(res.message);
  
  if (res.status === 'success') {
    user = {...user,...dataUpdate};
    localStorage.setItem('user', JSON.stringify(user));
    renderDashboard();
    closeProfil();
  }
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
    
    // Tampil langsung base64 dulu biar user liat
    document.getElementById('fotoProfil').src = fotoBase64;
    document.getElementById('avatarNav').src = fotoBase64;
    
    const res = await api('updateFotoProfil', {
      username: user.username,
      fotoBase64: fotoBase64
    });
    
    if (res.status === 'success') {
      user.foto = res.urlFoto;
      localStorage.setItem('user', JSON.stringify(user));
      
      // Force reload image pake timestamp biar nggak cache
      const newUrl = res.urlFoto + '?t=' + new Date().getTime();
      document.getElementById('fotoProfil').src = newUrl;
      document.getElementById('avatarNav').src = newUrl;
      
      alert('Foto profil berhasil diupdate');
    } else {
      alert('Gagal: ' + res.message);
      // Balikin ke foto lama kalo gagal
      document.getElementById('fotoProfil').src = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=800000&color=fff&size=128`;
      document.getElementById('avatarNav').src = user.foto || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nama)}&background=800000&color=fff`;
    }
  };
  reader.readAsDataURL(file);
}

function togglePassProfil(id, icon) {
  const p = document.getElementById(id);
  if (p.type === 'password') {
    p.type = 'text';
    icon.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    p.type = 'password';
    icon.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

async function gantiPassword() {
  const passLama = document.getElementById('passLama').value;
  const passBaru = document.getElementById('passBaru').value;
  if (!passLama ||!passBaru) return alert('Password lama & baru wajib diisi');
  if (passBaru.length < 4) return alert('Password baru minimal 4 karakter');
  
  const res = await api('gantiPassword', {
    username: user.username,
    passLama: passLama,
    passBaru: passBaru
  });
  
  alert(res.message);
  if (res.status === 'success') {
    document.getElementById('passLama').value = '';
    document.getElementById('passBaru').value = '';
  }
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
