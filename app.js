const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
console.log('App.js loaded');

// === POPUP MODERN ===
function showSuccess(msg){
  Swal.fire({
    icon: 'success',
    title: msg,
    showConfirmButton: false,
    timer: 2000,
    background: document.documentElement.classList.contains('dark') ? '#064e3b' : '#ecfdf5',
    customClass: {popup:'rounded-3xl'}
  });
}
function showError(msg){
  Swal.fire({
    icon: 'error',
    title: 'Oops!',
    text: msg,
    confirmButtonColor: '#800000',
    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
    customClass: {popup:'rounded-3xl'}
  });
}
async function showConfirm(msg){
  const r = await Swal.fire({
    title: msg,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#800000',
    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
    customClass: {popup:'rounded-3xl'}
  });
  return r.isConfirmed;
}
window.alert = showSuccess;

// === PWA INSTALL ===
let deferredPrompt;
const installPopup = document.getElementById('installPopup');
const btnInstall = document.getElementById('btnInstall');

const isInStandaloneMode = () => 
  window.matchMedia('(display-mode: standalone)').matches || 
  window.navigator.standalone || 
  document.referrer.includes('android-app://');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isInStandaloneMode()) {
    installPopup.classList.remove('hidden');
    installPopup.classList.add('flex');
  }
});

btnInstall?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    installPopup.classList.add('hidden');
  }
  deferredPrompt = null;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

if (isInStandaloneMode()) {
  installPopup?.classList.add('hidden');
}

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
  // lanjutkan template dari PART 1 (sudah ada nav + modal kamera + modal profil)
  // tambahkan sisa modal di bawah ini sebelum penutup backtick
  const existingHTML = document.getElementById('app').innerHTML; // tidak dipakai, hanya untuk referensi
}

// === LANJUTAN TEMPLATE (paste ini MENGGANTIKAN akhir renderDashboard di PART 1) ===
function renderDashboardFull() {
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

  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">${renderPage()}</div>

  <div class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700 shadow-lg z-20">
    <div class="grid grid-cols-5 gap-1 max-w-2xl mx-auto">
      <button onclick="switchPage('home')" class="flex flex-col items-center py-2 ${currentPage==='home'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-house text-xl mb-1"></i><span class="text-xs font-semibold">Home</span></button>
      <button onclick="switchPage('rekap')" class="flex flex-col items-center py-2 ${currentPage==='rekap'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-calendar text-xl mb-1"></i><span class="text-xs font-semibold">Rekap</span></button>
      <button onclick="switchPage('patroli')" class="flex flex-col items-center py-2 ${currentPage==='patroli'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-route text-xl mb-1"></i><span class="text-xs font-semibold">Patroli</span></button>
      <button onclick="switchPage('kejadian')" class="flex flex-col items-center py-2 ${currentPage==='kejadian'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-triangle-exclamation text-xl mb-1"></i><span class="text-xs font-semibold">Kejadian</span></button>
      <button onclick="switchPage('pembinaan')" class="flex flex-col items-center py-2 ${currentPage==='pembinaan'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-graduation-cap text-xl mb-1"></i><span class="text-xs font-semibold">Bina</span></button>
    </div>
  </div>

  <!-- MODAL KAMERA, PROFIL, EDIT, DLL (gunakan HTML asli kamu, tidak diubah) -->
  `;

  if (currentPage === 'home') { cekStatus(); dapatkanLokasiGPS(); }
  if (currentPage === 'rekap') loadRekap();
  if (currentPage === 'patroli') loadPatroli();
  if (currentPage === 'kejadian') loadKejadian();
  if (currentPage === 'pembinaan') loadPembinaan();
}

// === OVERRIDE renderDashboard lama dengan yang baru ===
renderDashboard = renderDashboardFull;

function renderPage(){ switch(currentPage){ case 'home': return renderHome(); case 'rekap': return renderRekap(); case 'patroli': return renderPatroli(); case 'kejadian': return renderKejadian(); case 'pembinaan': return renderPembinaan(); default: return renderHome(); } }

function renderHome(){ const { bisaIn=false,bisaOut=false,lock12Jam=false,sisaJam=0,jamMasuk='--:--',jamPulang='--:--'}=statusServer; return `<div class="space-y-4"><button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn?'disabled':''} class="w-full py-4 bg-green-600 text-white rounded-xl">Absen Masuk (${jamMasuk})</button><button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut?'disabled':''} class="w-full py-4 bg-red-800 text-white rounded-xl">Absen Pulang (${jamPulang})</button>${lock12Jam?`<p class="text-amber-600">Terkunci ${sisaJam} jam lagi</p>`:''}</div>`; }
function renderRekap(){ return `<div id="listRekap">Loading...</div>`; }
function renderPatroli(){ return `<div id="listPatroli">Loading...</div>`; }
function renderKejadian(){ return `<div id="listKejadian">Loading...</div>`; }
function renderPembinaan(){ return `<div id="listPembinaan">Loading...</div>`; }

function switchPage(p){ currentPage=p; renderDashboard(); }

function openCam(){
  const modal=document.getElementById('modalCam');
  modal.classList.remove('hidden'); modal.classList.add('flex');
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}}).then(s=>{stream=s;document.getElementById('video').srcObject=s}).catch(e=>{showError('Gagal akses kamera: '+e.message);closeCam();});
}
function closeCam(){ document.getElementById('modalCam').classList.add('hidden'); if(stream){stream.getTracks().forEach(t=>t.stop()); stream=null;} }

async function capture(){
  const video=document.getElementById('video'), canvas=document.getElementById('canvas');
  const ctx=canvas.getContext('2d'); canvas.width=video.videoWidth; canvas.height=video.videoHeight; ctx.drawImage(video,0,0);
  const foto=canvas.toDataURL('image/jpeg',0.7);
  closeCam();
  const res=await api('absen',{username:user.username,tipeAbsen:currentType,foto,lat:currentLocation.lat,long:currentLocation.long});
  if(res.status==='success'){ showSuccess(res.message); cekStatus(); } else { showError(res.message); }
}

async function api(aksi,payload={}){ try{ const r=await fetch(URL_GAS,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({aksi,data:payload})}); return await r.json(); }catch(e){ return {status:'error',message:e.message}; } }

async function simpanPatroli(){ const res=await api('tambahPatroli',{username:user.username,lokasi:'test',keterangan:'',foto:''}); res.status==='success'?showSuccess(res.message):showError(res.message); }
async function simpanKejadian(){ const res=await api('tambahKejadian',{username:user.username,jenis:'Lainnya',lokasi:'',kronologi:''}); res.status==='success'?showSuccess(res.message):showError(res.message); }
async function simpanPembinaan(){ const res=await api('tambahPembinaan',{username:user.username,materi:'',pelatih:'',nilai:0}); res.status==='success'?showSuccess(res.message):showError(res.message); }
async function simpanProfil(){ const res=await api('updateProfil',{username:user.username,nama:user.nama}); res.status==='success'?showSuccess(res.message):showError(res.message); }
async function gantiPassword(){ const res=await api('gantiPassword',{username:user.username,passLama:'',passBaru:''}); res.status==='success'?showSuccess(res.message):showError(res.message); }
async function uploadFotoProfil(e){ const res=await api('uploadFoto',{username:user.username,fotoBase64:''}); res.status==='success'?showSuccess('Foto diupdate'):showError(res.message); }

function openProfil(){ document.getElementById('modalProfil')?.classList.replace('hidden','flex'); }
function closeProfil(){ document.getElementById('modalProfil')?.classList.replace('flex','hidden'); }
function openEditProfil(){}
function closeEditProfil(){}
function openGantiPassword(){}
function closeGantiPassword(){}
function gantiFotoProfil(){ document.getElementById('inputFotoProfil')?.click(); }
function bukaKameraAbsen(t){ currentType=t; openCam(); }
function cekStatus(){ api('cekStatus',{username:user.username}).then(r=>{ if(r.status==='success'){ statusServer=r; document.getElementById('contentArea').innerHTML=renderPage(); } }); }
function dapatkanLokasiGPS(){ if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(p=>{ currentLocation.lat=p.coords.latitude.toFixed(6); currentLocation.long=p.coords.longitude.toFixed(6); }); } }
function loadRekap(){}
function loadPatroli(){}
function loadKejadian(){}
function loadPembinaan(){}

console.log('Starting app...');
render();
