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

function showLoading(show){ document.getElementById('loadingOverlay').classList.toggle('active', show); }
function getTodayStr(){ const t=new Date(); return `${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`; }

async function showPage(page){
  try{
    if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
    if(html5QrcodeScanner && patroliActive){ await html5QrcodeScanner.stop().catch(()=>{}); html5QrcodeScanner=null; patroliActive=false; }
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const target = document.getElementById('page-'+page);
    if(target) target.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    const bottomNav=document.getElementById('bottomNav');
    if(page!=='login'){ bottomNav.classList.remove('hidden'); document.querySelector(`.nav-item[onclick="showPage('${page}')"]`)?.classList.add('active'); }
    else{ bottomNav.classList.add('hidden'); }
    if(page==='home'){ updateJam(); await updateStatusHome(); checkOfflineData(); }
    if(page==='absensi'){ await initAbsensi(); }
    if(page==='patroli'){ document.getElementById('tglPatroli').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); await getGPS(); await getAlamat(); await loadLogPatroli(); }
    if(page==='rekap'){ loadRekap(); }
    if(page==='profil'){ loadProfil(); }
  }catch(e){ console.error('showPage',e); }
}

function updateJam(){
  if(jamInterval) clearInterval(jamInterval);
  const update=()=>{
    const now=new Date();
    const jam=now.toLocaleTimeString('id-ID',{hour12:false});
    const tgl=now.toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
    document.getElementById('jamSekarang').textContent=jam;
    document.getElementById('tglSekarang').textContent=tgl;
    document.getElementById('tglAbsen').textContent=tgl;
    document.getElementById('jamAbsen').textContent=jam;
    document.getElementById('wmJamBox').textContent=jam.replace(/:/g,'.');
    document.getElementById('wmTanggal').textContent=now.toLocaleDateString('id-ID');
    const jp=document.getElementById('wmJamBoxPatroli'); if(jp) jp.textContent=jam.replace(/:/g,'.');
    const tp=document.getElementById('wmTanggalPatroli'); if(tp) tp.textContent=now.toLocaleDateString('id-ID');
  };
  update(); jamInterval=setInterval(update,1000);
}

function toggleDarkMode(){
  const h=document.documentElement; const b=document.getElementById('btnDarkMode');
  if(h.getAttribute('data-theme')==='dark'){ h.removeAttribute('data-theme'); b.textContent='🌙'; localStorage.setItem('theme','light'); }
  else{ h.setAttribute('data-theme','dark'); b.textContent='☀️'; localStorage.setItem('theme','dark'); }
}
if(localStorage.getItem('theme')==='dark'){ document.documentElement.setAttribute('data-theme','dark'); document.getElementById('btnDarkMode').textContent='☀️'; }

document.getElementById('btnLogin').addEventListener('click', async ()=>{
  const u=document.getElementById('username').value.trim();
  const p=document.getElementById('password').value;
  const s=document.getElementById('loginStatus');
  if(!u||!p){ s.textContent='Isi username dan password'; s.classList.remove('hidden'); return; }
  showLoading(true); s.classList.add('hidden');
  try{
    const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'login',username:u,password:p})});
    const h=await res.json(); showLoading(false);
    if(h.status==='sukses'){
      currentUser={nama:h.data.nama,username:h.data.username,foto:h.data.fotoProfil||h.data.foto||'',nohp:h.data.nohp||'',alamat:h.data.alamat||'',rekening:h.data.rekening||'',ttl:h.data.ttl||''};
      localStorage.setItem('currentUser',JSON.stringify(currentUser));
      document.getElementById('namaKaryawan').textContent=currentUser.nama;
      document.getElementById('namaAbsen').textContent=currentUser.nama;
      if(currentUser.foto){ document.getElementById('fotoProfil').src=currentUser.foto; document.getElementById('fotoProfil').style.display='block'; document.getElementById('fotoProfilAbsen').src=currentUser.foto; document.getElementById('fotoProfilAbsen').style.display='block'; }
      await loadOpsiAbsen(); showPage('home');
    }else{ s.textContent=h.message||h.pesan||'Login gagal'; s.classList.remove('hidden'); }
  }catch(e){ showLoading(false); s.textContent='Koneksi error: '+e.message; s.classList.remove('hidden'); }
});

function logout(){
  currentUser=null; statusHariIni={masuk:'',pulang:'',shift:'',pos:''};
  localStorage.removeItem('currentUser');
  Object.keys(localStorage).forEach(k=>{ if(k.startsWith('statusHariIni_')) localStorage.removeItem(k); });
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  if(html5QrcodeScanner){ html5QrcodeScanner.stop().catch(()=>{}); html5QrcodeScanner=null; }
  showPage('login');
}

async function loadOpsiAbsen(){
  try{
    const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'getOpsiAbsen'})});
    const h=await res.json();
    if(h.status==='sukses'){
      opsiShift=h.data.shift; opsiPos=h.data.pos;
      document.getElementById('selectShift').innerHTML=opsiShift.map(s=>`<option value="${s}">${s}</option>`).join('');
      document.getElementById('selectPos').innerHTML=opsiPos.map(p=>`<option value="${p}">${p}</option>`).join('');
      document.getElementById('selectShiftPatroli').innerHTML=opsiShift.map(s=>`<option value="${s}">${s}</option>`).join('');
    }
  }catch(e){ console.error('loadOpsiAbsen',e); }
}

async function checkOfflineData(){
  const d=JSON.parse(localStorage.getItem('offlineAbsen')||'[]');
  const c=document.getElementById('syncCard');
  if(d.length>0){ document.getElementById('syncText').textContent=`Ada ${d.length} data offline`; c.style.display='block'; document.getElementById('offlineBadge').classList.add('active'); }
  else{ c.style.display='none'; document.getElementById('offlineBadge').classList.remove('active'); }
}

async function syncOfflineData(){
  const d=JSON.parse(localStorage.getItem('offlineAbsen')||'[]'); if(d.length===0) return;
  showLoading(true); let s=0;
  for(const x of d){ try{ const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify(x)}); const h=await r.json(); if(h.status==='sukses') s++; }catch{} }
  showLoading(false); localStorage.setItem('offlineAbsen','[]'); checkOfflineData(); alert(`Sync selesai: ${s}/${d.length} data berhasil`); await updateStatusHome();
}

async function updateStatusHome(){
  if(!currentUser) return;
  const btn=document.getElementById('btnAbsenCepat'); const ic=document.getElementById('iconAbsenCepat'); const tx=document.getElementById('textAbsenCepat');
  btn.disabled=true; tx.textContent='Cek status...'; ic.textContent='hourglass_empty';
  try{
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'getStatusHariIni',nama:currentUser.nama})});
    const h=await r.json();
    if(h.status==='sukses'){ statusHariIni.masuk=h.data.masuk||''; statusHariIni.pulang=h.data.pulang||''; statusHariIni.shift=h.data.shift||''; statusHariIni.pos=h.data.pos||''; localStorage.setItem('statusHariIni_'+currentUser.username,JSON.stringify({...statusHariIni,tgl:h.data.tanggal||getTodayStr()})); }
  }catch(e){ const c=localStorage.getItem('statusHariIni_'+currentUser.username); if(c){ const o=JSON.parse(c); if(o.tgl===getTodayStr()) statusHariIni=o; } }
  document.getElementById('homeWaktuMasuk').textContent=statusHariIni.masuk||'-';
  document.getElementById('homeWaktuPulang').textContent=statusHariIni.pulang||'-';
  document.getElementById('homeShiftMasuk').textContent=statusHariIni.shift?`Shift ${statusHariIni.shift}`:'';
  const m=document.getElementById('homeItemMasuk'); const p=document.getElementById('homeItemPulang'); m.classList.remove('active','done'); p.classList.remove('active','done');
  if(statusHariIni.masuk){ m.classList.add('done'); if(statusHariIni.pulang){ p.classList.add('done'); btn.disabled=true; ic.textContent='check_circle'; tx.textContent='SUDAH ABSEN LENGKAP'; }else{ p.classList.add('active'); btn.disabled=false; ic.textContent='logout'; tx.textContent='ABSEN PULANG'; } }else{ m.classList.add('active'); btn.disabled=false; ic.textContent='login'; tx.textContent='ABSEN MASUK'; }
}

async function absenCepatDariHome(){ showPage('absensi'); setTimeout(()=>document.getElementById('btnAksiUtama').click(),300); }

async function initAbsensi(){ await getGPS(); await getAlamat(); await cekStatusHariIni(); updateTombolUtama(); }

async function getGPS(){
  return new Promise(r=>{
    if(!navigator.geolocation){ gpsData=null; r(); return; }
    navigator.geolocation.getCurrentPosition(pos=>{ gpsData={lat:pos.coords.latitude,lng:pos.coords.longitude}; document.getElementById('wmGps').textContent=`${gpsData.lat.toFixed(6)},${gpsData.lng.toFixed(6)}`; const g=document.getElementById('wmGpsPatroli'); if(g) g.textContent=`${gpsData.lat.toFixed(6)},${gpsData.lng.toFixed(6)}`; r(); },()=>{ gpsData=null; document.getElementById('wmGps').textContent='GPS tidak aktif'; const g=document.getElementById('wmGpsPatroli'); if(g) g.textContent='GPS tidak aktif'; r(); },{enableHighAccuracy:true,timeout:10000,maximumAge:60000});
  });
}

async function getAlamat(){
  if(!gpsData) return;
  try{ const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsData.lat}&lon=${gpsData.lng}`); const d=await r.json(); alamatData=d.display_name||''; document.getElementById('wmAlamat').textContent=alamatData.substring(0,50); }catch{ alamatData=''; }
}

async function cekStatusHariIni(){
  if(!currentUser) return; document.getElementById('btnAksiUtama').disabled=true;
  try{ const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'getStatusHariIni',nama:currentUser.nama})}); const h=await r.json(); if(h.status==='sukses'){ statusHariIni.masuk=h.data.masuk||''; statusHariIni.pulang=h.data.pulang||''; statusHariIni.shift=h.data.shift||''; statusHariIni.pos=h.data.pos||''; localStorage.setItem('statusHariIni_'+currentUser.username,JSON.stringify({...statusHariIni,tgl:h.data.tanggal||getTodayStr()})); } }catch{ const c=localStorage.getItem('statusHariIni_'+currentUser.username); if(c){ const o=JSON.parse(c); if(o.tgl===getTodayStr()) statusHariIni=o; } }
  document.getElementById('waktuMasuk').textContent=statusHariIni.masuk||'Belum absen';
  document.getElementById('waktuPulang').textContent=statusHariIni.pulang||'Belum absen';
  document.getElementById('infoShift').textContent=statusHariIni.shift?`Shift ${statusHariIni.shift} - ${statusHariIni.pos}`:'';
  const m=document.getElementById('itemMasuk'); const p=document.getElementById('itemPulang'); m.classList.remove('active','done'); p.classList.remove('active','done');
  if(statusHariIni.masuk){ m.classList.add('done'); if(statusHariIni.pulang){ p.classList.add('done'); }else{ p.classList.add('active'); } }else{ m.classList.add('active'); }
}

function updateTombolUtama(){
  const b=document.getElementById('btnAksiUtama'); const ic=document.getElementById('iconAksi'); const j=document.getElementById('judulAksi'); const s=document.getElementById('subAksi'); const fm=document.getElementById('formAbsenMasuk'); const fp=document.getElementById('formAbsenPulang');
  fm.classList.add('hidden'); fp.classList.add('hidden'); b.disabled=false;
  if(!statusHariIni.masuk){ b.dataset.tipe='in'; ic.textContent='login'; j.textContent='MASUK'; s.textContent='Tap untuk absen masuk'; b.textContent='ABSEN MASUK'; fm.classList.remove('hidden'); }
  else if(!statusHariIni.pulang){ b.dataset.tipe='out'; ic.textContent='logout'; j.textContent='PULANG'; s.textContent='Tap untuk absen pulang'; b.textContent='ABSEN PULANG'; fp.classList.remove('hidden'); }
  else{ b.dataset.tipe='done'; ic.textContent='check_circle'; j.textContent='SELESAI'; s.textContent='Absensi hari ini sudah lengkap'; b.textContent='SUDAH ABSEN LENGKAP'; b.disabled=true; }
}

document.getElementById('btnAksiUtama').addEventListener('click', async ()=>{
  const t=document.getElementById('btnAksiUtama').dataset.tipe; if(t=='done') return;
  if(t=='in'){ const sh=document.getElementById('selectShift').value; const po=document.getElementById('selectPos').value; if(!sh||!po){ showNotif('Pilih Shift dan Pos Jaga dulu',true,false); return; } }
  document.getElementById('tombolUtamaAbsen').classList.add('hidden'); document.getElementById('kameraArea').classList.remove('hidden');
  try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false}); document.getElementById('video').srcObject=stream; }catch(e){ showNotif('Gagal buka kamera: '+e.message,true,false); document.getElementById('kameraArea').classList.add('hidden'); document.getElementById('tombolUtamaAbsen').classList.remove('hidden'); }
});

document.getElementById('btnAmbilFoto').addEventListener('click', async ()=>{
  const v=document.getElementById('video'); const c=document.getElementById('canvas'); const x=c.getContext('2d');
  c.width=v.videoWidth; c.height=v.videoHeight; x.drawImage(v,0,0);
  x.fillStyle='rgba(0,0,0,0.7)'; x.fillRect(10,c.height-80,250,70); x.fillStyle='#fff'; x.font='bold 14px Arial'; x.fillText(document.getElementById('wmJamBox').textContent,15,c.height-65); x.font='11px Arial'; x.fillText(document.getElementById('wmTanggal').textContent,15,c.height-50); x.fillText(document.getElementById('wmGps').textContent,15,c.height-35); x.fillText(document.getElementById('wmAlamat').textContent.substring(0,30),15,c.height-20);
  const b64=c.toDataURL('image/jpeg',0.8).split(',')[1];
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  document.getElementById('kameraArea').classList.add('hidden'); document.getElementById('tombolUtamaAbsen').classList.remove('hidden');
  const t=document.getElementById('btnAksiUtama').dataset.tipe; const shift=t=='in'?document.getElementById('selectShift').value:''; const pos=t=='in'?document.getElementById('selectPos').value:''; const catatan=t=='out'?document.getElementById('inputCatatan').value:'';
  showLoading(true);
  try{
    const payload={action:'absen',nama:currentUser.nama,tipe:t,lat:gpsData?.lat||'',lng:gpsData?.lng||'',foto:b64}; if(shift) payload.shift=shift; if(pos) payload.pos=pos; if(catatan) payload.catatan=catatan;
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify(payload)}); const h=await r.json(); showLoading(false);
    if(h.status==='sukses'){ document.getElementById('audioTing').play(); showNotif(`✅ Absen ${t} berhasil jam ${h.jam}`,false,false); document.getElementById('preview').src='data:image/jpeg;base64,'+b64; document.getElementById('preview').classList.remove('hidden'); await cekStatusHariIni(); updateTombolUtama(); await updateStatusHome(); setTimeout(()=>document.getElementById('preview').classList.add('hidden'),3000); }
    else{ showNotif('❌ '+(h.message||h.pesan||'Gagal absen'),true,false); }
  }catch(e){ showLoading(false); const o=JSON.parse(localStorage.getItem('offlineAbsen')||'[]'); o.push({action:'absen',nama:currentUser.nama,tipe:t,lat:gpsData?.lat||'',lng:gpsData?.lng||'',foto:b64,shift,pos,catatan}); localStorage.setItem('offlineAbsen',JSON.stringify(o)); showNotif('📡 Offline - Data disimpan lokal',false,true); checkOfflineData(); }
});

document.getElementById('btnBatalFoto').addEventListener('click', ()=>{ if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} document.getElementById('kameraArea').classList.add('hidden'); document.getElementById('tombolUtamaAbsen').classList.remove('hidden'); });

function showNotif(teks,err=false,off=false){ const n=document.getElementById('notifAbsen'); const i=document.getElementById('notifIcon'); const t=document.getElementById('notifText'); n.classList.remove('hidden','gagal','sukses','loading'); if(err){n.classList.add('gagal');i.textContent='❌';}else if(off){n.classList.add('loading');i.textContent='📡';}else{n.classList.add('sukses');i.textContent='✅';} t.textContent=teks; setTimeout(()=>n.classList.add('hidden'),3000); }

async function mulaiScanPatroli(){
  const s=document.getElementById('selectShiftPatroli').value; if(!s){ showNotif('Pilih shift patroli dulu',true,false); return; }
  if(!html5QrcodeScanner){ html5QrcodeScanner=new Html5Qrcode("reader-patroli"); }
  patroliActive=true;
  html5QrcodeScanner.start({facingMode:"environment"},{fps:10,qrbox:250},(decoded)=>{ if(decoded.startsWith('PATROLI_')){ const kode=decoded.split('_')[1]; prosesScanPatroli(kode); html5QrcodeScanner.stop().catch(()=>{}); patroliActive=false; } },()=>{}).catch(e=>{ showNotif('Gagal buka kamera: '+e,true,false); patroliActive=false; });
}

async function prosesScanPatroli(kodeBarcode){
  const shift=document.getElementById('selectShiftPatroli').value;
  showNotif('Barcode terdeteksi! Ambil foto bukti patroli...',false,true);
  document.getElementById('areaPatroliScan').classList.add('hidden'); document.getElementById('kameraAreaPatroli').classList.remove('hidden');
  try{ stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false}); document.getElementById('videoPatroli').srcObject=stream; document.getElementById('btnKirimPatroli').dataset.kode=kodeBarcode; document.getElementById('btnKirimPatroli').dataset.shift=shift; }catch(e){ showNotif('Gagal buka kamera: '+e.message,true,false); batalFotoPatroli(); }
}

function batalFotoPatroli(){ if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;} document.getElementById('kameraAreaPatroli').classList.add('hidden'); document.getElementById('areaPatroliScan').classList.remove('hidden'); }

document.getElementById('btnKirimPatroli').addEventListener('click', async ()=>{
  const v=document.getElementById('videoPatroli'); const c=document.getElementById('canvas'); const x=c.getContext('2d');
  c.width=v.videoWidth; c.height=v.videoHeight; x.drawImage(v,0,0);
  x.fillStyle='rgba(139,75,92,0.9)'; x.fillRect(10,c.height-100,300,90); x.fillStyle='#fff'; x.font='bold 16px Arial'; x.fillText('PATROLI',15,c.height-80); x.font='12px Arial'; x.fillText(document.getElementById('wmJamBoxPatroli').textContent,15,c.height-65); x.fillText(document.getElementById('wmTanggalPatroli').textContent,15,c.height-50); x.fillText(document.getElementById('wmGpsPatroli').textContent,15,c.height-35); x.fillText(document.getElementById('wmAlamat').textContent.substring(0,35),15,c.height-20);
  const b64=c.toDataURL('image/jpeg',0.8).split(',')[1];
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  const kode=document.getElementById('btnKirimPatroli').dataset.kode; const shift=document.getElementById('btnKirimPatroli').dataset.shift;
  showLoading(true);
  try{
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'patroli',nama:currentUser.nama,kodeBarcode:kode,shift:shift,lat:gpsData?.lat||'',lng:gpsData?.lng||'',foto:b64})});
    const h=await r.json(); showLoading(false);
    if(h.status==='sukses'){ document.getElementById('audioTing').play(); showNotif(`✅ ${h.pesan} jam ${h.jam}`,false,false); batalFotoPatroli(); await loadLogPatroli(); }
    else{ showNotif('❌ '+(h.message||h.pesan||'Gagal patroli'),true,false); batalFotoPatroli(); }
  }catch(e){ showLoading(false); showNotif('❌ Koneksi error: '+e.message,true,false); batalFotoPatroli(); }
});

async function loadLogPatroli(){
  const todayStr=getTodayStr(); const shift=statusHariIni.shift||document.getElementById('selectShiftPatroli').value||'';
  try{
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'getLogPatroli',nama:currentUser.nama,tanggal:todayStr,shift:shift})});
    const h=await r.json();
    if(h.status==='sukses'){
      const list=document.getElementById('listPatroli');
      if(h.data.length===0){ list.innerHTML='<p style="text-align:center;color:var(--text2);padding:20px">Belum ada patroli hari ini</p>'; }
      else{ list.innerHTML=h.data.map(p=>`<div class="card" style="margin:8px 0;padding:12px"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-weight:600">${p.pos}</div><div style="font-size:12px;color:var(--text2)">${p.jam} - Shift ${p.shift}</div></div><span class="material-icons-round" style="color:#4A7C59">check_circle</span></div>`).join(''); }
      document.getElementById('progressPatroliBar').style.width=h.ringkasan.persentase+'%';
      document.getElementById('posSudahPatroli').textContent=h.ringkasan.sudah_patroli;
      document.getElementById('posBelumPatroli').textContent=h.ringkasan.belum_patroli.length;
    }
  }catch(e){ console.error(e); }
}

function gantiBulan(delta){ currentBulan+=delta; if(currentBulan<0){currentBulan=11;currentTahun--;} else if(currentBulan>11){currentBulan=0;currentTahun++;} loadRekap(); }

async function loadRekap(){
  const bulan=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  document.getElementById('namaBulan').textContent=bulan[currentBulan]+' '+currentTahun;
  showLoading(true);
  try{
    const r=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'rekap',nama:currentUser.nama,bulan:currentBulan+1,tahun:currentTahun})});
    const h=await r.json(); showLoading(false);
    if(h.status==='sukses'){
      const tbody=document.getElementById('rekapBody'); const empty=document.getElementById('rekapEmpty'); const data=h.data;
      if(data.length===0){ tbody.innerHTML=''; empty.classList.remove('hidden'); }
      else{
        empty.classList.add('hidden');
        tbody.innerHTML=data.map(d=>{ const hari=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']; const t=new Date(d.tanggal.split('/').reverse().join('-')); const namaHari=hari[t.getDay()]; const isWeekend=t.getDay()===0||t.getDay()===6; const isLibur=d.masuk==='-'; return `<tr class="${isWeekend?'weekend':''} ${isLibur?'hari-min':''}"><td>${d.tanggal}</td><td>${namaHari}</td><td>${d.masuk}</td><td>${d.pulang}</td><td>${d.durasi}</td><td>${d.shift||'-'}</td><td>${d.pos||'-'}</td></tr>`; }).join('');
      }
      const totalMasuk=data.filter(d=>d.masuk!=='-').length;
      const totalJam=data.reduce((sum,d)=>{ if(d.durasi!=='-'){ const jam=parseInt(d.durasi.split('j')[0])||0; return sum+jam; } return sum; },0);
      document.getElementById('totalMasuk').textContent=totalMasuk;
      document.getElementById('totalJam').textContent=totalJam+'j';
    }
  }catch(e){ showLoading(false); document.getElementById('rekapBody').innerHTML=''; document.getElementById('rekapEmpty').classList.remove('hidden'); }
}

function loadProfil(){
  if(!currentUser) return;
  document.getElementById('profilNama').textContent=currentUser.nama;
  document.getElementById('profilUsername').textContent='@'+currentUser.username;
  if(currentUser.foto) document.getElementById('profilFotoBesar').src=currentUser.foto;
  document.getElementById('inputNoHP').value=currentUser.nohp||'';
  document.getElementById('inputAlamat').value=currentUser.alamat||'';
  document.getElementById('inputRekening').value=currentUser.rekening||'';
  document.getElementById('inputTTL').value=currentUser.ttl||'';
}

document.getElementById('inputFotoProfil').addEventListener('change', async (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=async (ev)=>{
    const b64=ev.target.result.split(',')[1]; showLoading(true);
    try{
      const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'updateFoto',username:currentUser.username,foto:b64})});
      const hasil=await res.json(); showLoading(false);
      const notif=document.getElementById('notifFoto'); notif.classList.remove('hidden');
      if(hasil.status==='sukses'){ notif.className='status sukses'; notif.textContent='✅ Foto profil berhasil diupdate'; currentUser.foto=hasil.fotoUrl; localStorage.setItem('currentUser',JSON.stringify(currentUser)); document.getElementById('fotoProfil').src=hasil.fotoUrl; document.getElementById('fotoProfilAbsen').src=hasil.fotoUrl; document.getElementById('profilFotoBesar').src=hasil.fotoUrl; }
      else{ notif.className='status gagal'; notif.textContent='❌ '+(hasil.message||'Gagal update foto'); }
      setTimeout(()=>notif.classList.add('hidden'),3000);
    }catch(err){ showLoading(false); const notif=document.getElementById('notifFoto'); notif.className='status gagal'; notif.textContent='❌ Koneksi error'; notif.classList.remove('hidden'); }
  };
  reader.readAsDataURL(file);
});

async function gantiPassword(){
  const lama=document.getElementById('passLama').value; const baru=document.getElementById('passBaru').value; const baru2=document.getElementById('passBaru2').value; const notif=document.getElementById('notifPass');
  notif.classList.add('hidden');
  if(!lama||!baru2){ notif.className='status gagal'; notif.textContent='❌ Semua field wajib diisi'; notif.classList.remove('hidden'); return; }
  if(baru!==baru2){ notif.className='status gagal'; notif.textContent='❌ Password baru tidak sama'; notif.classList.remove('hidden'); return; }
  if(baru.length<5){ notif.className='status gagal'; notif.textContent='❌ Password minimal 5 karakter'; notif.classList.remove('hidden'); return; }
  showLoading(true);
  try{
    const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'updatePassword',username:currentUser.username,passwordLama:lama,passwordBaru:baru})});
    const hasil=await res.json(); showLoading(false);
    if(hasil.status==='sukses'){ notif.className='status sukses'; notif.textContent='✅ Password berhasil diganti'; document.getElementById('passLama').value=''; document.getElementById('passBaru').value=''; document.getElementById('passBaru2').value=''; }
    else{ notif.className='status gagal'; notif.textContent='❌ '+(hasil.message||'Gagal ganti password'); }
    notif.classList.remove('hidden');
  }catch(e){ showLoading(false); notif.className='status gagal'; notif.textContent='❌ Koneksi error: '+e.message; notif.classList.remove('hidden'); }
}

async function updateDataPersonal(){
  const nohp=document.getElementById('inputNoHP').value; const alamat=document.getElementById('inputAlamat').value; const rekening=document.getElementById('inputRekening').value; const ttl=document.getElementById('inputTTL').value; const notif=document.getElementById('notifData');
  showLoading(true);
  try{
    const res=await fetch(GAS_URL,{method:'POST',body:JSON.stringify({action:'updateDataPersonal',username:currentUser.username,nohp:nohp,alamat:alamat,rekening:rekening,ttl:ttl})});
    const hasil=await res.json(); showLoading(false);
    if(hasil.status==='sukses'){ notif.className='status sukses'; notif.textContent='✅ Data personal berhasil disimpan'; currentUser.nohp=nohp; currentUser.alamat=alamat; currentUser.rekening=rekening; currentUser.ttl=ttl; localStorage.setItem('currentUser',JSON.stringify(currentUser)); }
    else{ notif.className='status gagal'; notif.textContent='❌ '+(hasil.message||'Gagal simpan data'); }
    notif.classList.remove('hidden');
  }catch(e){ showLoading(false); notif.className='status gagal'; notif.textContent='❌ Koneksi error: '+e.message; notif.classList.remove('hidden'); }
}

window.addEventListener('load', ()=>{
  const saved=localStorage.getItem('currentUser');
  if(saved){
    currentUser=JSON.parse(saved);
    document.getElementById('namaKaryawan').textContent=currentUser.nama;
    document.getElementById('namaAbsen').textContent=currentUser.nama;
    if(currentUser.foto){ document.getElementById('fotoProfil').src=currentUser.foto; document.getElementById('fotoProfil').style.display='block'; document.getElementById('fotoProfilAbsen').src=currentUser.foto; document.getElementById('fotoProfilAbsen').style.display='block'; }
    loadOpsiAbsen().then(()=>showPage('home'));
  }
});

window.addEventListener('online', ()=>{ document.getElementById('offlineBadge').classList.remove('active'); syncOfflineData(); });
window.addEventListener('offline', ()=>{ document.getElementById('offlineBadge').classList.add('active'); });
