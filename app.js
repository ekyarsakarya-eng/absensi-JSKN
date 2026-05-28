const URL_GAS = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
console.log('App.js loaded - FINAL');

// POPUP
function showSuccess(msg){ Swal.fire({icon:'success',title:msg,showConfirmButton:false,timer:2000,background:document.documentElement.classList.contains('dark')?'#064e3b':'#ecfdf5',customClass:{popup:'rounded-3xl'}}); }
function showError(msg){ Swal.fire({icon:'error',title:'Oops!',text:msg,confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}}); }
async function showConfirm(msg){ return (await Swal.fire({title:msg,icon:'question',showCancelButton:true,confirmButtonText:'Ya',cancelButtonText:'Batal',confirmButtonColor:'#800000',background:document.documentElement.classList.contains('dark')?'#1f2937':'#fff',customClass:{popup:'rounded-3xl'}})).isConfirmed; }
window.alert = showSuccess;

// PWA
let deferredPrompt; const installPopup=document.getElementById('installPopup'); const btnInstall=document.getElementById('btnInstall');
const isInStandaloneMode=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone||document.referrer.includes('android-app://');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(!isInStandaloneMode()){installPopup.classList.remove('hidden');installPopup.classList.add('flex');}});
btnInstall?.addEventListener('click',async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;installPopup.classList.add('hidden');deferredPrompt=null;});
if('serviceWorker'in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js'));}
if(isInStandaloneMode()){installPopup?.classList.add('hidden');}

const app=document.getElementById('app'); let user=JSON.parse(localStorage.getItem('user')||'null'); let isDark=localStorage.getItem('dark')==='true';
let currentType=''; let stream=null; let animationFrame=null; let currentLocation={lat:0,long:0,alamat:'Mencari sinyal GPS...'};
let currentPage='home'; let statusServer={}; let dataRekap=[]; let dataPatroli=[]; let dataKejadian=[]; let dataPembinaan=[];
if(isDark)document.documentElement.classList.add('dark');

function render(){if(!user)return renderLogin();renderDashboard();}
function renderLogin(){app.innerHTML=`<div class="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-red-800 to-red-900"><div class="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-md"><div class="text-center mb-6"><div class="bg-red-800 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-3 shadow-lg"><i class="fa-solid fa-fingerprint text-white text-2xl"></i></div><h1 class="text-2xl font-bold text-red-800 dark:text-white">Absensi Karyawan</h1></div><div class="space-y-4"><input id="username" placeholder="Username" class="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white"><div class="relative"><input id="password" type="password" placeholder="Password" class="w-full p-3 border rounded-lg dark:bg-gray-700 dark:text-white"><i id="eyeIcon" onclick="togglePass()" class="fa-solid fa-eye absolute right-3 top-4 cursor-pointer text-gray-400"></i></div><button onclick="login()" id="btnLogin" class="w-full bg-red-800 text-white p-3 rounded-lg font-bold"><i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk</button></div></div></div>`;}
async function login(){const u=document.getElementById('username').value.trim();const p=document.getElementById('password').value.trim();if(!u||!p)return showError('Username & password wajib');const b=document.getElementById('btnLogin');b.disabled=true;b.innerHTML='<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';const r=await api('login',{username:u,password:p});if(r.status==='success'){user=r;localStorage.setItem('user',JSON.stringify(user));render();}else{showError(r.message);b.disabled=false;b.innerHTML='<i class="fa-solid fa-right-to-bracket mr-2"></i>Masuk';}}
async function logout(){if(!(await showConfirm('Yakin mau logout?')))return;localStorage.removeItem('user');user=null;currentPage='home';render();}
function togglePass(){const p=document.getElementById('password');const i=document.getElementById('eyeIcon');p.type=p.type==='password'?'text':'password';i.classList.toggle('fa-eye');i.classList.toggle('fa-eye-slash');}
function toggleDark(){isDark=!isDark;localStorage.setItem('dark',isDark);document.documentElement.classList.toggle('dark');document.getElementById('darkIcon').className=`fa-solid ${isDark?'fa-sun':'fa-moon'} text-xl`;}
function renderDashboard(){
  app.innerHTML=`
  <nav class="bg-red-800 text-white p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
    <div class="flex items-center gap-3"><i class="fa-solid fa-user-shield text-xl"></i><div><h1 class="font-bold text-lg">Hi, ${user.nama}</h1><p class="text-xs opacity-80">${new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p></div></div>
    <div class="flex gap-3"><button onclick="toggleDark()" class="hover:bg-red-900 p-2 rounded-lg"><i id="darkIcon" class="fa-solid ${isDark?'fa-sun':'fa-moon'} text-xl"></i></button><button onclick="openProfil()" class="hover:bg-red-900 p-1 pr-3 rounded-full"><img id="avatarNav" src="${user.foto||'https://ui-avatars.com/api/?name='+encodeURIComponent(user.nama)+'&background=800000&color=fff'}" class="w-9 h-9 rounded-full border-2 border-white"></button></div>
  </nav>
  <div id="contentArea" class="p-4 max-w-2xl mx-auto pb-32">${renderPage()}</div>
  <div class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t shadow-lg z-20"><div class="grid grid-cols-5 max-w-2xl mx-auto">
    <button onclick="switchPage('home')" class="py-2 flex flex-col items-center ${currentPage==='home'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-house text-xl"></i><span class="text-xs">Home</span></button>
    <button onclick="switchPage('rekap')" class="py-2 flex flex-col items-center ${currentPage==='rekap'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-calendar text-xl"></i><span class="text-xs">Rekap</span></button>
    <button onclick="switchPage('patroli')" class="py-2 flex flex-col items-center ${currentPage==='patroli'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-route text-xl"></i><span class="text-xs">Patroli</span></button>
    <button onclick="switchPage('kejadian')" class="py-2 flex flex-col items-center ${currentPage==='kejadian'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-triangle-exclamation text-xl"></i><span class="text-xs">Kejadian</span></button>
    <button onclick="switchPage('pembinaan')" class="py-2 flex flex-col items-center ${currentPage==='pembinaan'?'text-red-800':'text-gray-500'}"><i class="fa-solid fa-graduation-cap text-xl"></i><span class="text-xs">Bina</span></button>
  </div></div>
  <div id="modalCam" class="fixed inset-0 bg-black/90 hidden items-center justify-center p-4 z-50"><div class="bg-white dark:bg-gray-800 rounded-2xl p-4 w-full max-w-md"><h3 class="font-bold text-center mb-3">Ambil Foto Selfie</h3><div class="relative"><video id="video" class="w-full rounded-lg bg-black" autoplay playsinline></video><canvas id="canvas" class="hidden"></canvas><div id="timemarkPreview" class="absolute bottom-2 left-2 bg-black/70 text-white text-xs p-2 rounded"><div id="previewHari"></div><div id="previewJam" class="text-yellow-400"></div><div id="previewNama"></div><div id="previewGps" class="text-green-400"></div></div></div><div class="flex gap-2 mt-3"><button onclick="capture()" class="flex-1 bg-red-800 text-white p-3 rounded-lg">Kirim</button><button onclick="closeCam()" class="bg-gray-500 text-white p-3 rounded-lg">Batal</button></div></div></div>
  <div id="modalProfil" class="fixed inset-0 bg-black/70 hidden items-center justify-center p-4 z-50"><div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md"><div class="bg-red-800 p-6 text-center text-white relative"><button onclick="closeProfil()" class="absolute top-3 right-3">✕</button><img id="fotoProfil" src="${user.foto||''}" class="w-24 h-24 rounded-2xl mx-auto border-4 border-white"><h3 class="font-bold mt-2">${user.nama}</h3><p class="text-sm opacity-80">@${user.username}</p></div><div class="p-4 space-y-2"><button onclick="openEditProfil()" class="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-left">Edit Profil</button><button onclick="openGantiPassword()" class="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl text-left">Ganti Password</button><button onclick="logout()" class="w-full p-3 bg-red-50 text-red-600 rounded-xl text-left">Logout</button></div></div></div>
  <input type="file" id="inputFotoProfil" accept="image/*" class="hidden" onchange="uploadFotoProfil(event)">
  `;
  if(currentPage==='home'){cekStatus();dapatkanLokasiGPS();}
  if(currentPage==='rekap')loadRekap();
  if(currentPage==='patroli')loadPatroli();
  if(currentPage==='kejadian')loadKejadian();
  if(currentPage==='pembinaan')loadPembinaan();
}

function renderPage(){switch(currentPage){case'home':return renderHome();case'rekap':return renderRekap();case'patroli':return renderPatroli();case'kejadian':return renderKejadian();case'pembinaan':return renderPembinaan();default:return renderHome();}}

function renderHome(){
  const{bisaIn=false,bisaOut=false,lock12Jam=false,sisaJam=0,jamMasuk='--:--',jamPulang='--:--'}=statusServer;
  const statusText=lock12Jam?`Terkunci ${sisaJam} jam`:bisaIn?'Siap Absen Masuk':bisaOut?'Siap Absen Pulang':'Selesai';
  const statusColor=lock12Jam?'bg-amber-500':bisaIn||bisaOut?'bg-green-500':'bg-gray-500';
  return`<div class="space-y-4">
  <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow"><div class="flex justify-between mb-2"><div class="flex gap-2 items-center"><i class="fa-solid fa-satellite-dish text-red-800"></i><div><p class="text-xs text-gray-500">Lokasi GPS</p><p class="text-xs font-bold text-red-800">REAL-TIME</p></div></div><span class="text-xs text-green-600">Aktif</span></div><div class="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl"><p class="text-xs text-gray-500">Alamat</p><p id="gpsAlamat" class="text-sm">${currentLocation.alamat}</p><div class="grid grid-cols-2 mt-2 pt-2 border-t"><div><p class="text-xs text-gray-500">Lat</p><p id="gpsLat" class="font-mono text-sm">${currentLocation.lat}</p></div><div><p class="text-xs text-gray-500">Long</p><p id="gpsLong" class="font-mono text-sm">${currentLocation.long}</p></div></div></div></div>
  <div class="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow"><div class="flex justify-between mb-3"><h2 class="font-bold">Status Hari Ini</h2><span class="px-2 py-1 ${statusColor} text-white text-xs rounded-full">${statusText}</span></div><div class="grid grid-cols-2 gap-3"><div class="bg-green-50 p-3 rounded-xl text-center"><p class="text-xs">Masuk</p><p class="text-lg font-bold text-green-600">${jamMasuk}</p></div><div class="bg-red-50 p-3 rounded-xl text-center"><p class="text-xs">Pulang</p><p class="text-lg font-bold text-red-600">${jamPulang}</p></div></div><div class="text-center mt-3"><p class="text-xs text-gray-500">Waktu</p><p id="jamRealtime" class="text-2xl font-mono font-bold text-red-800">--:--:--</p></div></div>
  <div class="space-y-3"><button onclick="bukaKameraAbsen('Masuk')" ${!bisaIn?'disabled':''} class="w-full ${bisaIn?'bg-green-600':'bg-gray-300'} text-white p-4 rounded-2xl font-bold">Absen Masuk (${jamMasuk})</button><button onclick="bukaKameraAbsen('Pulang')" ${!bisaOut?'disabled':''} class="w-full ${bisaOut?'bg-red-800':'bg-gray-300'} text-white p-4 rounded-2xl font-bold">Absen Pulang (${jamPulang})</button></div>
  ${lock12Jam?`<div class="bg-amber-50 p-3 rounded-xl text-sm">Terkunci ${sisaJam} jam lagi</div>`:''}
  </div>`;
}

function renderRekap(){return`<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl"><h2 class="font-bold mb-2">Rekap</h2><div id="listRekap">Loading...</div></div>`;}
function renderPatroli(){return`<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl"><div class="flex justify-between mb-2"><h2 class="font-bold">Patroli</h2><button onclick="openFormPatroli()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Tambah</button></div><div id="listPatroli">Loading...</div></div>`;}
function renderKejadian(){return`<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl"><div class="flex justify-between mb-2"><h2 class="font-bold">Kejadian</h2><button onclick="openFormKejadian()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Lapor</button></div><div id="listKejadian">Loading...</div></div>`;}
function renderPembinaan(){return`<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl"><div class="flex justify-between mb-2"><h2 class="font-bold">Pembinaan</h2><button onclick="openFormPembinaan()" class="bg-red-800 text-white px-3 py-1 rounded text-sm">+ Tambah</button></div><div id="listPembinaan">Loading...</div></div>`;}
function updateJamRealtime(){const n=new Date();const el=document.getElementById('jamRealtime');if(el)el.textContent=n.toLocaleTimeString('id-ID',{hour12:false});}
setInterval(updateJamRealtime,1000);

async function loadRekap(){const r=await api('getRekap',{username:user.username});const e=document.getElementById('listRekap');if(!e)return;if(r.status!=='success'||!r.data.length){e.innerHTML='<p class="text-gray-500">Kosong</p>';return;}e.innerHTML=r.data.map(d=>{const t=new Date(d.tanggal);return`<div class="flex justify-between p-2 border-b"><span>${t.toLocaleDateString('id-ID')}</span><span>${d.keterangan}</span></div>`;}).join('');}

async function loadPatroli(){const r=await api('getPatroli',{username:user.username});const e=document.getElementById('listPatroli');if(!e)return;if(r.status!=='success'||!r.data.length){e.innerHTML='<p class="text-gray-500">Belum ada</p>';return;}e.innerHTML=r.data.map(p=>{const t=new Date(p.timestamp).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});return`<div class="p-3 mb-2 bg-gray-50 dark:bg-gray-700 rounded-xl"><div class="flex justify-between"><p class="font-bold text-red-800">${p.nama||p.username}</p><p class="text-xs text-gray-500">${t}</p></div><p class="text-sm mt-1">${p.lokasi}</p><p class="text-xs text-gray-600">${p.keterangan}</p></div>`;}).join('');}

async function loadKejadian(){const r=await api('getKejadian',{username:user.username});const e=document.getElementById('listKejadian');if(!e)return;if(r.status!=='success'||!r.data.length){e.innerHTML='<p class="text-gray-500">Belum ada</p>';return;}e.innerHTML=r.data.map(k=>{const t=new Date(k.timestamp).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});return`<div class="p-3 mb-2 bg-gray-50 dark:bg-gray-700 rounded-xl"><div class="flex justify-between"><p class="font-bold text-red-800">${k.nama||k.username}</p><span class="text-xs bg-amber-100 text-amber-800 px-2 rounded">${k.jenis}</span></div><p class="text-xs text-gray-500">${t} • ${k.lokasi}</p><p class="text-sm mt-1">${k.kronologi}</p></div>`;}).join('');}

async function loadPembinaan(){const r=await api('getPembinaan',{username:user.username});const e=document.getElementById('listPembinaan');if(!e)return;if(r.status!=='success'||!r.data.length){e.innerHTML='<p class="text-gray-500">Belum ada</p>';return;}e.innerHTML=r.data.map(b=>{const t=new Date(b.timestamp).toLocaleDateString('id-ID');return`<div class="p-3 mb-2 bg-gray-50 dark:bg-gray-700 rounded-xl"><div class="flex justify-between"><p class="font-bold text-red-800">${b.nama||b.username}</p><p class="text-xs">${t}</p></div><p class="text-sm">Materi: ${b.materi}</p><p class="text-xs">Pelatih: ${b.pelatih} • Nilai: ${b.nilai}</p></div>`;}).join('');}

function switchPage(p){currentPage=p;renderDashboard();}
function dapatkanLokasiGPS(){if(!navigator.geolocation)return;navigator.geolocation.watchPosition(pos=>{const lat=pos.coords.latitude.toFixed(6);const lon=pos.coords.longitude.toFixed(6);currentLocation.lat=lat;currentLocation.long=lon;document.getElementById('gpsLat')&&(document.getElementById('gpsLat').textContent=lat);document.getElementById('gpsLong')&&(document.getElementById('gpsLong').textContent=lon);fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`).then(r=>r.json()).then(d=>{if(d.display_name){currentLocation.alamat=d.display_name;document.getElementById('gpsAlamat')&&(document.getElementById('gpsAlamat').textContent=d.display_name);}});},{enableHighAccuracy:true});}
function bukaKameraAbsen(t){currentType=t;openCam();}
function openCam(){const m=document.getElementById('modalCam');m.classList.remove('hidden');m.classList.add('flex');startTimemark();navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}}).then(s=>{stream=s;document.getElementById('video').srcObject=s;}).catch(e=>{showError('Kamera error: '+e.message);closeCam();});}
function closeCam(){const m=document.getElementById('modalCam');m.classList.add('hidden');m.classList.remove('flex');if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}if(animationFrame)cancelAnimationFrame(animationFrame);}
function startTimemark(){function u(){const n=new Date();document.getElementById('previewHari').textContent=n.toLocaleDateString('id-ID',{weekday:'long'});document.getElementById('previewJam').textContent=n.toLocaleTimeString('id-ID');document.getElementById('previewNama').textContent=user.nama;document.getElementById('previewGps').textContent=`${currentLocation.lat},${currentLocation.long}`;animationFrame=requestAnimationFrame(u);}u();}
async function capture(){const v=document.getElementById('video');const c=document.getElementById('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);const foto=c.toDataURL('image/jpeg',0.8);closeCam();const r=await api('absen',{username:user.username,tipeAbsen:currentType,foto,lat:currentLocation.lat,long:currentLocation.long});if(r.status==='success'){showSuccess(r.message);cekStatus();}else{showError(r.message);}}
async function api(a,p={}){try{const r=await fetch(URL_GAS,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain'},body:JSON.stringify({aksi:a,data:p})});return await r.json();}catch(e){return{status:'error',message:e.message};}}
function openProfil(){document.getElementById('modalProfil').classList.remove('hidden');document.getElementById('modalProfil').classList.add('flex');}
function closeProfil(){document.getElementById('modalProfil').classList.add('hidden');}
function openEditProfil(){closeProfil();document.getElementById('modalEditProfil')?.classList.remove('hidden');}
function closeEditProfil(){document.getElementById('modalEditProfil')?.classList.add('hidden');}
function openGantiPassword(){}
function closeGantiPassword(){}
function openFormPatroli(){showError('Form patroli belum dibuat di HTML');}
function openFormKejadian(){showError('Form kejadian belum dibuat');}
function openFormPembinaan(){showError('Form pembinaan belum dibuat');}
async function uploadFotoProfil(e){const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=async ev=>{const b=ev.target.result;const res=await api('uploadFoto',{username:user.username,fotoBase64:b});if(res.status==='success'){user.foto=res.urlFoto;localStorage.setItem('user',JSON.stringify(user));document.getElementById('avatarNav').src=res.urlFoto;showSuccess('Foto updated');}else{showError(res.message);}};r.readAsDataURL(f);}
async function simpanProfil(){const d={username:user.username,nama:document.getElementById('editNama')?.value||user.nama};const r=await api('updateProfil',d);if(r.status==='success'){showSuccess(r.message);Object.assign(user,d);localStorage.setItem('user',JSON.stringify(user));closeEditProfil();renderDashboard();}else{showError(r.message);}}
async function cekStatus(){const r=await api('cekStatus',{username:user.username});if(r.status==='success'){statusServer=r;document.getElementById('contentArea').innerHTML=renderPage();updateJamRealtime();}}

console.log('App started');
render();
