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

async function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!username || !password) return alert('Username & password wajib diisi');
  
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
  isDark = !isDark;
  localStorage.setItem('dark', isDark);
  document.documentElement.classList.toggle('dark');
  document.getElementById('darkIcon').className = `fa-solid ${isDark? 'fa-sun' : 'fa-moon'} text-xl`;
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
  
  <!-- MODAL KAMERA + TIMEMARK -->
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-maroon dark:text-white text-center">
        <i class="fa-solid fa-camera mr-2"></i>Ambil Foto Selfie
      </h3>
      <div style="position:relative">
        <video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video>
        <canvas id="canvas" class="hidden w-full rounded-lg"></canvas>
        <div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 border-l-4 border-maroon px-3 py-2 rounded text-white text-xs font-semibold">
          <div id="previewHari"></div>
          <div id="previewJam" class="text-yellow-400 text-sm font-bold"></div>
          <div id="previewNama" class="text- opacity-80"></div>
        </div>
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
  <div id="modalProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w- overflow-hidden shadow-2xl">
      <div class="bg-maroon px-5 pt-8 pb-6 relative">
        <button onclick="closeProfil()" class="absolute top-3 right-3 bg-white/95 hover:bg-white text-maroon w-9 h-9 rounded-full transition shadow-xl hover:rotate-90 hover:scale-110 flex items-center justify-center z-20">
          <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="text-center">
          <div class="relative inline-block mb-3">
            <img id="fotoProfil" src="${user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=fff&color=800000&size=256'}"
                 class="w-24 h-24 rounded-2xl object-cover mx-auto border-4 border-white shadow-2xl">
            <button onclick="gantiFotoProfil()" class="absolute -bottom-1 -right-1 bg-white text-maroon w-9 h-9 rounded-xl shadow-xl hover:bg-gray-50 transition hover:scale-110 flex items-center justify-center">
              <i class="fa-solid fa-camera"></i>
            </button>
          </div>
          <h3 class="font-extrabold text-xl text-white mb-1" style="text-shadow: 0 2px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)">${user.nama}</h3>
          <p class="text-sm text-white/90 font-medium" style="text-shadow: 0 1px 6px rgba(0,0,0,0.6)">@${user.username}</p>
        </div>
      </div>
      
      <div class="p-4 space-y-2">
        <button onclick="openEditProfil()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-maroon/5 dark:hover:bg-maroon/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-98 group">
          <div class="w-12 h-12 bg-maroon/10 text-maroon rounded-xl flex items-center justify-center group-hover:bg-maroon group-hover:text-white transition">
            <i class="fa-solid fa-user-pen text-lg"></i>
          </div>
          <div class="text-left flex-1">
            <p class="font-bold text-sm text-gray-900 dark:text-white">Edit Profil</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Ubah data diri & bank</p>
          </div>
          <i class="fa-solid fa-chevron-right text-gray-400"></i>
        </button>
        
        <button onclick="openGantiPassword()" class="w-full flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 hover:bg-maroon/5 dark:hover:bg-maroon/10 rounded-2xl transition-all hover:scale-[1.02] active:scale-98 group">
          <div class="w-12 h-12 bg-maroon/10 text-maroon rounded-xl flex items-center justify-center group-hover:bg-maroon group-hover:text-white transition">
            <i class="fa-solid fa-key text-lg"></i>
          </div>
          <div class="text-left flex-1">
            <p class="font-bold text-sm text-gray-900 dark:text-white">Ganti Password</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Ubah kata sandi akun</p>
          </div>
          <i class="fa-solid fa-chevron-right text-gray-400"></i>
        </button>
        
        <button onclick="logout()" class="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-2xl transition-all hover:scale-[1.02] active:scale-98 group">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition">
            <i class="fa-solid fa-right-from-bracket text-lg"></i>
          </div>
          <div class="text-left flex-1">
            <p class="font-bold text-sm text-red-600 dark:text-red-400">Logout</p>
            <p class="text-xs text-red-500 dark:text-red-500/70">Keluar dari aplikasi</p>
          </div>
          <i class="fa-solid fa-chevron-right text-red-400"></i>
        </button>
      </div>
      
      <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
    </div>
  </div>

  <!-- MODAL EDIT PROFIL -->
  <div id="modalEditProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w- max-h- flex flex-col shadow-2xl">
      <div class="bg-maroon px-5 py-4 rounded-t-3xl flex items-center justify-between shrink-0">
        <h3 class="font-bold text-lg text-white"><i class="fa-solid fa-user-pen mr-2"></i>Edit Profil</h3>
        <button onclick="closeEditProfil()" class="text-white/80 hover:text-white">
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Nama Lengkap</label>
          <input id="editNama" value="${user.nama||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No KTP</label>
            <input id="editKtp" value="${user.ktp||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No HP</label>
            <input id="editHp" value="${user.hp||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
        </div>
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Alamat</label>
          <textarea id="editAlamat" rows="2" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition resize-none">${user.alamat||''}</textarea>
        </div>
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Tempat, Tgl Lahir</label>
          <input id="editTtl" value="${user.ttl||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">Bank</label>
            <input id="editBank" value="${user.bank||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No Rekening</label>
            <input id="editRek" value="${user.rekening||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
        </div>
      </div>
      <div class="p-4 pt-2 shrink-0">
        <button onclick="simpanProfil()" class="w-full bg-gradient-to-r from-maroon to-red-700 hover:shadow-xl hover:shadow-maroon/30 text-white py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-98">
          <i class="fa-solid fa-floppy-disk mr-2"></i>Simpan Perubahan
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL GANTI PASSWORD -->
  <div id="modalGantiPassword" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w- overflow-hidden shadow-2xl">
      <div class="bg-maroon px-5 py-4 flex items-center justify-between">
        <h3 class="font-bold text-lg text-white"><i class="fa-solid fa-key mr-2"></i>Ganti Password</h3>
        <button onclick="closeGantiPassword()" class="text-white/80 hover:text-white">
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      <div class="p-4 space-y-3">
        <div class="bg-maroon/5 border-l-4 border-maroon rounded-xl p-3">
          <p class="text-xs text-maroon font-semibold"><i class="fa-solid fa-shield-halved mr-1.5"></i>Kosongkan jika tidak ganti password</p>
        </div>
        <div class="relative">
          <label class="text-xs font-bold text-maroon block mb-1.5">Password Lama</label>
          <input id="passLama" type="password" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition pr-11">
          <i onclick="togglePassProfil('passLama', this)" class="fa-solid fa-eye absolute right-4 top-9 cursor-pointer text-gray-400 hover:text-maroon"></i>
        </div>
        <div class="relative">
          <label class="text-xs font-bold text-maroon block mb-1.5">Password Baru</label>
          <input id="passBaru" type="password" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition pr-11">
          <i onclick="togglePassProfil('passBaru', this)" class="fa-solid fa-eye absolute right-4 top-9 cursor-pointer text-gray-400 hover:text-maroon"></i>
        </div>
        <button onclick="gantiPassword()" class="w-full bg-gradient-to-r from-maroon to-red-700 hover:shadow-xl hover:shadow-maroon/30 text-white py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-98">
          <i class="fa-solid fa-key mr-2"></i>Update Password
        </button>
      </div>
    </div>
  </div>`;
  
  if (currentPage === 'home') cekStatus();
}

// ==================== FUNCTION MODAL PROFIL ====================
function openProfil() {
  document.getElementById('modalProfil').classList.remove('hidden');
  document.getElementById('modalProfil').classList.add('flex');
}

function closeProfil() {
  document.getElementById('modalProfil').classList.add('hidden');
  document.getElementById('modalProfil').classList.remove('flex');
}

function openEditProfil() {
  closeProfil(); // Tutup modal profil dulu
  document.getElementById('modalEditProfil').classList.remove('hidden');
  document.getElementById('modalEditProfil').classList.add('flex');
}

function closeEditProfil() {
  document.getElementById('modalEditProfil').classList.add('hidden');
  document.getElementById('modalEditProfil').classList.remove('flex');
}

function openGantiPassword() {
  closeProfil(); // Tutup modal profil dulu
  document.getElementById('modalGantiPassword').classList.remove('hidden');
  document.getElementById('modalGantiPassword').classList.add('flex');
}

function closeGantiPassword() {
  document.getElementById('modalGantiPassword').classList.add('hidden');
  document.getElementById('modalGantiPassword').classList.remove('flex');
  document.getElementById('passLama').value = '';
  document.getElementById('passBaru').value = '';
}

function gantiFotoProfil() {
  document.getElementById('inputFotoProfil').click();
}

async function uploadFotoProfil(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 5000000) {
    return alert('Ukuran foto maksimal 5MB');
  }
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    const fotoBase64 = e.target.result;
    
    // Preview dulu
    document.getElementById('fotoProfil').src = fotoBase64;
    document.getElementById('avatarNav').src = fotoBase64;
    
    // Upload ke server
    const res = await api('uploadFoto', {
      username: user.username,
      fotoBase64: fotoBase64
    });
    
    if (res.status === 'success') {
      user.foto = fotoBase64;
      localStorage.setItem('user', JSON.stringify(user));
      alert('Foto profil berhasil diubah!');
    } else {
      alert('Gagal upload: ' + res.message);
      // Balikin foto lama
      document.getElementById('fotoProfil').src = user.foto || 'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff';
    }
  };
  reader.readAsDataURL(file);
}

<!-- MODAL EDIT PROFIL -->
  <div id="modalEditProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w- max-h- flex flex-col shadow-2xl">
      <div class="bg-maroon px-5 py-4 rounded-t-3xl flex items-center justify-between shrink-0">
        <h3 class="font-bold text-lg text-white"><i class="fa-solid fa-user-pen mr-2"></i>Edit Profil</h3>
        <button onclick="closeEditProfil()" class="text-white/80 hover:text-white">
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Nama Lengkap</label>
          <input id="editNama" value="${user.nama||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No KTP</label>
            <input id="editKtp" value="${user.ktp||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No HP</label>
            <input id="editHp" value="${user.hp||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
        </div>
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Alamat</label>
          <textarea id="editAlamat" rows="2" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition resize-none">${user.alamat||''}</textarea>
        </div>
        <div>
          <label class="text-xs font-bold text-maroon block mb-1.5">Tempat, Tgl Lahir</label>
          <input id="editTtl" value="${user.ttl||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">Bank</label>
            <input id="editBank" value="${user.bank||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
          <div>
            <label class="text-xs font-bold text-maroon block mb-1.5">No Rekening</label>
            <input id="editRek" value="${user.rekening||''}" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition">
          </div>
        </div>
      </div>
      <div class="p-4 pt-2 shrink-0">
        <button onclick="simpanProfil()" class="w-full bg-gradient-to-r from-maroon to-red-700 hover:shadow-xl hover:shadow-maroon/30 text-white py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-98">
          <i class="fa-solid fa-floppy-disk mr-2"></i>Simpan Perubahan
        </button>
      </div>
    </div>
  </div>

  <!-- MODAL GANTI PASSWORD -->
  <div id="modalGantiPassword" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-[60]">
    <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w- overflow-hidden shadow-2xl">
      <div class="bg-maroon px-5 py-4 flex items-center justify-between">
        <h3 class="font-bold text-lg text-white"><i class="fa-solid fa-key mr-2"></i>Ganti Password</h3>
        <button onclick="closeGantiPassword()" class="text-white/80 hover:text-white">
          <i class="fa-solid fa-xmark text-xl"></i>
        </button>
      </div>
      <div class="p-4 space-y-3">
        <div class="bg-maroon/5 border-l-4 border-maroon rounded-xl p-3">
          <p class="text-xs text-maroon font-semibold"><i class="fa-solid fa-shield-halved mr-1.5"></i>Kosongkan jika tidak ganti password</p>
        </div>
        <div class="relative">
          <label class="text-xs font-bold text-maroon block mb-1.5">Password Lama</label>
          <input id="passLama" type="password" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition pr-11">
          <i onclick="togglePassProfil('passLama', this)" class="fa-solid fa-eye absolute right-4 top-9 cursor-pointer text-gray-400 hover:text-maroon"></i>
        </div>
        <div class="relative">
          <label class="text-xs font-bold text-maroon block mb-1.5">Password Baru</label>
          <input id="passBaru" type="password" class="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:border-maroon focus:ring-4 focus:ring-maroon/10 outline-none transition pr-11">
          <i onclick="togglePassProfil('passBaru', this)" class="fa-solid fa-eye absolute right-4 top-9 cursor-pointer text-gray-400 hover:text-maroon"></i>
        </div>
        <button onclick="gantiPassword()" class="w-full bg-gradient-to-r from-maroon to-red-700 hover:shadow-xl hover:shadow-maroon/30 text-white py-3.5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-98">
          <i class="fa-solid fa-key mr-2"></i>Update Password
        </button>
      </div>
    </div>
  </div>`;

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
    closeEditProfil();
    renderDashboard();
  }
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
    closeGantiPassword();
  }
}
