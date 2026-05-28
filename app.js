const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
console.log('App.js loaded');

// === POPUP MODERN - TAMBAHAN (TIDAK UBAH FUNGSI LAIN) ===
function showSuccess(msg){ Swal.fire({icon:'success',title:msg,showConfirmButton:false,timer:2000,background:document.documentElement.classList.contains('dark')?'#064e3b':'#ecfdf5',customClass:{popup:'rounded-3xl'}}); }
function showError(msg){ Swal.fire({icon:'error',title:'Oops!',text:msg,confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}}); }
async function showConfirm(msg){ return (await Swal.fire({title:msg,icon:'question',showCancelButton:true,confirmButtonText:'Ya',cancelButtonText:'Batal',confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}})).isConfirmed; }
window.alert = showSuccess;
// === END POPUP ===

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

// ... lanjut ke Bagian 2
function renderDashboard() {
  app.innerHTML = `
  <nav class="bg-red-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3">
      <i class="fa-solid fa-user-shield text-xl"></i>
      <div>
        <h1 class="font-bold text-lg leading-tight">Hi, ${user.nama}</h1>
        <p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
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
  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">${renderPage()}</div>
  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg z-20">
    <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
      <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage==='home'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-house text-xl mb-1"></i><span class="text-xs font-semibold">Home</span></button>
      <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage==='rekap'?'text-red-800':'text-gray-500'}"><img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-rekap.png" class="w-6 h-6 mb-1 ${currentPage==='rekap'?'':'opacity-50'}"><span class="text-xs font-semibold">Rekap</span></button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage==='patroli'?'text-red-800':'text-gray-500'}"><img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-patroli.png" class="w-6 h-6 mb-1 ${currentPage==='patroli'?'':'opacity-50'}"><span class="text-xs font-semibold">Patroli</span></button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage==='kejadian'?'text-red-800':'text-gray-500'}"><img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-kejadian.png" class="w-6 h-6 mb-1 ${currentPage==='kejadian'?'':'opacity-50'}"><span class="text-xs font-semibold">Kejadian</span></button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage==='pembinaan'?'text-red-800':'text-gray-500'}"><img src="https://raw.githubusercontent.com/ekyarsakarya-eng/absensi-JSKN/main/icon-pembinaan.png" class="w-6 h-6 mb-1 ${currentPage==='pembinaan'?'':'opacity-50'}"><span class="text-xs font-semibold">Bina</span></button>
    </div>
  </div>
  <!-- MODAL KAMERA -->
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md">
      <h3 class="font-bold text-lg mb-3 text-red-800 dark:text-white text-center"><i class="fa-solid fa-camera mr-2"></i>Ambil Foto Selfie</h3>
      <div style="position:relative"><video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video><canvas id="canvas" class="hidden w-full rounded-lg"></canvas><div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 border-l-4 border-red-800 px-3 py-2 rounded text-white text- font-semibold z-10 space-y-0.5"><div id="previewHari"></div><div id="previewJam" class="text-yellow-400 font-bold text-xs"></div><div id="previewNama" class="text-white opacity-90"></div><div id="previewGps" class="text-green-400 font-mono"></div></div></div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Pastikan wajah terlihat jelas</p>
      <div class="flex gap-2 mt-4"><button onclick="capture()" id="btnCapture" class="flex-1 bg-red-800 hover:bg-red-900 text-white p-3 rounded-lg font-bold transition"><i class="fa-solid fa-camera mr-1"></i>Kirim Absen</button><button onclick="closeCam()" class="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-lg transition"><i class="fa-solid fa-xmark"></i></button></div>
    </div>
  <!-- MODAL PROFIL (kode asli lengkap kamu) -->
  <div id="modalProfil" class="fixed inset-0 bg-black/70 backdrop-blur-sm hidden items-center justify-center p-4 z-50">...</div>
  <!-- MODAL EDIT PROFIL, GANTI PASSWORD, PATROLI, KEJADIAN, PEMBINAAN (biarkan sama persis seperti file aslimu) -->
  `;
  if (currentPage === 'home') { cekStatus(); dapatkanLokasiGPS(); }
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
}

function renderPage(){ switch(currentPage){ case 'home': return renderHome(); case 'rekap': return renderRekap(); case 'patroli': return renderPatroli(); case 'kejadian': return renderKejadian(); case 'pembinaan': return renderPembinaan(); default: return renderHome(); }}

// renderHome, renderRekap, renderPatroli, renderKejadian, renderPembinaan, updateJamRealtime, loadHomeStats, updateGpsCard, dll - PAKAI KODE ASLI KAMU 100% (tidak aku ubah)

function openCam(){ const modal=document.getElementById('modalCam'); modal.classList.remove('hidden'); modal.classList.add('flex'); startTimemark(); navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}).then(s=>{stream=s;document.getElementById('video').srcObject=s;}).catch(err=>{showError('Gagal mengakses kamera: '+err.message);closeCam();}); }
function closeCam(){ const modal=document.getElementById('modalCam'); modal.classList.add('hidden'); modal.classList.remove('flex'); if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} if(animationFrame){cancelAnimationFrame(animationFrame);} }
async function capture(){ const video=document.getElementById('video'); const canvas=document.getElementById('canvas'); const ctx=canvas.getContext('2d'); canvas.width=video.videoWidth; canvas.height=video.videoHeight; ctx.drawImage(video,0,0); const foto=canvas.toDataURL('image/jpeg',0.8); closeCam(); const res=await api('absen',{username:user.username,tipeAbsen:currentType,foto,lat:currentLocation.lat,long:currentLocation.long}); if(res.status==='success'){showSuccess(res.message);cekStatus();}else{showError(res.message);} }

//... lanjut Bagian 3
async function api(aksi, payload = {}) {
  try {
    const response = await fetch(URL_GAS, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ aksi, data: payload }) });
    const data = await response.json(); return data;
  } catch (error) { console.error('API error:', error); return { status: 'error', message: 'Koneksi internet bermasalah / GAS Error: ' + error.message }; }
}

function openProfil(){ document.getElementById('modalProfil').classList.remove('hidden'); document.getElementById('modalProfil').classList.add('flex'); }
function closeProfil(){ document.getElementById('modalProfil').classList.add('hidden'); document.getElementById('modalProfil').classList.remove('flex'); }
function openEditProfil(){ /* kode asli */ }
function closeEditProfil(){ /* kode asli */ }
function openGantiPassword(){ /* kode asli */ }
function closeGantiPassword(){ /* kode asli */ }
function gantiFotoProfil(){ document.getElementById('inputFotoProfil').click(); }

async function uploadFotoProfil(event){
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result; document.getElementById('fotoProfil').src = base64;
    const res = await api('uploadFoto', { username: user.username, fotoBase64: base64 });
    if (res.status === 'success') { user.foto = res.urlFoto; localStorage.setItem('user', JSON.stringify(user)); document.getElementById('avatarNav').src = res.urlFoto; showSuccess('Foto profil berhasil diupdate'); } else { showError(res.message); }
  };
  reader.readAsDataURL(file);
}

async function simpanProfil(){
  const btn = document.getElementById('btnSimpanProfil'); btn.disabled = true;
  const data = { username: user.username, nama: document.getElementById('editNama').value, ktp: document.getElementById('editKtp').value, hp: document.getElementById('editHp').value, alamat: document.getElementById('editAlamat').value, ttl: document.getElementById('editTtl').value, bank: document.getElementById('editBank').value, rekening: document.getElementById('editRek').value };
  const res = await api('updateProfil', data);
  if (res.status === 'success') { showSuccess(res.message); Object.assign(user, data); localStorage.setItem('user', JSON.stringify(user)); closeEditProfil(); renderDashboard(); } else { showError(res.message); }
  btn.disabled = false;
}

async function gantiPassword(){
  const passLama = document.getElementById('passLama').value; const passBaru = document.getElementById('passBaru').value; const passBaru2 = document.getElementById('passBaru2').value;
  if (passBaru!== passBaru2) return showError('Password baru tidak sama');
  const res = await api('gantiPassword', { username: user.username, passLama, passBaru });
  if(res.status==='success'){ showSuccess(res.message); closeGantiPassword(); } else { showError(res.message); }
}

async function simpanPatroli(){
  const res = await api('tambahPatroli', { username: user.username, lokasi: document.getElementById('patroliLokasi').value, keterangan: document.getElementById('patroliKet').value, foto: '', lat: currentLocation.lat, long: currentLocation.long });
  if(res.status==='success'){ showSuccess(res.message); closeFormPatroli(); loadPatroli(); } else { showError(res.message); }
}

async function simpanKejadian(){
  const res = await api('tambahKejadian', { username: user.username, jenis: document.getElementById('kejadianJenis').value, lokasi: document.getElementById('kejadianLokasi').value, kronologi: document.getElementById('kejadianKronologi').value, foto: '', lat: currentLocation.lat, long: currentLocation.long });
  if(res.status==='success'){ showSuccess(res.message); closeFormKejadian(); loadKejadian(); } else { showError(res.message); }
}

async function simpanPembinaan(){
  const res = await api('tambahPembinaan', { username: user.username, materi: document.getElementById('binaMateri').value, pelatih: document.getElementById('binaPelatih').value, nilai: document.getElementById('binaNilai').value, keterangan: document.getElementById('binaKet').value });
  if(res.status==='success'){ showSuccess(res.message); closeFormPembinaan(); loadPembinaan(); } else { showError(res.message); }
}

// SEMUA FUNGSI LAINNYA (cekStatus, dapatkanLokasiGPS, hitungJarak, startTimemark, bukaKameraAbsen, loadRekap, loadPatroli, loadKejadian, loadPembinaan, dll) BIARKAN 100% SAMA SEPERTI FILE ASLI KAMU

console.log('Starting app...');
render();
