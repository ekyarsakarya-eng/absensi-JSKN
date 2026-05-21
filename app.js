const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
console.log('App.js loaded');

const app = document.getElementById('app');
if(!app) console.error('Div #app tidak ditemukan!');

let user = JSON.parse(localStorage.getItem('user') || 'null');
let isDark = localStorage.getItem('dark') === 'true';
let currentType = '';
let stream = null;
let animationFrame = null;
let currentLocation = { lat: 0, long: 0, alamat: 'Mencari sinyal GPS...' };
let currentPage = 'home';
let statusServer = {};
let dataRekap = [];
let dataPatroli = [];
let dataKejadian = [];
let dataPembinaan = [];

if (isDark) document.documentElement.classList.add('dark');

function render() {
  console.log('Render called, user:', user);
  if (!user) return renderLogin();
  renderDashboard();
}

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
  if (!username ||!password) return alert('Username & password wajib diisi');

  const btn = document.getElementById('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';

  const res = await api('login', {username, password});
  console.log('Login response:', res);
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
        <img id="avatarNav" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff'}"
             class="w-9 h-9 rounded-full object-cover border-2 border-white">
      </button>
    </div>
  </nav>

  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-24">
    ${renderPage()}
  </div>

  <div class="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 shadow-lg z-20">
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

  <!-- MODAL GANTI PASSWORD -->
  <div id="modalGantiPassword" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
      <div class="bg-red-800 px-5 py-4 flex items-center justify-between"><h3 class="font-bold text-lg text-white">Ganti Password</h3><button onclick="closeGantiPassword()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Lama</label><input id="passLama" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Password Baru</label><input id="passBaru" type="password" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm outline-none focus:border-red-800 dark:text-white"></div>
        <button onclick="gantiPassword()" id="btnGantiPass" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Update</button>
      </div>
    </div>
  </div>

  <!-- MODAL INPUT PATROLI -->
  <div id="modalPatroli" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Input Patroli</h3><button onclick="closeFormPatroli()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Lokasi Patroli</label><input id="patroliLokasi" placeholder="Contoh: Pos 1, Lantai 2" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Keterangan</label><textarea id="patroliKet" rows="3" placeholder="Situasi aman, dll" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Foto Bukti</label><input id="patroliFoto" type="file" accept="image/*" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm dark:text-white"></div>
      </div>
      <div class="p-4"><button onclick="simpanPatroli()" id="btnSimpanPatroli" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan Patroli</button></div>
    </div>
  </div>

  <!-- MODAL INPUT KEJADIAN -->
  <div id="modalKejadian" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Lapor Kejadian</h3><button onclick="closeFormKejadian()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Jenis Kejadian</label>
          <select id="kejadianJenis" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white">
            <option value="">Pilih Jenis</option>
            <option value="Kehilangan">Kehilangan</option>
            <option value="Kerusakan">Kerusakan</option>
            <option value="Kecelakaan">Kecelakaan</option>
            <option value="Mencurigakan">Mencurigakan</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Lokasi</label><input id="kejadianLokasi" placeholder="Lokasi kejadian" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Kronologi</label><textarea id="kejadianKronologi" rows="4" placeholder="Jelaskan kejadian..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Foto Bukti</label><input id="kejadianFoto" type="file" accept="image/*" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm dark:text-white"></div>
      </div>
      <div class="p-4"><button onclick="simpanKejadian()" id="btnSimpanKejadian" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Kirim Laporan</button></div>
    </div>
  </div>

  <!-- MODAL INPUT PEMBINAAN -->
  <div id="modalPembinaan" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md max-h- flex flex-col shadow-2xl">
      <div class="bg-red-800 px-5 py-4 rounded-t-3xl flex items-center justify-between"><h3 class="font-bold text-lg text-white">Input Pembinaan</h3><button onclick="closeFormPembinaan()"><i class="fa-solid fa-xmark text-xl text-white"></i></button></div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div><label class="text-xs font-bold text-red-800 block mb-1">Materi Pembinaan</label><input id="pembinaanMateri" placeholder="Contoh: SOP Keamanan" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nama Pelatih</label><input id="pembinaanPelatih" placeholder="Nama pelatih/instruktur" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Nilai</label><input id="pembinaanNilai" type="number" min="0" max="100" placeholder="0-100" class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none dark:text-white"></div>
        <div><label class="text-xs font-bold text-red-800 block mb-1">Keterangan</label><textarea id="pembinaanKet" rows="3" placeholder="Catatan tambahan..." class="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border-2 rounded-xl text-sm focus:border-red-800 outline-none resize-none dark:text-white"></textarea></div>
      </div>
      <div class="p-4"><button onclick="simpanPembinaan()" id="btnSimpanPembinaan" class="w-full bg-red-800 text-white py-3 rounded-2xl font-bold">Simpan</button></div>
    </div>
  </div>`;

  if (currentPage === 'home') cekStatus();
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
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

// ========== HALAMAN HOME ==========
function renderHome() {
  const { bisaIn = false, bisaOut = false, lock12Jam = false, sisaJam = 0, jamMasuk = '--:--', jamPulang = '--:--' } = statusServer;

  return `
  <div class="grid grid-cols-2 gap-4 mb-6">
    <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-200 dark:border-green-800 text-center">
      <p class="text-xs text-green-600 dark:text-green-400 font-medium">Jam Masuk</p>
      <p class="text-2xl font-black text-green-700 dark:text-green-300 mt-1">${jamMasuk}</p>
    </div>
    <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800 text-center">
      <p class="text-xs text-red-600 dark:text-red-400 font-medium">Jam Pulang</p>
      <p class="text-2xl font-black text-red-700 dark:text-red-300 mt-1">${jamPulang}</p>
    </div>
  </div>

  ${lock12Jam? `
    <div class="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-xl mb-6 text-center">
      <p class="text-xs text-yellow-700 dark:text-yellow-400 font-bold">
        <i class="fa-solid fa-clock-rotate-left mr-1"></i> Terkunci 12 jam.
        Sisa <b>${sisaJam} jam</b> lagi.
      </p>
    </div>
  ` : ''}

  <div class="space-y-4">
    <button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn? 'disabled' : ''}
      class="w-full py-4 rounded-2xl font-bold text-white transition flex items-center justify-center gap-3 shadow-lg
      ${!bisaIn? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.02]'}">
      <i class="fa-solid fa-sign-in-alt text-xl"></i> Absen Masuk Kerja
    </button>

    <button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut? 'disabled' : ''}
      class="w-full py-4 rounded-2xl font-bold text-white transition flex items-center justify-center gap-3 shadow-lg
      ${!bisaOut? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed shadow-none text-gray-500' : 'bg-gradient-to-r from-red-600 to-red-800 hover:scale-[1.02]'}">
      <i class="fa-solid fa-sign-out-alt text-xl"></i> Absen Pulang Kerja
    </button>
  </div>
  `;
}

// ========== HALAMAN REKAP ==========
function renderRekap() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Rekap Absensi</h2>
      <button onclick="loadRekap()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-refresh mr-1"></i>Refresh
      </button>
    </div>
    
    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Bulan: ${new Date().toLocaleDateString('id-ID', {month: 'long', year: 'numeric'})}</p>
      <div class="grid grid-cols-3 gap-3 text-center">
        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-green-600" id="totalHadir">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Hadir</p>
        </div>
        <div class="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-yellow-600" id="totalIzin">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Izin</p>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <p class="text-2xl font-bold text-red-600" id="totalAlpha">-</p>
          <p class="text-xs text-gray-600 dark:text-gray-400">Alpha</p>
        </div>
      </div>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Riwayat 7 Hari Terakhir</p>
      <div class="space-y-2" id="listRekap">
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadRekap() {
  const listEl = document.getElementById('listRekap');
  if (listEl) listEl.innerHTML = '<div class="text-center text-gray-400 py-8"><i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i><p class="text-sm">Loading...</p></div>';

  const res = await api('getRekap', { username: user.username });
  
  if (res.status === 'success') {
    dataRekap = res.data || [];
    
    let hadir = 0, izin = 0, alpha = 0;
    dataRekap.forEach(r => {
      if (r.keterangan === 'IN' && r.jam) hadir++;
    });
    
    document.getElementById('totalHadir').textContent = hadir;
    document.getElementById('totalIzin').textContent = izin;
    document.getElementById('totalAlpha').textContent = alpha;
    
    if (dataRekap.length > 0) {
      const last7 = dataRekap.slice(-14).reverse().filter((v,i) => i % 2 === 0).slice(0, 7);
      listEl.innerHTML = last7.map(r => {
        const isMasuk = r.keterangan === 'IN';
        const tgl = new Date(r.tanggal).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', weekday: 'short'});
        return `
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 ${isMasuk? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} rounded-lg flex items-center justify-center">
                <i class="fa-solid ${isMasuk? 'fa-sign-in-alt' : 'fa-sign-out-alt'}"></i>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-800 dark:text-white">${isMasuk? 'Masuk' : 'Pulang'}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${tgl}</p>
              </div>
            </div>
            <p class="text-sm font-bold text-gray-700 dark:text-gray-300">${r.jam || '--:--'}</p>
          </div>
        `;
      }).join('');
    } else {
      listEl.innerHTML = `
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-calendar-xmark text-3xl mb-2"></i>
          <p class="text-sm">Belum ada data absensi</p>
        </div>
      `;
    }
  } else {
    alert('Gagal load rekap: ' + res.message);
    listEl.innerHTML = `
      <div class="text-center text-red-400 py-8">
        <i class="fa-solid fa-circle-exclamation text-3xl mb-2"></i>
        <p class="text-sm">Gagal memuat data</p>
      </div>
    `;
  }
}

// ========== HALAMAN PATROLI ==========
function renderPatroli() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Patroli</h2>
      <button onclick="openFormPatroli()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Tambah
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listPatroli" class="space-y-2">
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadPatroli() {
  const res = await api('getPatroli', { username: user.username });
  const listEl = document.getElementById('listPatroli');
  
  if (res.status === 'success' && res.data.length > 0) {
    dataPatroli = res.data;
    listEl.innerHTML = dataPatroli.map(p => {
      const tgl = new Date(p.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-gray-800 dark:text-white">${p.lokasi}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl}</p>
            </div>
            ${p.foto? `<img src="${p.foto}" class="w-12 h-12 rounded-lg object-cover ml-2">` : ''}
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-route text-3xl mb-2"></i>
        <p class="text-sm">Belum ada data patroli</p>
      </div>
    `;
  }
}

function openFormPatroli() {
  document.getElementById('modalPatroli').classList.replace('hidden', 'flex');
}

function closeFormPatroli() {
  document.getElementById('modalPatroli').classList.replace('flex', 'hidden');
  document.getElementById('patroliLokasi').value = '';
  document.getElementById('patroliKet').value = '';
  document.getElementById('patroliFoto').value = '';
}

async function simpanPatroli() {
  const btn = document.getElementById('btnSimpanPatroli');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';

  const lokasi = document.getElementById('patroliLokasi').value.trim();
  const ket = document.getElementById('patroliKet').value.trim();
  const fotoFile = document.getElementById('patroliFoto').files[0];
  
  if (!lokasi) {
    alert('Lokasi wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Simpan Patroli';
    return;
  }

  let fotoBase64 = '';
  if (fotoFile) {
    fotoBase64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(fotoFile);
    });
  }

  const res = await api('tambahPatroli', {
    username: user.username,
    lokasi: lokasi,
    keterangan: ket,
    foto: fotoBase64
  });

  if (res.status === 'success') {
    alert(res.message);
    closeFormPatroli();
    loadPatroli();
  } else {
    alert(res.message);
  }

  btn.disabled = false;
  btn.innerHTML = 'Simpan Patroli';
}

// ========== HALAMAN KEJADIAN ==========
function renderKejadian() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Laporan Kejadian</h2>
      <button onclick="openFormKejadian()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Lapor
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listKejadian" class="space-y-2">
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadKejadian() {
  const res = await api('getKejadian', { username: user.username });
  const listEl = document.getElementById('listKejadian');
  
  if (res.status === 'success' && res.data.length > 0) {
    dataKejadian = res.data;
    listEl.innerHTML = dataKejadian.map(k => {
      const tgl = new Date(k.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-red-600">${k.jenis}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${k.lokasi}</p>
            </div>
            ${k.foto? `<img src="${k.foto}" class="w-12 h-12 rounded-lg object-cover ml-2">` : ''}
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${k.kronologi}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
        <p class="text-sm">Belum ada laporan kejadian</p>
      </div>
    `;
  }
}

function openFormKejadian() {
  document.getElementById('modalKejadian').classList.replace('hidden', 'flex');
}

function closeFormKejadian() {
  document.getElementById('modalKejadian').classList.replace('flex', 'hidden');
  document.getElementById('kejadianJenis').value = '';
  document.getElementById('kejadianLokasi').value = '';
  document.getElementById('kejadianKronologi').value = '';
  document.getElementById('kejadianFoto').value = '';
}

async function simpanKejadian() {
  const btn = document.getElementById('btnSimpanKejadian');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengirim...';

  const jenis = document.getElementById('kejadianJenis').value;
  const lokasi = document.getElementById('kejadianLokasi').value.trim();
  const kronologi = document.getElementById('kejadianKronologi').value.trim();
  const fotoFile = document.getElementById('kejadianFoto').files[0];
  
  if (!jenis ||!lokasi ||!kronologi) {
    alert('Jenis, Lokasi, dan Kronologi wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Kirim Laporan';
    return;
  }

  let fotoBase64 = '';
  if (fotoFile) {
    fotoBase64 = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(fotoFile);
    });
  }

  const res = await api('tambahKejadian', {
    username: user.username,
    jenis: jenis,
    lokasi: lokasi,
    kronologi: kronologi,
    foto: fotoBase64
  });

  if (res.status === 'success') {
    alert(res.message);
    closeFormKejadian();
    loadKejadian();
  } else {
    alert(res.message);
  }

  btn.disabled = false;
  btn.innerHTML = 'Kirim Laporan';
}

// ========== HALAMAN PEMBINAAN ==========
function renderPembinaan() {
  return `
  <div class="space-y-4">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-800 dark:text-white">Pembinaan</h2>
      <button onclick="openFormPembinaan()" class="bg-red-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-900 transition">
        <i class="fa-solid fa-plus mr-1"></i>Tambah
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      <div id="listPembinaan" class="space-y-2">
        <div class="text-center text-gray-400 py-8">
          <i class="fa-solid fa-spinner fa-spin text-3xl mb-2"></i>
          <p class="text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>`;
}

async function loadPembinaan() {
  const res = await api('getPembinaan', { username: user.username });
  const listEl = document.getElementById('listPembinaan');
  
  if (res.status === 'success' && res.data.length > 0) {
    dataPembinaan = res.data;
    listEl.innerHTML = dataPembinaan.map(p => {
      const tgl = new Date(p.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short'});
      return `
        <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div class="flex justify-between items-start mb-2">
            <div class="flex-1">
              <p class="text-sm font-bold text-gray-800 dark:text-white">${p.materi}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">${tgl} - ${p.pelatih}</p>
            </div>
            <div class="bg-red-800 text-white px-3 py-1 rounded-full">
              <p class="text-sm font-bold">${p.nilai}</p>
            </div>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">${p.keterangan || '-'}</p>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `
      <div class="text-center text-gray-400 py-8">
        <i class="fa-solid fa-user-graduate text-3xl mb-2"></i>
        <p class="text-sm">Belum ada data pembinaan</p>
      </div>
    `;
  }
}

function openFormPembinaan() {
  document.getElementById('modalPembinaan').classList.replace('hidden', 'flex');
}

function closeFormPembinaan() {
  document.getElementById('modalPembinaan').classList.replace('flex', 'hidden');
  document.getElementById('pembinaanMateri').value = '';
  document.getElementById('pembinaanPelatih').value = '';
  document.getElementById('pembinaanNilai').value = '';
  document.getElementById('pembinaanKet').value = '';
}

async function simpanPembinaan() {
  const btn = document.getElementById('btnSimpanPembinaan');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';

  const materi = document.getElementById('pembinaanMateri').value.trim();
  const pelatih = document.getElementById('pembinaanPelatih').value.trim();
  const nilai = document.getElementById('pembinaanNilai').value;
  const ket = document.getElementById('pembinaanKet').value.trim();
  
  if (!materi ||!pelatih ||!nilai) {
    alert('Materi, Pelatih, dan Nilai wajib diisi');
    btn.disabled = false;
    btn.innerHTML = 'Simpan';
    return;
  }

  const res = await api('tambahPembinaan', {
    username: user.username,
    materi: materi,
    pelatih: pelatih,
    nilai: nilai,
    keterangan: ket
  });

  if (res.status === 'success') {
    alert(res.message);
    closeFormPembinaan();
    loadPembinaan();
  } else {
    alert(res.message);
  }

  btn.disabled = false;
  btn.innerHTML = 'Simpan';
}

// ========== FUNGSI ABSEN LAMA - JANGAN DIUBAH ==========
async function cekStatus() {
  try {
    const res = await api('cekStatus', { username: user.username });
    console.log('Cek status:', res);
    if (res.status === 'success') {
      statusServer = res;
      const contentArea = document.getElementById('contentArea');
      if (contentArea && currentPage === 'home') {
        contentArea.innerHTML = renderPage();
      }
    }
  } catch(e) {
    console.error('Cek status error:', e);
  }
}

function switchPage(page) {
  currentPage = page;
  renderDashboard();
}

function dapatkanLokasiGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        currentLocation.lat = position.coords.latitude.toFixed(6);
        currentLocation.long = position.coords.longitude.toFixed(6);
        currentLocation.alamat = `Lat: ${currentLocation.lat}, Long: ${currentLocation.long}`;
        const gpsEl = document.getElementById('previewGps');
        if (gpsEl) gpsEl.innerText = `📍 ${currentLocation.alamat}`;
      },
      (error) => {
        currentLocation.alamat = "GPS terkunci / tidak aktif";
        const gpsEl = document.getElementById('previewGps');
        if (gpsEl) gpsEl.innerText = `⚠ ${currentLocation.alamat}`;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  } else {
    currentLocation.alamat = "Browser tidak mendukung GPS";
  }
}

function startTimemark() {
  if (animationFrame) cancelAnimationFrame(animationFrame);

  function update() {
    const hariEl = document.getElementById('previewHari');
    const jamEl = document.getElementById('previewJam');
    const namaEl = document.getElementById('previewNama');
    const gpsEl = document.getElementById('previewGps');

    if (hariEl && jamEl && namaEl) {
      const now = new Date();
      hariEl.innerText = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      jamEl.innerText = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      namaEl.innerText = user? `👤 ${user.nama}` : '';
      if (gpsEl) gpsEl.innerText = `📍 ${currentLocation.alamat}`;
    }

    const modalCam = document.getElementById('modalCam');
    if (modalCam &&!modalCam.classList.contains('hidden')) {
      animationFrame = requestAnimationFrame(update);
    }
  }
  update();
}

function bukaKameraAbsen(type) {
  currentType = type;
  currentLocation.alamat = 'Mengunci Posisi Satelit...';
  dapatkanLokasiGPS();
  openCam();
}

function openCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  startTimemark();

  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
.then(s => {
      stream = s;
      document.getElementById('video').srcObject = s;
    })
.catch(err => {
      alert('Gagal mengakses kamera: ' + err.message);
      closeCam();
    });
}

function closeCam() {
  const modal = document.getElementById('modalCam');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (animationFrame) cancelAnimationFrame(animationFrame);
}

async function capture() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const btn = document.getElementById('btnCapture');

  if (!video ||!canvas) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengirim Absen...';

  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(10, canvas.height - 110, 320, 100);

  ctx.strokeStyle = "#800000";
  ctx.lineWidth = 4;
  ctx.strokeRect(10, canvas.height - 110, 4, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Arial";
  const tglTeks = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(tglTeks, 25, canvas.height - 85);

  ctx.fillStyle = "#facc15";
  ctx.font = "bold 16px Arial";
  const jamTeks = new Date().toLocaleTimeString('id-ID');
  ctx.fillText(jamTeks, 25, canvas.height - 65);

  ctx.fillStyle = "#ffffff";
  ctx.font = "13px Arial";
  ctx.fillText(`Nama: ${user.nama}`, 25, canvas.height - 45);

  ctx.fillStyle = "#4ade80";
  ctx.font = "mono 11px Courier New";
  ctx.fillText(`GPS: ${currentLocation.lat}, ${currentLocation.long}`, 25, canvas.height - 20);

  const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);

  const kirimData = {
    username: user.username,
    tipeAbsen: currentType,
    foto: fotoBase64,
    lat: currentLocation.lat,
    long: currentLocation.long
  };

  const res = await api('absen', kirimData);
  alert(res.message);

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Kirim Absen';

  if (res.status === 'success') {
    closeCam();
    cekStatus();
  }
}

async function api(aksi, payload = {}) {
  try {
    console.log('API call:', aksi, payload);
    const response = await fetch(URL_GAS, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ aksi, data: payload })
    });
    const data = await response.json();
    console.log('API response:', data);
    return data;
  } catch (error) {
    console.error('API error:', error);
    return { status: 'error', message: 'Koneksi internet bermasalah / GAS Error: ' + error.message };
  }
}

function openProfil() { document.getElementById('modalProfil').classList.replace('hidden', 'flex'); }
function closeProfil() { document.getElementById('modalProfil').classList.replace('flex', 'hidden'); }
function openEditProfil() { closeProfil(); document.getElementById('modalEditProfil').classList.replace('hidden', 'flex'); }
function closeEditProfil() { document.getElementById('modalEditProfil').classList.replace('flex', 'hidden'); }
function openGantiPassword() { closeProfil(); document.getElementById('modalGantiPassword').classList.replace('hidden', 'flex'); }
function closeGantiPassword() { document.getElementById('modalGantiPassword').classList.replace('flex', 'hidden'); }
function gantiFotoProfil() { document.getElementById('inputFotoProfil').click(); }

async function uploadFotoProfil(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    document.getElementById('fotoProfil').src = base64;
    const res = await api('uploadFoto', { username: user.username, fotoBase64: base64 });
    if (res.status === 'success') {
      user.foto = res.urlFoto;
      localStorage.setItem('user', JSON.stringify(user));
      document.getElementById('avatarNav').src = res.urlFoto;
      alert('Foto profil berhasil diupdate');
    } else {
      alert(res.message);
    }
  };
  reader.readAsDataURL(file);
}

async function simpanProfil() {
  const btn = document.getElementById('btnSimpanProfil');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Menyimpan...';

  const d = {
    username: user.username,
    nama: document.getElementById('editNama').value,
    ktp: document.getElementById('editKtp').value,
    hp: document.getElementById('editHp').value,
    alamat: document.getElementById('editAlamat').value,
    ttl: document.getElementById('editTtl').value,
    bank: document.getElementById('editBank').value,
    rekening: document.getElementById('editRek').value
  };
  const res = await api('updateProfil', d);
  if(res.status==='success') {
    user={...user,...d};
    localStorage.setItem('user', JSON.stringify(user));
    closeEditProfil();
    renderDashboard();
    alert(res.message);
  } else {
    alert(res.message);
  }
  btn.disabled = false;
  btn.innerHTML = 'Simpan';
}

async function gantiPassword() {
  const btn = document.getElementById('btnGantiPass');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Update...';

  const res = await api('gantiPassword', {
    username: user.username,
    passLama: document.getElementById('passLama').value,
    passBaru: document.getElementById('passBaru').value
  });
  alert(res.message);
  if(res.status==='success') {
    document.getElementById('passLama').value = '';
    document.getElementById('passBaru').value = '';
    closeGantiPassword();
  }
  btn.disabled = false;
  btn.innerHTML = 'Update';
}

console.log('Starting app...');
render();
