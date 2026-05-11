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
let patroliActive = false;

function showLoading(show){
  document.getElementById('loadingOverlay').classList.toggle('active', show);
}

function getTodayStr(){
  const t = new Date();
  return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
}

async function showPage(page){
  try {
    // Stop semua media
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
      stream = null;
    }
    if(html5QrcodeScanner && patroliActive){
      await html5QrcodeScanner.stop().catch(()=>{});
      html5QrcodeScanner = null;
      patroliActive = false;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById('page-'+page);
    if(targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Nav muncul untuk semua page kecuali login
    const bottomNav = document.getElementById('bottomNav');
    if(page!=='login'){
      bottomNav.classList.remove('hidden');
      const nav = document.querySelector(`.nav-item[onclick="showPage('${page}')"]`);
      if(nav) nav.classList.add('active');
    } else {
      bottomNav.classList.add('hidden');
    }

    if(page==='home'){
      updateJam();
      await updateStatusHome();
      checkOfflineData();
    }
    if(page==='absensi'){
      await initAbsensi();
    }
    if(page==='patroli'){
      document.getElementById('tglPatroli').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
      await loadLogPatroli();
    }
    if(page==='rekap'){
      loadRekap();
    }
    if(page==='profil'){
      loadProfil();
    }
  } catch(e) {
    console.error('showPage error:', e);
    showNotif('Error buka halaman: '+e.message, true, false);
  }
}

//... fungsi updateJam, toggleDarkMode, login, logout, loadOpsiAbsen, checkOfflineData, syncOfflineData, updateStatusHome, absenCepatDariHome, initAbsensi, getGPS, getAlamat, cekStatusHariIni, updateTombolUtama, btnAksiUtama, btnAmbilFoto, btnBatalFoto, showNotif tetap sama kayak versi sebelumnya...

async function mulaiScanPatroli(){
  const shift = document.getElementById('selectShiftPatroli').value;
  if(!shift){
    showNotif('Pilih shift patroli dulu', true, false);
    return;
  }

  if(!html5QrcodeScanner){
    html5QrcodeScanner = new Html5Qrcode("reader-patroli");
  }

  patroliActive = true;
  html5QrcodeScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      if(decodedText.startsWith('PATROLI_')){
        const parts = decodedText.split('_');
        const kode = parts[1];
        prosesScanPatroli(kode);
        html5QrcodeScanner.stop().catch(()=>{});
        patroliActive = false;
      }
    },
    (errorMessage) => {}
  ).catch(err => {
    showNotif('Gagal buka kamera: '+err, true, false);
    patroliActive = false;
  });
}

async function prosesScanPatroli(kodeBarcode){
  const shift = document.getElementById('selectShiftPatroli').value;
  if(!shift){
    showNotif('Pilih shift patroli dulu', true, false);
    return;
  }

  showNotif('Barcode terdeteksi! Ambil foto bukti patroli...', false, true);

  document.getElementById('areaPatroliScan').classList.add('hidden');
  document.getElementById('kameraAreaPatroli').classList.remove('hidden');

  try{
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});
    document.getElementById('videoPatroli').srcObject = stream;
    document.getElementById('btnKirimPatroli').dataset.kode = kodeBarcode;
    document.getElementById('btnKirimPatroli').dataset.shift = shift;
  }catch(e){
    showNotif('Gagal buka kamera: '+e.message, true, false);
    batalFotoPatroli();
  }
}

function batalFotoPatroli(){
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }
  document.getElementById('kameraAreaPatroli').classList.add('hidden');
  document.getElementById('areaPatroliScan').classList.remove('hidden');
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

  const b64 = canvas.toDataURL('image/jpeg',0.8).split(',')[1];

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
      document.getElementById('areaPatroliScan').classList.remove('hidden');
      await loadLogPatroli();
    } else {
      showNotif('❌ '+(hasil.message || hasil.pesan || 'Gagal patroli'), true, false);
      batalFotoPatroli();
    }
  }catch(e){
    showLoading(false);
    showNotif('❌ Koneksi error: '+e.message, true, false);
    batalFotoPatroli();
  }
});

async function loadLogPatroli(){
  const todayStr = getTodayStr();
  const shift = statusHariIni.shift || document.getElementById('selectShiftPatroli').value || '';

  try{
    const res = await fetch(GAS_URL,{
      method:'POST',
      body:JSON.stringify({
        action:'getLogPatroli',
        nama: currentUser.nama,
        tanggal: todayStr,
        shift: shift
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
  }catch(e){
    console.error('loadLogPatroli error:', e);
  }
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

// Auto login kalau sudah pernah login
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
    loadOpsiAbsen().then(()=> showPage('home'));
  }
});

// Handle online/offline
window.addEventListener('online', () => {
  document.getElementById('offlineBadge').classList.remove('active');
  syncOfflineData();
});

window.addEventListener('offline', () => {
  document.getElementById('offlineBadge').classList.add('active');
});
