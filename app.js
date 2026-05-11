const GAS_URL = 'https://script.google.com/macros/s/AKfycbzTLDlivTgJS3QUIm-qmaHRFLVmu-aPYdYwMoG-YdG6xSyeUF9sDUaHV7_E-4xLUAiB/exec';
let currentUser = null;
let stream = null;
let gpsData = null;
let alamatData = '';
let jamInterval = null;
let statusHariIni = {masuk:'', pulang:'', shift:'', pos:''};
let currentBulan = new Date().getMonth();
let currentTahun = new Date().getFullYear();
let opsiShift = [];
let opsiPos = [];
let html5QrcodeScanner = null;

function showLoading(show){
  document.getElementById('loadingOverlay').classList.toggle('active', show);
}

async function showPage(page){
  try {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-'+page).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if(page!=='login'){
      document.getElementById('bottomNav').classList.remove('hidden');
      const nav = document.querySelector(`.nav-item[onclick="showPage('${page}')"]`);
      if(nav) nav.classList.add('active');
    } else {
      document.getElementById('bottomNav').classList.add('hidden');
    }

    if(page==='home'){
      updateJam();
      await updateStatusHome();
      checkOfflineData();
    }
    if(page==='absensi'){
      await initAbsensi();
    }
    if(page==='rekap'){
      loadRekap();
    }
    if(page==='profil'){
      loadProfil();
    }
  } catch(e) {
    console.error('showPage error:', e); // <-- INI PENTING
  }
}

function updateJam(){
  if(jamInterval) clearInterval(jamInterval);
  const update = ()=>{
    const now = new Date();
    const jam = now.toLocaleTimeString('id-ID',{hour12:false});
    const tgl = now.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    document.getElementById('jamSekarang').textContent = jam;
    document.getElementById('tglSekarang').textContent = tgl;
    document.getElementById('tglAbsen').textContent = tgl;
    document.getElementById('jamAbsen').textContent = jam;
    document.getElementById('wmJamBox').textContent = jam.replace(/:/g,'.');
    document.getElementById('wmTanggal').textContent = now.toLocaleDateString('id-ID');
    const jamPatroli = document.getElementById('wmJamBoxPatroli');
    const tglPatroli = document.getElementById('wmTanggalPatroli');
    if(jamPatroli) jamPatroli.textContent = jam.replace(/:/g,'.');
    if(tglPatroli) tglPatroli.textContent = now.toLocaleDateString('id-ID');
  };
  update();
  jamInterval = setInterval(update, 1000);
}

function toggleDarkMode(){
  const html = document.documentElement;
  const btn = document.getElementById('btnDarkMode');
  if(html.getAttribute('data-theme')==='dark'){
    html.removeAttribute('data-theme');
    btn.textContent = '🌙';
    localStorage.setItem('theme','light');
  } else {
    html.setAttribute('data-theme','dark');
    btn.textContent = '☀️';
    localStorage.setItem('theme','dark');
  }
}

if(localStorage.getItem('theme')==='dark'){
  document.documentElement.setAttribute('data-theme','dark');
  const btn = document.getElementById('btnDarkMode');
  if(btn) btn.textContent = '☀️';
}

document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const u = document.getElementById('username').value.trim();
  const p = document.getElementById('password').value;
  const status = document.getElementById('loginStatus');

  if(!u||!p){
    status.textContent = 'Isi username dan password';
    status.classList.remove('hidden');
    return;
  }

  showLoading(true);
  status.classList.add('hidden');

  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({action:'login',username:u,password:p})
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      currentUser = {
        nama: hasil.data.nama,
        username: hasil.data.username,
        foto: hasil.data.fotoProfil || hasil.data.foto || '',
        nohp: hasil.data.nohp || '',
        alamat: hasil.data.alamat || '',
        rekening: hasil.data.rekening || '',
        ttl: hasil.data.ttl || ''
      };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      document.getElementById('namaKaryawan').textContent = currentUser.nama;
      document.getElementById('namaAbsen').textContent = currentUser.nama;
      if(currentUser.foto){
        document.getElementById('fotoProfil').src = currentUser.foto;
        document.getElementById('fotoProfil').style.display = 'block';
        document.getElementById('fotoProfilAbsen').src = currentUser.foto;
        document.getElementById('fotoProfilAbsen').style.display = 'block';
      }
      await loadOpsiAbsen();
      showPage('home');
    } else {
      status.textContent = hasil.message || hasil.pesan || 'Login gagal';
      status.classList.remove('hidden');
    }
  }catch(e){
    showLoading(false);
    status.textContent = 'Koneksi error: '+e.message;
    status.classList.remove('hidden');
    console.error('Login error:', e);
  }
});

function logout(){
  currentUser = null;
  statusHariIni = {masuk:'', pulang:'', shift:'', pos:''};
  localStorage.removeItem('currentUser');
  Object.keys(localStorage).forEach(k=>{
    if(k.startsWith('statusHariIni_')) localStorage.removeItem(k);
  });
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }
  if(html5QrcodeScanner){
    html5QrcodeScanner.stop().catch(()=>{});
    html5QrcodeScanner = null;
  }
  showPage('login');
}

async function loadOpsiAbsen(){
  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({action:'getOpsiAbsen'})
    });
    const hasil = await res.json();
    if(hasil.status==='sukses'){
      opsiShift = hasil.data.shift;
      opsiPos = hasil.data.pos;
      document.getElementById('selectShift').innerHTML = opsiShift.map(s => `<option value="${s}">${s}</option>`).join('');
      document.getElementById('selectPos').innerHTML = opsiPos.map(p => `<option value="${p}">${p}</option>`).join('');
      document.getElementById('selectShiftPatroli').innerHTML = opsiShift.map(s => `<option value="${s}">${s}</option>`).join('');
    }
  }catch(e){
    console.error('Gagal loadOpsiAbsen:', e);
  }
}

async function checkOfflineData(){
  const data = JSON.parse(localStorage.getItem('offlineAbsen')||'[]');
  const card = document.getElementById('syncCard');
  if(data.length > 0){
    document.getElementById('syncText').textContent = `Ada ${data.length} data offline`;
    card.style.display = 'block';
    document.getElementById('offlineBadge').classList.add('active');
  } else {
    card.style.display = 'none';
    document.getElementById('offlineBadge').classList.remove('active');
  }
}

async function syncOfflineData(){
  const data = JSON.parse(localStorage.getItem('offlineAbsen')||'[]');
  if(data.length===0) return;

  showLoading(true);
  let sukses = 0;
  for(const d of data){
    try{
      const res = await fetch(GAS_URL,{method:'POST',body:JSON.stringify(d)});
      const hasil = await res.json();
      if(hasil.status==='sukses') sukses++;
    }catch(e){}
  }
  showLoading(false);
  localStorage.setItem('offlineAbsen','[]');
  checkOfflineData();
  alert(`Sync selesai: ${sukses}/${data.length} data berhasil`);
}

async function updateStatusHome(){
  if(!currentUser) return;

  const btn = document.getElementById('btnAbsenCepat');
  const icon = document.getElementById('iconAbsenCepat');
  const text = document.getElementById('textAbsenCepat');

  btn.disabled = true;
  text.textContent = 'Cek status...';
  icon.textContent = 'hourglass_empty';

  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({action:'getStatusHariIni', nama:currentUser.nama})
    });
    const hasil = await res.json();

    if(hasil.status==='sukses'){
      statusHariIni.masuk = hasil.data.masuk || '';
      statusHariIni.pulang = hasil.data.pulang || '';
      statusHariIni.shift = hasil.data.shift || '';
      statusHariIni.pos = hasil.data.pos || '';
      localStorage.setItem('statusHariIni_'+currentUser.username, JSON.stringify({
      ...statusHariIni,
        tgl: hasil.data.tanggal
      }));
    }
  }catch(e){
    console.error('updateStatusHome error:', e);
    const cached = localStorage.getItem('statusHariIni_'+currentUser.username);
    if(cached) {
      const c = JSON.parse(cached);
      const today = new Date();
      const todayStr = String(today.getDate()).padStart(2,'0') + '/' +
                       String(today.getMonth()+1).padStart(2,'0') + '/' +
                       today.getFullYear();
      if(c.tgl === todayStr) statusHariIni = c;
    }
  }

  document.getElementById('homeWaktuMasuk').textContent = statusHariIni.masuk || '-';
  document.getElementById('homeWaktuPulang').textContent = statusHariIni.pulang || '-';
  document.getElementById('homeShiftMasuk').textContent = statusHariIni.shift? `Shift ${statusHariIni.shift}` : '';

  const itemM = document.getElementById('homeItemMasuk');
  const itemP = document.getElementById('homeItemPulang');

  itemM.classList.remove('active','done');
  itemP.classList.remove('active','done');

  if(statusHariIni.masuk){
    itemM.classList.add('done');
    if(statusHariIni.pulang){
      itemP.classList.add('done');
      btn.disabled = true;
      icon.textContent = 'check_circle';
      text.textContent = 'SUDAH ABSEN LENGKAP';
    } else {
      itemP.classList.add('active');
      btn.disabled = false;
      icon.textContent = 'logout';
      text.textContent = 'ABSEN PULANG';
    }
  } else {
    itemM.classList.add('active');
    btn.disabled = false;
    icon.textContent = 'login';
    text.textContent = 'ABSEN MASUK';
  }
}

async function absenCepatDariHome(){
  showPage('absensi');
  setTimeout(()=>{
    document.getElementById('btnAksiUtama').click();
  },300);
}

async function initAbsensi(){
  await getGPS();
  await getAlamat();
  await cekStatusHariIni();
  updateTombolUtama();
}

async function getGPS(){
  return new Promise((res)=>{
    if(!navigator.geolocation){
      gpsData = null;
      res();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos)=>{
        gpsData = {lat:pos.coords.latitude,lng:pos.coords.longitude};
        document.getElementById('wmGps').textContent = `${gpsData.lat.toFixed(6)},${gpsData.lng.toFixed(6)}`;
        const gpsPatroli = document.getElementById('wmGpsPatroli');
        if(gpsPatroli) gpsPatroli.textContent = `${gpsData.lat.toFixed(6)},${gpsData.lng.toFixed(6)}`;
        res();
      },
      ()=>{
        gpsData = null;
        document.getElementById('wmGps').textContent = 'GPS tidak aktif';
        const gpsPatroli = document.getElementById('wmGpsPatroli');
        if(gpsPatroli) gpsPatroli.textContent = 'GPS tidak aktif';
        res();
      },
      {enableHighAccuracy:true,timeout:5000}
    );
  });
}

async function getAlamat(){
  if(!gpsData) return;
  try{
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsData.lat}&lon=${gpsData.lng}`);
    const data = await res.json();
    alamatData = data.display_name || 'Alamat tidak ditemukan';
    document.getElementById('wmAlamat').textContent = alamatData.substring(0,50);
  }catch(e){
    alamatData = 'Gagal ambil alamat';
    document.getElementById('wmAlamat').textContent = alamatData;
  }
}

async function cekStatusHariIni(){
  if(!currentUser) return;

  const btn = document.getElementById('btnAksiUtama');
  btn.disabled = true;

  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({action:'getStatusHariIni', nama:currentUser.nama})
    });
    const hasil = await res.json();

    if(hasil.status==='sukses'){
      statusHariIni.masuk = hasil.data.masuk || '';
      statusHariIni.pulang = hasil.data.pulang || '';
      statusHariIni.shift = hasil.data.shift || '';
      statusHariIni.pos = hasil.data.pos || '';
      localStorage.setItem('statusHariIni_'+currentUser.username, JSON.stringify({
      ...statusHariIni,
        tgl: hasil.data.tanggal
      }));
    }
  }catch(e){
    console.error('cekStatusHariIni error:', e);
    const cached = localStorage.getItem('statusHariIni_'+currentUser.username);
    if(cached) {
      const c = JSON.parse(cached);
      const today = new Date();
      const todayStr = String(today.getDate()).padStart(2,'0') + '/' +
                       String(today.getMonth()+1).padStart(2,'0') + '/' +
                       today.getFullYear();
      if(c.tgl === todayStr) statusHariIni = c;
    }
  }

  document.getElementById('waktuMasuk').textContent = statusHariIni.masuk || 'Belum absen';
  document.getElementById('waktuPulang').textContent = statusHariIni.pulang || 'Belum absen';
  document.getElementById('infoShift').textContent = statusHariIni.shift? `Shift ${statusHariIni.shift} - ${statusHariIni.pos}` : '';

  const itemM = document.getElementById('itemMasuk');
  const itemP = document.getElementById('itemPulang');
  itemM.classList.remove('active','done');
  itemP.classList.remove('active','done');

  if(statusHariIni.masuk){
    itemM.classList.add('done');
    if(statusHariIni.pulang){
      itemP.classList.add('done');
    } else {
      itemP.classList.add('active');
    }
  } else {
    itemM.classList.add('active');
  }
}

function updateTombolUtama(){
  const btn = document.getElementById('btnAksiUtama');
  const icon = document.getElementById('iconAksi');
  const judul = document.getElementById('judulAksi');
  const sub = document.getElementById('subAksi');
  const formMasuk = document.getElementById('formAbsenMasuk');
  const formPulang = document.getElementById('formAbsenPulang');

  formMasuk.classList.add('hidden');
  formPulang.classList.add('hidden');
  btn.disabled = false;

  if(!statusHariIni.masuk){
    btn.dataset.tipe = 'in';
    icon.textContent = 'login';
    judul.textContent = 'MASUK';
    sub.textContent = 'Tap untuk absen masuk';
    btn.textContent = 'ABSEN MASUK';
    formMasuk.classList.remove('hidden');
  } else if(!statusHariIni.pulang){
    btn.dataset.tipe = 'out';
    icon.textContent = 'logout';
    judul.textContent = 'PULANG';
    sub.textContent = 'Tap untuk absen pulang';
    btn.textContent = 'ABSEN PULANG';
    formPulang.classList.remove('hidden');
  } else {
    btn.dataset.tipe = 'done';
    icon.textContent = 'check_circle';
    judul.textContent = 'SELESAI';
    sub.textContent = 'Absensi hari ini sudah lengkap';
    btn.textContent = 'SUDAH ABSEN LENGKAP';
    btn.disabled = true;
  }
}

document.getElementById('btnAksiUtama').addEventListener('click', async ()=>{
  const tipe = document.getElementById('btnAksiUtama').dataset.tipe;

  if(tipe=='done') return;

  if(tipe=='in'){
    const shift = document.getElementById('selectShift').value;
    const pos = document.getElementById('selectPos').value;
    if(!shift ||!pos){
      showNotif('Pilih Shift dan Pos Jaga dulu', true, false);
      return;
    }
  }

  document.getElementById('tombolUtamaAbsen').classList.add('hidden');
  document.getElementById('kameraArea').classList.remove('hidden');

  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
    document.getElementById('video').srcObject = stream;
  }catch(e){
    showNotif('Gagal buka kamera: '+e.message, true, false);
    document.getElementById('kameraArea').classList.add('hidden');
    document.getElementById('tombolUtamaAbsen').classList.remove('hidden');
  }
});

document.getElementById('btnAmbilFoto').addEventListener('click', async ()=>{
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video,0,0);

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(10, canvas.height-80, 250, 70);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.fillText(document.getElementById('wmJamBox').textContent, 15, canvas.height-65);
  ctx.font = '11px Arial';
  ctx.fillText(document.getElementById('wmTanggal').textContent, 15, canvas.height-50);
  ctx.fillText(document.getElementById('wmGps').textContent, 15, canvas.height-35);
  ctx.fillText(document.getElementById('wmAlamat').textContent.substring(0,30), 15, canvas.height-20);

  const b64 = canvas.toDataURL('image/jpeg').split(',')[1];

  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }

  document.getElementById('kameraArea').classList.add('hidden');
  document.getElementById('tombolUtamaAbsen').classList.remove('hidden');

  const tipe = document.getElementById('btnAksiUtama').dataset.tipe;
  const shift = tipe=='in'? document.getElementById('selectShift').value : '';
  const pos = tipe=='in'? document.getElementById('selectPos').value : '';
  const catatan = tipe=='out'? document.getElementById('inputCatatan').value : '';

  showLoading(true);
  try{
    const payload = {
      action:'absen',
      nama:currentUser.nama,
      tipe:tipe,
      lat:gpsData?.lat||'',
      lng:gpsData?.lng||'',
      foto:b64
    };
    if(shift) payload.shift = shift;
    if(pos) payload.pos = pos;
    if(catatan) payload.catatan = catatan;

    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify(payload)
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      document.getElementById('audioTing').play();
      showNotif(`✅ Absen ${tipe} berhasil jam ${hasil.jam}`, false, false);
      document.getElementById('preview').src = 'data:image/jpeg;base64,'+b64;
      document.getElementById('preview').classList.remove('hidden');
      await cekStatusHariIni();
      updateTombolUtama();
      await updateStatusHome();
      setTimeout(()=>document.getElementById('preview').classList.add('hidden'),3000);
    } else {
      showNotif('❌ '+(hasil.message || hasil.pesan || 'Gagal absen'), true, false);
    }
  }catch(e){
    showLoading(false);
    const offlineData = JSON.parse(localStorage.getItem('offlineAbsen')||'[]');
    offlineData.push({action:'absen',nama:currentUser.nama,tipe:tipe,lat:gpsData?.lat||'',lng:gpsData?.lng||'',foto:b64,shift:shift,pos:pos,catatan:catatan});
    localStorage.setItem('offlineAbsen', JSON.stringify(offlineData));
    showNotif('📡 Offline - Data disimpan lokal', false, true);
    checkOfflineData();
  }
});

document.getElementById('btnBatalFoto').addEventListener('click', ()=>{
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }
  document.getElementById('kameraArea').classList.add('hidden');
  document.getElementById('tombolUtamaAbsen').classList.remove('hidden');
});

function showNotif(teks, error=false, offline=false){
  const n = document.getElementById('notifAbsen');
  const ic = document.getElementById('notifIcon');
  const tx = document.getElementById('notifText');
  n.classList.remove('hidden');
  n.classList.remove('gagal','sukses','loading');
  if(error){
    n.classList.add('gagal');
    ic.textContent = '❌';
  } else if(offline){
    n.classList.add('loading');
    ic.textContent = '📡';
  } else {
    n.classList.add('sukses');
    ic.textContent = '✅';
  }
  tx.textContent = teks;
  setTimeout(()=>n.classList.add('hidden'),3000);
}

async function bukaPatroli(){
  document.getElementById('tombolUtamaAbsen').classList.add('hidden');
  document.getElementById('areaPatroli').classList.remove('hidden');

  await loadLogPatroli();

  if(!html5QrcodeScanner){
    html5QrcodeScanner = new Html5Qrcode("reader-patroli");
  }

  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      if(decodedText.startsWith('PATROLI_')){
        const parts = decodedText.split('_');
        const kode = parts[1];
        prosesScanPatroli(kode);
        html5QrcodeScanner.stop();
      }
    },
    (errorMessage) => {}
  ).catch(err => {
    showNotif('Gagal buka kamera: '+err, true, false);
  });
}

function tutupPatroli(){
  if(html5QrcodeScanner){
    html5QrcodeScanner.stop().catch(()=>{});
  }
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }
  document.getElementById('areaPatroli').classList.add('hidden');
  document.getElementById('kameraAreaPatroli').classList.add('hidden');
  document.getElementById('tombolUtamaAbsen').classList.remove('hidden');
}

async function prosesScanPatroli(kodeBarcode){
  const shift = document.getElementById('selectShiftPatroli').value;
  if(!shift){
    showNotif('Pilih shift dulu', true, false);
    return;
  }

  showNotif('Barcode terdeteksi! Ambil foto bukti patroli...', false, true);

  document.getElementById('areaPatroli').classList.add('hidden');
  document.getElementById('kameraAreaPatroli').classList.remove('hidden');

  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    document.getElementById('videoPatroli').srcObject = stream;
    document.getElementById('btnKirimPatroli').dataset.kode = kodeBarcode;
    document.getElementById('btnKirimPatroli').dataset.shift = shift;
  }catch(e){
    showNotif('Gagal buka kamera: '+e.message, true, false);
    tutupPatroli();
  }
}

document.getElementById('btnKirimPatroli').addEventListener('click', async ()=>{
  const video = document.getElementById('videoPatroli');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video,0,0);

  ctx.fillStyle = 'rgba(139,75,92,0.9)';
  ctx.fillRect(10, canvas.height-100, 300, 90);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px Arial';
  ctx.fillText('PATROLI', 15, canvas.height-80);
  ctx.font = '12px Arial';
  ctx.fillText(document.getElementById('wmJamBoxPatroli').textContent, 15, canvas.height-65);
  ctx.fillText(document.getElementById('wmTanggalPatroli').textContent, 15, canvas.height-50);
  ctx.fillText(document.getElementById('wmGpsPatroli').textContent, 15, canvas.height-35);
  ctx.fillText(document.getElementById('wmAlamat').textContent.substring(0,35), 15, canvas.height-20);

  const b64 = canvas.toDataURL('image/jpeg').split(',')[1];

  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }

  const kode = document.getElementById('btnKirimPatroli').dataset.kode;
  const shift = document.getElementById('btnKirimPatroli').dataset.shift;

  showLoading(true);
  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'patroli',
        nama:currentUser.nama,
        kodeBarcode: kode,
        shift: shift,
        lat: gpsData?.lat || '',
        lng: gpsData?.lng || '',
        foto: b64
      })
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      document.getElementById('audioTing').play();
      showNotif(`✅ ${hasil.pesan} jam ${hasil.jam}`, false, false);
      document.getElementById('kameraAreaPatroli').classList.add('hidden');
      await loadLogPatroli();
      setTimeout(tutupPatroli, 2000);
    } else {
      showNotif('❌ '+(hasil.message || hasil.pesan || 'Gagal patroli'), true, false);
      setTimeout(tutupPatroli, 2000);
    }
  }catch(e){
    showLoading(false);
    showNotif('❌ Koneksi error: '+e.message, true, false);
    setTimeout(tutupPatroli, 2000);
  }
});

async function loadLogPatroli(){
  const today = new Date();
  const todayStr = String(today.getDate()).padStart(2,'0') + '/' +
                   String(today.getMonth()+1).padStart(2,'0') + '/' +
                   today.getFullYear();

  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'getLogPatroli',
        nama: currentUser.nama,
        tanggal: todayStr,
        shift: statusHariIni.shift || ''
      })
    });
    const hasil = await res.json();

    if(hasil.status==='sukses'){
      const list = document.getElementById('listPatroli');
      if(hasil.data.length === 0){
        list.innerHTML = '<p style="text-align:center;color:var(--text2);padding:20px">Belum ada patroli hari ini</p>';
      } else {
        list.innerHTML = hasil.data.map(p => `
          <div class="card" style="margin:8px 0;padding:12px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <div style="font-weight:600">${p.pos}</div>
                <div style="font-size:12px;color:var(--text2)">${p.jam} - Shift ${p.shift}</div>
              </div>
              <span class="material-icons-round" style="color:#4A7C59">check_circle</span>
            </div>
          </div>
        `).join('');
      }

      const persen = hasil.ringkasan.persentase;
      document.getElementById('progressPatroliBar').style.width = persen + '%';
      document.getElementById('posSudahPatroli').textContent = hasil.ringkasan.sudah_patroli;
      document.getElementById('posBelumPatroli').textContent = hasil.ringkasan.belum_patroli.length;
    }
  }catch(e){}
}

function gantiBulan(delta){
  currentBulan += delta;
  if(currentBulan < 0){
    currentBulan = 11;
    currentTahun--;
  } else if(currentBulan > 11){
    currentBulan = 0;
    currentTahun++;
  }
  loadRekap();
}

async function loadRekap(){
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('namaBulan').textContent = bulan[currentBulan] + ' ' + currentTahun;

  showLoading(true);
  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'rekap',
        nama:currentUser.nama,
        bulan:currentBulan+1,
        tahun:currentTahun
      })
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      const tbody = document.getElementById('rekapBody');
      const empty = document.getElementById('rekapEmpty');
      const data = hasil.data;

      if(data.length === 0){
        tbody.innerHTML = '';
        empty.classList.remove('hidden');
      } else {
        empty.classList.add('hidden');
        tbody.innerHTML = data.map(d => {
          const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
          const tgl = new Date(d.tanggal.split('/').reverse().join('-'));
          const namaHari = hari[tgl.getDay()];
          const isWeekend = tgl.getDay() === 0 || tgl.getDay() === 6;
          const isLibur = d.masuk === '-';
          return `
            <tr class="${isWeekend? 'weekend' : ''} ${isLibur? 'hari-min' : ''}">
              <td>${d.tanggal}</td>
              <td>${namaHari}</td>
              <td>${d.masuk}</td>
              <td>${d.pulang}</td>
              <td>${d.durasi}</td>
              <td>${d.shift || '-'}</td>
              <td>${d.pos || '-'}</td>
            </tr>
          `;
        }).join('');
      }

      const totalMasuk = data.filter(d => d.masuk!== '-').length;
      const totalJam = data.reduce((sum, d) => {
        if(d.durasi!== '-'){
          const jam = parseInt(d.durasi.split('j')[0]) || 0;
          return sum + jam;
        }
        return sum;
      }, 0);

      document.getElementById('totalMasuk').textContent = totalMasuk;
      document.getElementById('totalJam').textContent = totalJam + 'j';
    }
  }catch(e){
    showLoading(false);
    document.getElementById('rekapBody').innerHTML = '';
    document.getElementById('rekapEmpty').classList.remove('hidden');
  }
}

function loadProfil(){
  if(!currentUser) return;
  document.getElementById('profilNama').textContent = currentUser.nama;
  document.getElementById('profilUsername').textContent = '@' + currentUser.username;
  if(currentUser.foto){
    document.getElementById('profilFotoBesar').src = currentUser.foto;
  }
  document.getElementById('inputNoHP').value = currentUser.nohp || '';
  document.getElementById('inputAlamat').value = currentUser.alamat || '';
  document.getElementById('inputRekening').value = currentUser.rekening || '';
  document.getElementById('inputTTL').value = currentUser.ttl || '';
}

document.getElementById('inputFotoProfil').addEventListener('change', async (e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = async (ev)=>{
    const b64 = ev.target.result.split(',')[1];
    showLoading(true);
    try{
      const res = await fetch(GAS_URL,{
        method:'POST',
        body:JSON.stringify({
          action:'updateFoto',
          username:currentUser.username,
          foto:b64
        })
      });
      const hasil = await res.json();
      showLoading(false);

      const notif = document.getElementById('notifFoto');
      notif.classList.remove('hidden');
      if(hasil.status==='sukses'){
        notif.className = 'status sukses';
        notif.textContent = '✅ Foto profil berhasil diupdate';
        currentUser.foto = hasil.fotoUrl;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('fotoProfil').src = hasil.fotoUrl;
        document.getElementById('fotoProfilAbsen').src = hasil.fotoUrl;
        document.getElementById('profilFotoBesar').src = hasil.fotoUrl;
      } else {
        notif.className = 'status gagal';
        notif.textContent = '❌ ' + (hasil.message || 'Gagal update foto');
      }
      setTimeout(()=>notif.classList.add('hidden'),3000);
    }catch(err){
      showLoading(false);
      const notif = document.getElementById('notifFoto');
      notif.className = 'status gagal';
      notif.textContent = '❌ Koneksi error';
      notif.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
});

async function gantiPassword(){
  const lama = document.getElementById('passLama').value;
  const baru = document.getElementById('passBaru').value;
  const baru2 = document.getElementById('passBaru2').value;
  const notif = document.getElementById('notifPass');

  notif.classList.add('hidden');

  if(!lama ||!baru ||!baru2){
    notif.className = 'status gagal';
    notif.textContent = '❌ Semua field wajib diisi';
    notif.classList.remove('hidden');
    return;
  }

  if(baru!== baru2){
    notif.className = 'status gagal';
    notif.textContent = '❌ Password baru tidak sama';
    notif.classList.remove('hidden');
    return;
  }

    if(baru.length < 5){
    notif.className = 'status gagal';
    notif.textContent = '❌ Password minimal 5 karakter';
    notif.classList.remove('hidden');
    return;
  }

  showLoading(true);
  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'updatePassword',
        username:currentUser.username,
        passwordLama:lama,
        passwordBaru:baru
      })
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      notif.className = 'status sukses';
      notif.textContent = '✅ Password berhasil diganti';
      document.getElementById('passLama').value = '';
      document.getElementById('passBaru').value = '';
      document.getElementById('passBaru2').value = '';
    } else {
      notif.className = 'status gagal';
      notif.textContent = '❌ ' + (hasil.message || 'Gagal ganti password');
    }
    notif.classList.remove('hidden');
  }catch(e){
    showLoading(false);
    notif.className = 'status gagal';
    notif.textContent = '❌ Koneksi error: ' + e.message;
    notif.classList.remove('hidden');
  }
}

async function updateDataPersonal(){
  const nohp = document.getElementById('inputNoHP').value;
  const alamat = document.getElementById('inputAlamat').value;
  const rekening = document.getElementById('inputRekening').value;
  const ttl = document.getElementById('inputTTL').value;
  const notif = document.getElementById('notifData');

  showLoading(true);
  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'updateDataPersonal',
        username:currentUser.username,
        nohp:nohp,
        alamat:alamat,
        rekening:rekening,
        ttl:ttl
      })
    });
    const hasil = await res.json();
    showLoading(false);

    if(hasil.status==='sukses'){
      notif.className = 'status sukses';
      notif.textContent = '✅ Data personal berhasil disimpan';
      currentUser.nohp = nohp;
      currentUser.alamat = alamat;
      currentUser.rekening = rekening;
      currentUser.ttl = ttl;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      notif.className = 'status gagal';
      notif.textContent = '❌ ' + (hasil.message || 'Gagal simpan data');
    }
    notif.classList.remove('hidden');
  }catch(e){
    showLoading(false);
    notif.className = 'status gagal';
    notif.textContent = '❌ Koneksi error: ' + e.message;
    notif.classList.remove('hidden');
  }
}

window.addEventListener('load', () => {
  const saved = localStorage.getItem('currentUser');
  if(saved){
    currentUser = JSON.parse(saved);
    document.getElementById('namaKaryawan').textContent = currentUser.nama;
    document.getElementById('namaAbsen').textContent = currentUser.nama;
    if(currentUser.foto){
      document.getElementById('fotoProfil').src = currentUser.foto;
      document.getElementById('fotoProfil').style.display = 'block';
      document.getElementById('fotoProfilAbsen').src = currentUser.foto;
      document.getElementById('fotoProfilAbsen').style.display = 'block';
    }
    loadOpsiAbsen();
    showPage('home');
  }
});

window.addEventListener('online', () => {
  document.getElementById('offlineBadge').classList.remove('active');
  syncOfflineData();
});

window.addEventListener('offline', () => {
  document.getElementById('offlineBadge').classList.add('active');
});
