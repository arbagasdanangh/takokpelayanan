"use strict";
var SYN={imb:"pbg",izin:"perizinan",dokter:"sip",bidan:"sip",perawat:"sip",apoteker:"sip",apotek:"sip",klinik:"sip",bayar:"pembayaran",tagihan:"pembayaran",komplain:"pengaduan",keluhan:"pengaduan",lambat:"keterlambatan",telat:"keterlambatan",tanah:"pertanahan",rumah:"perumahan",bangunan:"pbg",baliho:"reklame",iklan:"reklame",billboard:"reklame",sekolah:"pendidikan",paud:"pendidikan",hotel:"pariwisata",wisata:"pariwisata",kopi:"restoran",warung:"restoran",toko:"perdagangan",usaha:"nib",umkm:"nib",tipis:"nib",sewa:"aset",parkir:"parkir",wa:"whatsapp",lingkungan:"amdal",limbah:"amdal",difabel:"disabilitas",disabilitas:"difabel",survei:"skm",kepuasan:"skm",ambil:"pengambilan",jadi:"pengambilan",status:"status",koperasi:"koperasi"};
var EX=["Mau bikin NIB","SIP dokter","Bayar retribusi IPT","Pasang reklame","Izin lingkungan","Izin IMB / PBG"];

var $=function(i){return document.getElementById(i)};
var S="out",ME=null,CFG={},LOCS=[],LD={},LOC="pusat",fl="Semua",qv="";
var M=[],MYST={},T=[],SEL=null,SM=[],KEEP={},FOC=null,SENT=[],MYV=false,OPENK=null,AF={st:"pend",loc:"all",q:"",tp:"",sn:"",so:"prio"},LAST=Date.now(),SEEN=null,SEENA=null,TIMER=null,AUTH="masuk",SIG="",ASIG="";
var APP=location.origin+"/",MYDB={},BALAS=null;
var TAGS=["Mendesak","Tindak lanjut","Eskalasi","Menunggu berkas","Kasus khusus"],BULK={},TPSIG="";
var QQ=["Apa saja persyaratannya?","Berapa lama prosesnya?","Apakah ada biaya?","Bagaimana cara mengajukannya?"];
var QR=["Terima kasih, pertanyaan Anda sudah kami terima dan sedang kami proses.","Silakan datang ke loket terkait dengan membawa dokumen asli dan fotokopi persyaratan.","Mohon lengkapi berkas yang kurang, lalu ajukan kembali melalui sistem yang sesuai.","Untuk penjelasan lebih lanjut, kami akan menghubungi Anda melalui WhatsApp."];
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function clean(s){return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim()}
function fmt(ts){return new Date(ts).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}
function err(s){$("em").textContent=s||""}
function ph(s){s=String(s).replace(/[\s.\-()]/g,"");if(/^\+?62/.test(s))s=s.replace(/^\+?62/,"0");return /^08\d{7,12}$/.test(s)?s:null}
function waLink(p,t){return p?"https://wa.me/62"+p.slice(1)+"?text="+encodeURIComponent(t):""}
function cur(){return LD[LOC]||[]}
function label(k){var p=String(k).split("_"),l=LOCS.filter(function(x){return x.id===p[0]})[0],e=(LD[p[0]]||[]).filter(function(x){return String(x[0])===p[1]})[0];return (l?l.nm:p[0])+(e?" - "+e[1]:(p[1]==="0"?"":" - Loket "+p[1]))}
function lc(){znui();$("lc").innerHTML=LOCS.map(function(l){return '<button type="button" class="chip" data-l="'+esc(l.id)+'" aria-pressed="'+(l.id===LOC)+'">'+esc(l.nm)+'</button>'}).join("")}
async function api(path,body){var o={credentials:"same-origin",headers:{}};if(body!==undefined){o.method="POST";o.headers["Content-Type"]="application/json";o.body=JSON.stringify(body)}
 var u=path.split("?"),r=await fetch("/api/app?p="+encodeURIComponent(u[0].replace(/^\/api/,""))+(u[1]?"&"+u[1]:""),o),j={};try{j=await r.json()}catch(e){}
 if(!r.ok){if(r.status===401&&S!=="out"&&path.indexOf("/masuk")<0){reset("Sesi berakhir. Silakan masuk kembali.")}throw new Error(j.error||"Terjadi kesalahan ("+r.status+")")}return j}
function toast(msg,lbl,fn){var t=$("tt");t.hidden=false;t.innerHTML="";var s=document.createElement("span");s.textContent=msg;t.appendChild(s);if(fn){var b=document.createElement("button");b.type="button";b.className="btn";b.textContent=lbl||"Lihat";b.onclick=function(){t.hidden=true;fn()};t.appendChild(b)}var x=document.createElement("button");x.type="button";x.className="btn";x.textContent="Tutup";x.onclick=function(){t.hidden=true};t.appendChild(x);clearTimeout(toast.h);toast.h=setTimeout(function(){t.hidden=true},12000)}
function notify(title,body,fn){toast(title+": "+body,"Lihat",fn);try{if(window.Notification&&Notification.permission==="granted"){var n=new Notification(title,{body:body});n.onclick=function(){window.focus();if(fn)fn()}}}catch(x){}try{if(navigator.vibrate)navigator.vibrate(200)}catch(x){}try{var c=new (window.AudioContext||window.webkitAudioContext)(),o=c.createOscillator();o.connect(c.destination);o.frequency.value=880;o.start();setTimeout(function(){o.stop();c.close()},160)}catch(x){}}
function an(){var el=$("an"),t=[];if(CFG.info)t.push(clean(CFG.info).slice(0,300));if(CFG.jam)t.push("Jam layanan: "+clean(CFG.jam).slice(0,100));el.hidden=!t.length;el.textContent=t.join(" | ")}
function toks(s){return s.toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(function(w){return w.length>1}).map(function(w){return SYN[w]||w})}
function score(d,t){var h=(d[1]+" "+d[2]+" "+(d[4]||"")).toLowerCase(),n=d[1].toLowerCase(),s=0;t.forEach(function(w){if(h.indexOf(w)>-1)s+=2;if(n.indexOf(w)>-1)s+=3});return s}
function sysOk(d){return fl==="Semua"||String(d[3]).indexOf(fl)>-1}
function msgsOf(k){return M.filter(function(x){return x.n===k})}
function hariId(ts){return new Date(ts).toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function bubbles(L,mine,rd){
 if(!L.length)return '<p class="sys">Belum ada pesan. Tulis pertanyaan Anda di bawah.</p>';
 var pd="",o=L.map(function(m){var d=new Date(m.ts).toDateString(),sep=d!==pd?'<div class="dsep">'+esc(hariId(m.ts))+'</div>':"";pd=d;return sep+'<div class="m'+(m.by===mine?' me':'')+'">'+esc(m.text)+'<small>'+(m.by==="admin"?"Admin":"Pemohon")+', '+fmt(m.ts)+'</small></div>'}).join("");
 var last=L[L.length-1];
 if(mine==="user"&&last.by==="user")o+='<div class="rcpt">'+(rd&&rd>=last.ts?'&#10003;&#10003; Dibaca admin':'&#10003; Terkirim')+'</div>';
 return o}
function conv(a){return a.map(function(m){return{id:m.id,n:m.kunci,by:m.dari==="admin"?"admin":"user",text:m.isi,ts:m.waktu}})}
function guard(t,k){
 if(t.length>800)return "Pesan terlalu panjang (maksimal 800 karakter).";
 if(/\d{16}/.test(t.replace(/[\s.\-]/g,"")))return "Demi keamanan, jangan kirim NIK/KTP lengkap di sini. Berkas asli diserahkan langsung di loket.";
 if(msgsOf(k).length>=200)return "Percakapan ini sudah penuh. Silakan hubungi loket secara langsung.";
 var n=Date.now();SENT=SENT.filter(function(x){return n-x<60000});
 if(SENT.length&&n-SENT[SENT.length-1]<3000)return "Terlalu cepat. Tunggu beberapa detik.";
 if(SENT.length>=5)return "Terlalu banyak pesan dalam satu menit. Coba lagi sebentar lagi.";return ""}
function lastBy(){var by={};M.slice().sort(function(a,b){return a.ts-b.ts}).forEach(function(m){by[m.n]=m});return by}
function title(){var c=0;if(S==="user"){var by=lastBy();for(var k in by)if(by[k].by==="admin")c++}else if(S==="adm")c=T.filter(function(x){return x.pend}).length;document.title=(c?"("+c+") ":"")+"Takok Pelayanan Suroboyo"}
function entryOf(k){var p=String(k).split("_"),l=LD[p[0]]||[];for(var i=0;i<l.length;i++)if(String(l[i][0])===p[1])return l[i];return null}
function chatHtml(k){
 var en=entryOf(k);if(en&&en[5]===false)return '<div class="qa"><p class="sys">Fasilitas ini tidak menerima pertanyaan lewat aplikasi. Silakan bertanya di Ruang Pengaduan atau Loket Informasi.</p></div>';
 if(S!=="user")return '<div class="qa"><h3>Diskusi dengan admin</h3><p class="sys">Masuk sebagai pemohon di bagian atas untuk berdiskusi secara pribadi dengan admin loket ini.</p></div>';
 var L=msgsOf(k),last=L[L.length-1],rt=(MYST[k]||{}).nilai,aw=CFG.wa||"",ex="";
 if(last&&last.by==="admin")ex+='<div class="rate"><span class="sys">Apakah jawaban membantu? '+(rt?'Penilaian Anda: '+rt+'/5':'')+'</span><span class="btns">'+[1,2,3,4,5].map(function(i){return '<button type="button" class="chip" data-act="rate" data-n="'+k+'" data-v="'+i+'" aria-label="Nilai '+i+' dari 5">'+i+'</button>'}).join("")+'</span></div>';
 if(aw)ex+='<div class="hint"><a class="chip" href="'+esc(waLink(aw,"Halo admin, saya "+ME.nama+" ("+ME.hp+") baru mengirim pertanyaan di "+label(k)+". Mohon dicek di Takok Pelayanan Suroboyo."))+'" target="_blank" rel="noopener noreferrer">Beritahu admin via WhatsApp</a></div>';
 return '<div class="qa"><h3>Diskusi pribadi dengan admin</h3><p class="sys">Hanya Anda dan admin yang dapat melihat percakapan ini. Jangan kirim NIK lengkap, kata sandi, atau kode OTP.'+(BALAS?' Rata-rata admin membalas dalam '+(BALAS<60?"±"+BALAS+" menit":"±"+Math.round(BALAS/60)+" jam")+'.':"")+'</p><div class="thread">'+bubbles(L,"user",MYDB[k])+'</div>'+(L.length?"":QQ.map(function(q){return '<button type="button" class="chip" data-qq="'+esc(q)+'">'+esc(q)+'</button> '}).join(""))+'<div class="qf"><textarea data-k="q:'+k+'" rows="3" maxlength="800" placeholder="Tulis pertanyaan atau balasan Anda" aria-label="Pesan"></textarea><div class="btns" style="justify-content:space-between;align-items:center;width:100%"><small class="sys ctr">0/800 &middot; Enter untuk kirim</small><button type="button" class="send" data-act="send" data-n="'+k+'">Kirim</button></div></div>'+ex+'</div>'}
function render(){
 title();
 if(S==="adm"||(S==="user"&&MYV))return;
 var op={};[].forEach.call(document.querySelectorAll("details.row[open]"),function(x){op[x.dataset.n]=1});if(OPENK)op[OPENK]=1;
 var ae=document.activeElement;FOC=ae&&ae.dataset&&ae.dataset.k?{k:ae.dataset.k,s:ae.selectionStart,e:ae.selectionEnd}:null;
 [].forEach.call(document.querySelectorAll("#list [data-k]"),function(e){KEEP[e.dataset.k]=e.value});
 var t=toks(qv),rows=cur().filter(sysOk).filter(zOk).map(function(d){return{d:d,s:t.length?score(d,t):0}});
 if(t.length)rows=rows.filter(function(r){return r.s>0}).sort(function(a,b){return b.s-a.s||a.d[0]-b.d[0]});
 var ln=(LOCS.filter(function(x){return x.id===LOC})[0]||{nm:""}).nm;
 $("res").textContent=t.length?(rows.length?"Loket yang paling sesuai ("+rows.length+")":""):"Semua loket "+ln+" ("+rows.length+")";
 if(!rows.length){var oth="";if(t.length)LOCS.forEach(function(l){if(l.id===LOC)return;var c=(LD[l.id]||[]).filter(function(d){return score(d,t)>0}).length;if(c)oth+='<button type="button" class="chip" data-go="'+esc(l.id)+'">'+esc(l.nm)+' ('+c+')</button> '});$("list").innerHTML='<div class="empty">Belum ada loket yang cocok di lokasi ini. Coba kata lain, atau datangi Loket Informasi atau Loket CS untuk konsultasi.'+(oth?'<p>Ada hasil di lokasi lain:</p>'+oth:'')+'</div>';return}
 PZ=null;$("list").innerHTML=rows.map(function(r,i){var d=r.d,hd=(LOC==="mpp"&&d[4]&&d[4]!==PZ)?zhead(d[4]):"",k=LOC+"_"+d[0],first=t.length&&i===0,L=S==="user"?msgsOf(k):[],last=L[L.length-1];
  var c=last?(last.by==="admin"?'<span class="cnt hot">Ada balasan</span>':'<span class="cnt">Menunggu balasan</span>'):'';
  return hd+'<details data-n="'+k+'"'+zst(d)+' class="row'+(first?' best':'')+'"'+(first||op[k]?' open':'')+'><summary><span class="no" aria-label="Nomor loket">'+d[0]+'</span><span class="nm">'+esc(d[1])+'</span>'+c+'<span class="tag">'+esc(d[4]||String(d[3]).split(" / ")[0])+'</span></summary><div class="body"><p>'+esc(d[2])+'</p><p class="sys">Sistem: '+esc(d[3])+'</p>'+chatHtml(k)+'</div></details>'}).join("");
 [].forEach.call(document.querySelectorAll("#list [data-k]"),function(e){var k=e.dataset.k;if(KEEP[k])e.value=KEEP[k];if(FOC&&FOC.k===k){e.focus();try{e.setSelectionRange(FOC.s,FOC.e)}catch(x){}}});
 if(OPENK){var el=document.querySelector('details[data-n="'+OPENK+'"]');OPENK=null;if(el)el.scrollIntoView({block:"start"})}}
function openKey(k){LOC=k.split("_")[0];ZN="Semua";lc();qv="";$("q").value="";OPENK=k;MYV=false;window.PN="";ui()}
/* ---- Tampilan & login ---- */
function ui(){
 $("role").textContent=S==="adm"?"Admin":S==="user"?"Pemohon: "+ME.nama:"Belum masuk";
 $("lo").hidden=S==="out";$("nb").hidden=!(S!=="out"&&window.Notification&&Notification.permission==="default");$("my").hidden=S!=="user";$("my").textContent=MYV?"Kembali ke loket":"Percakapan saya";
 $("v-adm").hidden=S!=="adm";$("v-cari").hidden=S==="adm"||MYV||!!window.PN;$("v-my").hidden=!(S==="user"&&MYV&&!window.PN);
 var lg=$("lg");lg.hidden=S!=="out";
 if(S==="out"&&!$("lg").dataset.on){$("lg").dataset.on="1";loginUI()}
 if(S!=="out")$("lg").dataset.on="";
 if(S==="adm")admUI();else if(S==="user"&&MYV)myList();else render();if(window.fiturUI)fiturUI()}
function loginUI(){var reg=AUTH==="daftar";
 $("lg").innerHTML='<div class="card"><h2>Pemohon</h2><div class="hint" style="margin:0"><button type="button" class="chip" data-a="masuk" aria-pressed="'+!reg+'">Masuk</button><button type="button" class="chip" data-a="daftar" aria-pressed="'+reg+'">Daftar baru</button></div>'
 +(reg?'<input id="ln" placeholder="Nama lengkap" maxlength="60" autocomplete="name" aria-label="Nama"><input id="lh" type="tel" inputmode="tel" placeholder="Nomor HP (08xxxxxxxxxx)" maxlength="16" autocomplete="tel" aria-label="Nomor HP"><input id="le" type="email" placeholder="Email" maxlength="100" autocomplete="email" aria-label="Email"><input id="lp" type="password" inputmode="numeric" placeholder="Buat PIN 6 angka" maxlength="6" autocomplete="new-password" aria-label="PIN"><button class="send" id="ld" type="button">Daftar dan masuk</button>'
 :'<input id="lh" type="tel" inputmode="tel" placeholder="Nomor HP (08xxxxxxxxxx)" maxlength="16" autocomplete="tel" aria-label="Nomor HP"><input id="lp" type="password" inputmode="numeric" placeholder="PIN 6 angka" maxlength="6" autocomplete="current-password" aria-label="PIN"><button class="send" id="lu" type="button">Masuk</button>')
 +'<p class="sys" style="margin:0">Percakapan Anda bersifat pribadi. Nomor HP dan email hanya dilihat admin.</p></div>'
 +'<div class="card"><h2>Admin</h2><p class="sys" style="margin:0">Khusus petugas PTSP. Sesi berakhir otomatis bila tidak aktif.</p><input id="lw" type="password" placeholder="Kata sandi admin" autocomplete="current-password" aria-label="Kata sandi admin"><button class="send" id="la" type="button">Masuk admin</button></div>'}
async function startSession(j){S=j.saya.peran==="admin"?"adm":"user";ME=j.saya;LAST=Date.now();err("");MYV=false;SEEN=null;SEENA=null;SEL=null;SIG="";ASIG="";$("lg").dataset.on="";startPoll();if(S==="adm")api("/api/admin/templat").then(function(j){QR=j.daftar;if($("tq"))$("tq").value=QR.join("\n");admPane()}).catch(function(){});ui()}
$("lg").addEventListener("click",async function(e){var id=e.target.id,a=e.target.dataset.a;err("");
 if(a){AUTH=a;loginUI();return}
 try{
 if(id==="lu"){var p=ph($("lh").value);if(!p){err("Nomor HP tidak valid. Contoh: 081234567890.");return}await startSession(await api("/api/masuk",{hp:p,pin:$("lp").value}))}
 if(id==="ld"){var n=clean($("ln").value),p2=ph($("lh").value),em=$("le").value.trim();if(n.length<2){err("Isi nama Anda.");return}if(!p2){err("Nomor HP tidak valid. Contoh: 081234567890.");return}if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){err("Email tidak valid.");return}if(!/^\d{6}$/.test($("lp").value)){err("PIN harus 6 angka.");return}
  await startSession(await api("/api/daftar",{nama:n,hp:p2,email:em,pin:$("lp").value}))}
 if(id==="la"){await startSession(await api("/api/admin/masuk",{password:$("lw").value}))}
 }catch(x){err(x.message)}});
function reset(msg){window.PN="";$("v-adm").dataset.on="";$("v-adm").innerHTML="";clearInterval(TIMER);TIMER=null;S="out";ME=null;M=[];MYST={};T=[];SEL=null;SM=[];KEEP={};SENT=[];MYV=false;SEEN=null;SEENA=null;document.title="Takok Pelayanan Suroboyo";ui();err(msg||"")}
$("lo").onclick=async function(){try{await api("/api/keluar",{})}catch(x){}reset()};
$("my").onclick=function(){window.PN="";MYV=!MYV;ui()};
["click","keydown","touchstart","scroll"].forEach(function(ev){addEventListener(ev,function(){LAST=Date.now()},{passive:true})});
setInterval(function(){if(S!=="out"&&Date.now()-LAST>(S==="adm"?600000:900000)){api("/api/keluar",{}).catch(function(){});reset("Sesi berakhir karena tidak aktif. Silakan masuk kembali.")}},20000);
/* ---- Polling & notifikasi ---- */
function startPoll(){clearInterval(TIMER);tick();TIMER=setInterval(tick,S==="adm"?(document.hidden?30000:10000):(document.hidden?60000:20000))}
document.addEventListener("visibilitychange",function(){if(S!=="out")startPoll()});
async function tick(){try{
 if(S==="user"){var j=await api("/api/pesan"),arr=conv(j.pesan).sort(function(a,b){return a.ts-b.ts});
  if(window.pmhCheck)pmhCheck(j.pmh||[]);if(window.bkCheck)bkCheck(j.bk||[]);if(SEEN)arr.forEach(function(m){if(m.by==="admin"&&!SEEN[m.id])notify("Admin membalas",label(m.n),function(){openKey(m.n)})});
  SEEN={};arr.forEach(function(m){SEEN[m.id]=1});var sg=arr.length+":"+(arr.length?arr[arr.length-1].id:0)+JSON.stringify(j.status)+JSON.stringify(j.dibaca||{});
  if(sg!==SIG){SIG=sg;M=arr;MYST=j.status;MYDB=j.dibaca||{};render();if(MYV)myList()}}
 if(S==="adm"){var a=await api("/api/admin/percakapan"),cur2={};a.daftar.forEach(function(x){if(x.pend)cur2[x.pid+"|"+x.kunci+"|"+x.waktu]=x});
  if(SEENA)for(var id in cur2)if(!SEENA[id])notify("Pesan baru",cur2[id].nama+" - "+label(cur2[id].kunci),(function(x){return function(){pick(x)}})(cur2[id]));
  SEENA={};for(var i2 in cur2)SEENA[i2]=1;var sa=JSON.stringify(a.daftar);if(sa!==ASIG){ASIG=sa;T=a.daftar;admList()}else title();
  if(SEL){var pm=await api("/api/admin/pesan?pid="+SEL.pid+"&kunci="+encodeURIComponent(SEL.kunci)),sm=conv(pm.pesan).sort(function(x,y){return x.ts-y.ts}),ss=sm.length+":"+(sm.length?sm[sm.length-1].id:0),first=SEL.cat===undefined;
   if(first){SEL.cat=pm.catatan||"";SEL.tag=pm.tag&&pm.tag.tags?pm.tag:{tags:[],pic:"",tl:""}}
   var asg=JSON.stringify([pm.analisa&&pm.analisa.baris,pm.saran]);if(first||asg!==SEL.asg){SEL.asg=asg;SEL.an=pm.analisa;SEL.saran=pm.saran;if(!first)admPane()}
   if(first)admPane();if(ss!==SM.sig){sm.sig=ss;SM=sm;admPane()}}}
 }catch(x){}}
/* ---- Pencarian, filter, tema ---- */
function setQ(v){qv=v;$("q").value=v;render()}
$("go").onclick=function(){setQ($("q").value)};
$("q").addEventListener("input",function(){qv=this.value;render()});
$("q").addEventListener("keydown",function(e){if(e.key==="Enter")setQ(this.value)});
$("ex").innerHTML=EX.map(function(x){return '<button type="button" class="chip">'+esc(x)+'</button>'}).join("");
$("ex").onclick=function(e){if(e.target.classList.contains("chip"))setQ(e.target.textContent)};
$("fl").innerHTML=["Semua","SSW","OSS","SIMBG"].map(function(x){return '<button type="button" class="chip" aria-pressed="'+(x===fl)+'">'+(x==="Semua"?"Semua sistem":x)+'</button>'}).join("");
$("fl").onclick=function(e){var b=e.target.closest(".chip");if(!b)return;fl=b.textContent==="Semua sistem"?"Semua":b.textContent;[].forEach.call($("fl").children,function(c){c.setAttribute("aria-pressed",c===b)});render()};
$("th").onclick=function(){var r=document.documentElement,dk=r.getAttribute("data-theme")?r.getAttribute("data-theme")==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.setAttribute("data-theme",dk?"light":"dark")};
$("lc").onclick=function(e){var b=e.target.closest("[data-l]");if(!b)return;LOC=b.dataset.l;ZN="Semua";qv="";$("q").value="";lc();render()};
$("nb").onclick=function(){try{Notification.requestPermission().then(function(){ui()})}catch(x){err("Browser tidak mengizinkan notifikasi di halaman ini.")}};
/* ---- Pemohon ---- */
function myList(){var el=$("v-my");var by=lastBy(),ks=Object.keys(by).sort(function(a,b){return by[b].ts-by[a].ts});
 el.innerHTML='<h3 style="margin:16px 0 8px;font-size:1rem">Percakapan saya</h3>'+(ks.length?'<div class="tl" id="ml"></div>':'<div class="empty">Anda belum memulai percakapan. Buka sebuah loket lalu tulis pertanyaan Anda.</div>');
 var ml=$("ml");if(ml)ks.forEach(function(k){var m=by[k],b=document.createElement("button");b.type="button";b.className="ti";var h=document.createElement("b");h.textContent=label(k);var s=document.createElement("span");s.textContent=(m.by==="admin"?"Admin: ":"Anda: ")+m.text;b.appendChild(h);b.appendChild(s);if(m.by==="admin"){var e=document.createElement("em");e.textContent="Ada balasan";b.appendChild(e)}
  b.onclick=function(){openKey(k)};ml.appendChild(b)});title()}
$("list").addEventListener("click",async function(e){err("");
 var qq=e.target.closest("[data-qq]");if(qq){var t0=qq.closest(".qa").querySelector("textarea");t0.value=qq.dataset.qq;t0.focus();t0.dispatchEvent(new Event("input",{bubbles:true}));return}
 var rb=e.target.closest('[data-act="rate"]');
 if(rb&&S==="user"){try{await api("/api/nilai",{kunci:rb.dataset.n,nilai:+rb.dataset.v});toast("Terima kasih atas penilaian Anda.");SIG="";tick()}catch(x){err(x.message)}return}
 var b=e.target.closest('[data-act="send"]');if(!b||S!=="user")return;var k=b.dataset.n,ta=b.closest(".qf").querySelector("textarea"),t=clean(ta.value);if(!t)return;
 var g=guard(t,k);if(g){err(g);return}b.disabled=true;SENT.push(Date.now());
 try{await api("/api/pesan",{kunci:k,isi:t});ta.value="";delete KEEP["q:"+k];SIG="";await tick()}catch(x){err(x.message);b.disabled=false}});
/* ---- Admin ---- */
function pick(x){SEL={pid:x.pid,kunci:x.kunci,nama:x.nama,hp:x.hp,email:x.email};SM=[];admList();admPane();tick()}
function admUI(){var d=$("v-adm");if(d.dataset.on==="1"){admList();return}d.dataset.on="1";
 d.innerHTML='<div class="hint" id="atabs"></div><div id="a-inbox"><div class="stat" id="st"></div><div class="hint"><a class="btn" href="/api/app?p=%2Fadmin%2Frekap.csv" download>Unduh rekap (CSV)</a><a class="btn" href="/api/app?p=%2Fadmin%2Fdata.xlsx" download>Unduh database (Excel)</a><a class="btn" href="/api/app?p=%2Fadmin%2Fanalisis.xlsx" download>Unduh laporan analisis chat (Excel)</a></div><details class="set"><summary>Pengaturan dan pengumuman</summary><div class="qf"><input class="si" id="cw" placeholder="Nomor WA resmi PTSP (08xxxxxxxxxx)" maxlength="16" aria-label="Nomor WA resmi"><input class="si" id="cj" placeholder="Jam layanan, mis. Senin-Jumat 08.00-15.00" maxlength="100" aria-label="Jam layanan"><textarea id="ci" rows="2" maxlength="300" placeholder="Pengumuman untuk pemohon (opsional)" aria-label="Pengumuman"></textarea><button type="button" class="send" id="cs">Simpan pengaturan</button><b style="margin-top:8px">Templat balasan cepat (satu per baris, maksimal 12)</b><textarea id="tq" rows="5" maxlength="4000" aria-label="Templat balasan"></textarea><button type="button" class="btn" id="tqs">Simpan templat</button><b style="margin-top:8px">Ganti kata sandi admin</b><input class="si" id="p1" type="password" placeholder="Kata sandi lama" autocomplete="current-password"><input class="si" id="p2" type="password" placeholder="Kata sandi baru (min. 8 karakter)" autocomplete="new-password"><button type="button" class="btn" id="cp">Ganti kata sandi</button></div></details><div class="adg"><div><div class="hint" id="af"></div><input class="si" id="as" placeholder="Cari nama, nomor HP, email, atau petugas" aria-label="Cari"><div class="gs"><input class="si" id="gs" placeholder="Cari isi percakapan (mis. NIB, kecewa)" aria-label="Cari di isi pesan" maxlength="60"><button type="button" class="btn" id="gsb">Cari isi</button></div><div class="fgrid"><select class="si" id="so" aria-label="Urutkan"><option value="prio">Urut: Prioritas</option><option value="new">Urut: Terbaru</option><option value="old">Urut: Menunggu terlama</option></select><select class="si" id="tps" aria-label="Topik"></select><select class="si" id="sns" aria-label="Nada pesan"><option value="">Semua nada</option><option value="-1">Keluhan</option><option value="0">Netral</option><option value="1">Puas</option></select></div><select class="si" id="ls" aria-label="Lokasi"><option value="all">Semua lokasi</option>'+LOCS.map(function(l){return '<option value="'+esc(l.id)+'">'+esc(l.nm)+'</option>'}).join("")+'</select><div class="bulk" id="bulk" hidden></div><div class="tl" id="al"></div></div><div class="pane" id="ap"></div></div></div><div id="a-x" hidden></div>';
 $("tq").value=QR.join("\n");$("cw").value=CFG.wa||"";$("cj").value=CFG.jam||"";$("ci").value=CFG.info||"";
 $("as").oninput=function(){AF.q=this.value.toLowerCase();admList()};$("ls").onchange=function(){AF.loc=this.value;admList()};$("so").onchange=function(){AF.so=this.value;admList()};$("tps").onchange=function(){AF.tp=this.value;admList()};$("sns").onchange=function(){AF.sn=this.value;admList()};
 $("af").onclick=function(e){var b=e.target.closest("[data-s]");if(b){AF.st=b.dataset.s;admList()}};admList();admPane();if(window.admTabs)admTabs()}
function waitTxt(ms){var m=Math.max(0,Math.round(ms/60000));return m<1?"baru saja":m<60?m+" mnt":m<1440?Math.floor(m/60)+" jam":Math.floor(m/1440)+" hari"}
function prLvl(s){return s>=75?["Tinggi","#dc2626"]:s>=50?["Sedang","#d97706"]:s>=30?["Rendah","#2563eb"]:["Biasa","#64748b"]}
function sentTxt(n){return n<0?"Keluhan":n>0?"Puas":"Netral"}
function pb(t,c,tt){return '<i class="pb" style="background:'+(c||"#64748b")+'"'+(tt?' title="'+esc(tt)+'"':'')+'>'+esc(t)+'</i>'}
function fillT(t){var nm=SEL?String(SEL.nama||"").split(" ")[0]:"";return String(t).replace(/\{nama\}/g,nm).replace(/\{loket\}/g,SEL?label(SEL.kunci):"")}
function admOk(x,hari){
 if(AF.st==="pend"&&!x.pend)return false;
 if(AF.st==="hi"&&!(x.pend&&x.skor>=60))return false;
 if(AF.st==="fu"&&!(x.tag&&x.tag.tl&&x.tag.tl<=hari))return false;
 if(AF.loc!=="all"&&x.kunci.indexOf(AF.loc+"_")!==0)return false;
 if(AF.tp&&(x.meta.topik||[]).indexOf(AF.tp)<0)return false;
 if(AF.sn!==""&&String(x.meta.senti)!==AF.sn)return false;
 if(AF.q&&(x.nama+" "+x.hp+" "+x.email+" "+((x.tag&&x.tag.pic)||"")).toLowerCase().indexOf(AF.q)<0)return false;
 return true}
function admList(){var el=$("al");if(!el||S!=="adm")return;title();var all=T,now=Date.now(),hari=iso(wibDate(0));
 var pn=all.filter(function(x){return x.pend}).length,rs=all.filter(function(x){return x.nilai}),avg=rs.length?(rs.reduce(function(a,x){return a+x.nilai},0)/rs.length).toFixed(1):"";
 var hi=all.filter(function(x){return x.pend&&x.skor>=75}).length,old=all.filter(function(x){return x.pend&&now-x.lu>864e5}).length,due=all.filter(function(x){return x.tag&&x.tag.tl&&x.tag.tl<=hari}).length;
 $("st").textContent=pn+" perlu dijawab dari "+all.length+" percakapan"+(hi?" | "+hi+" prioritas tinggi":"")+(old?" | "+old+" menunggu >24 jam":"")+(due?" | "+due+" tindak lanjut jatuh tempo":"")+(rs.length?" | Kepuasan "+avg+"/5 ("+rs.length+")":"");
 [].forEach.call($("ls").options,function(o,i){if(i===0)return;var l=LOCS[i-1],c=all.filter(function(x){return x.pend&&x.kunci.indexOf(l.id+"_")===0}).length;o.textContent=l.nm+(c?" ("+c+")":"")});
 $("af").innerHTML=[["pend","Perlu dijawab"],["hi","Prioritas tinggi"],["fu","Tindak lanjut"],["all","Semua"]].map(function(s){return '<button type="button" class="chip" data-s="'+s[0]+'" aria-pressed="'+(AF.st===s[0])+'">'+s[1]+'</button>'}).join("");
 var tc={};all.forEach(function(x){(x.meta.topik||[]).forEach(function(t){tc[t]=(tc[t]||0)+1})});var tsig=Object.keys(tc).sort().join("|");
 if(tsig!==TPSIG){TPSIG=tsig;$("tps").innerHTML='<option value="">Semua topik</option>'+Object.keys(tc).sort().map(function(t){return '<option value="'+esc(t)+'">'+esc(t)+'</option>'}).join("");$("tps").value=AF.tp}
 var it=all.filter(function(x){return admOk(x,hari)});
 it.sort(function(a,b){if(AF.so==="new")return b.waktu-a.waktu;if(AF.so==="old")return (b.pend-a.pend)||(a.pend?a.lu-b.lu:b.waktu-a.waktu);return (b.pend-a.pend)||(b.skor-a.skor)||(b.waktu-a.waktu)});
 var nb=Object.keys(BULK).length,bk=$("bulk");bk.hidden=!it.length;
 bk.innerHTML='<label class="sys"><input type="checkbox" id="bkall" aria-label="Pilih semua yang tampil"> Pilih semua ('+it.length+')</label>'+(nb?'<button type="button" class="btn" id="bkdone">Tandai '+nb+' selesai</button><button type="button" class="btn" id="bkclr">Batal pilih</button>':'');
 el.innerHTML="";if(!it.length){el.innerHTML='<div class="empty">Tidak ada percakapan untuk filter ini.</div>';return}
 it.forEach(function(x){var key=x.pid+"|"+x.kunci,w=document.createElement("div");w.className="tiw";
  var cb=document.createElement("input");cb.type="checkbox";cb.dataset.bk=key;cb.checked=!!BULK[key];cb.setAttribute("aria-label","Pilih percakapan "+x.nama);
  var b=document.createElement("button");b.type="button";b.className="ti";b.setAttribute("aria-current",!!(SEL&&SEL.pid===x.pid&&SEL.kunci===x.kunci));
  var h=document.createElement("b");h.textContent=x.nama+" - "+label(x.kunci);var s=document.createElement("span");s.textContent=x.teks;b.appendChild(h);b.appendChild(s);
  var bd='';if(x.pend){var pl=prLvl(x.skor);bd+=pb("Prioritas "+pl[0]+" "+x.skor,pl[1],"Skor prioritas dihitung dari urgensi, nada pesan, dan lama menunggu");bd+=pb("Menunggu "+waitTxt(now-x.lu),now-x.lu>864e5?"#dc2626":now-x.lu>144e5?"#d97706":"#64748b")}else bd+=pb(x.selesai?"Selesai":"Sudah dijawab","#15803d");
  if(x.meta.senti<0)bd+=pb("Keluhan","#b91c1c");else if(x.meta.senti>0)bd+=pb("Puas","#15803d");
  (x.meta.topik||[]).slice(0,1).forEach(function(t){bd+=pb(t,"#1a46b5")});
  ((x.tag&&x.tag.tags)||[]).forEach(function(t){bd+=pb(t,"#7c3aed")});
  if(x.tag&&x.tag.pic)bd+=pb("PIC "+x.tag.pic,"#0d9488");
  if(x.tag&&x.tag.tl)bd+=pb((x.tag.tl<=hari?"Tindak lanjut hari ini":"Tindak lanjut "+x.tag.tl),x.tag.tl<=hari?"#dc2626":"#64748b");
  var d=document.createElement("div");d.className="tbd";d.innerHTML=bd;b.appendChild(d);
  b.onclick=function(){pick(x)};w.appendChild(cb);w.appendChild(b);el.appendChild(w)})}
function pick(x){var cu=T.filter(function(t){return t.pid===x.pid&&t.kunci===x.kunci})[0]||x;SEL={pid:x.pid,kunci:x.kunci,nama:x.nama,hp:x.hp,email:x.email,skor:cu.skor||0,meta:cu.meta||{topik:[],senti:0,urg:0}};SM=[];admList();admPane();tick()}
function admPane(){var p=$("ap");if(!p||S!=="adm")return;
 if(!SEL){p.innerHTML='<div class="empty">Pilih percakapan di sebelah kiri. Tips: tekan <b>J</b>/<b>K</b> untuk pindah percakapan, <b>Ctrl+Enter</b> untuk mengirim.</div>';return}
 var keep=$("rt")?$("rt").value:"",lb=label(SEL.kunci),msg="Halo "+SEL.nama+", admin PTSP sudah membalas pertanyaan Anda ("+lb+"). Silakan buka Takok Pelayanan Suroboyo untuk membacanya: "+APP;
 var wa=waLink(SEL.hp,msg),mail=SEL.email?"mailto:"+SEL.email+"?subject="+encodeURIComponent("Balasan admin - "+lb)+"&body="+encodeURIComponent(msg):"";
 var an=SEL.an,tg=SEL.tag||{tags:[],pic:"",tl:""},pl=prLvl(SEL.skor||0),mt=SEL.meta||{topik:[]};
 var dl=p.querySelector("details.lab"),da=p.querySelector("details.ana"),labOpen=dl?dl.open:!!(tg.tags.length||tg.pic||tg.tl),anaOpen=da?da.open:true;
 var head='<h3>'+esc(SEL.nama)+'</h3><p class="sys" style="margin:0 0 6px">'+esc(lb)+'<br>HP: '+esc(SEL.hp||"-")+' | Email: '+esc(SEL.email||"-")+'</p>';
 var ana='';
 if(an){ana='<details class="set ana"'+(anaOpen?' open':'')+'><summary>Analisis otomatis'+(an.topik.length?' &middot; '+esc(an.topik[0]):'')+'</summary><div class="hint" style="margin:6px 0">'+pb("Nada: "+sentTxt(an.senti),an.senti<0?"#b91c1c":an.senti>0?"#15803d":"#64748b")+pb("Urgensi: "+["Biasa","Cukup mendesak","Mendesak"][an.urg],an.urg>1?"#dc2626":an.urg?"#d97706":"#64748b")+(an.tunggu_menit!=null?pb("Menunggu "+waitTxt(an.tunggu_menit*60000),an.tunggu_menit>1440?"#dc2626":"#d97706"):pb("Sudah dibalas","#15803d"))+(SEL.skor?pb("Prioritas "+pl[0]+" "+SEL.skor,pl[1]):"")+an.topik.map(function(t){return pb(t,"#1a46b5")}).join("")+'</div><ul class="bul">'+an.baris.map(function(l){return '<li>'+esc(l)+'</li>'}).join("")+'</ul></details>'}
 var lab='<details class="set lab"'+(labOpen?' open':'')+'><summary>Label, petugas, dan tindak lanjut</summary><div class="hint" style="margin:6px 0">'+TAGS.map(function(t){return '<button type="button" class="chip" data-tg="'+esc(t)+'" aria-pressed="'+(tg.tags.indexOf(t)>-1)+'">'+esc(t)+'</button>'}).join("")+'</div><div class="fgrid"><input class="si" id="lpic" maxlength="40" placeholder="Petugas yang menangani" aria-label="Petugas" value="'+esc(tg.pic||"")+'"><input class="si" id="ltl" type="date" aria-label="Tanggal tindak lanjut" value="'+esc(tg.tl||"")+'"><button type="button" class="btn" id="lbs">Simpan label</button></div></details>';
 var sg='';
 if(SEL.saran&&SEL.saran.length)sg='<div class="sgb"><b>Saran balasan</b> <small class="sys">(dari aturan chatbot dan templat topik; periksa sebelum mengirim)</small>'+SEL.saran.map(function(x,i){return '<div class="sg"><small class="sys">'+esc(x.sumber)+'</small><p>'+esc(x.teks)+'</p><button type="button" class="btn" data-sg="'+i+'">Pakai</button></div>'}).join("")+'</div>';
 p.innerHTML=head+ana+lab+'<div class="thread" id="th2">'+bubbles(SM,"admin")+'</div>'
 +'<div class="hint"><span class="sys">Beritahu pemohon:</span>'+(wa?'<a class="chip" href="'+esc(wa)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a>':'')+(mail?'<a class="chip" href="'+esc(mail)+'" target="_blank" rel="noopener noreferrer">Email</a>':'')+'<button type="button" class="chip" id="dl">Unduh percakapan</button><button type="button" class="chip" id="cps">Salin ringkasan</button></div>'+sg
 +'<div class="hint">'+QR.map(function(q,i){return '<button type="button" class="chip" data-q="'+i+'" title="'+esc(q)+'">'+esc(q.length>30?q.slice(0,30)+"…":q)+'</button>'}).join("")+'</div><div class="qf"><textarea id="rt" rows="3" maxlength="800" placeholder="Tulis jawaban untuk pemohon (Ctrl+Enter untuk kirim). Variabel: {nama}, {loket}" aria-label="Jawaban"></textarea><div class="btns"><button type="button" class="send" id="rs">Kirim jawaban</button><button type="button" class="btn" id="rsx">Kirim &amp; selesai</button><button type="button" class="btn" id="rc">Tandai selesai</button><button type="button" class="btn" id="rd">Hapus percakapan</button></div></div><div class="qf"><b>Catatan internal</b> <small class="sys">(tidak terlihat pemohon)</small><textarea id="cat" rows="2" maxlength="500" placeholder="Catatan untuk petugas lain" aria-label="Catatan internal">'+esc(SEL.cat||"")+'</textarea><button type="button" class="btn" id="cats">Simpan catatan</button></div>';
 $("rt").value=keep;var th=$("th2");th.scrollTop=th.scrollHeight}
$("v-adm").addEventListener("click",async function(e){if(S!=="adm")return;var id=e.target.id,qb=e.target.closest("[data-q]");err("");
 try{
 if(id==="cs"){await api("/api/admin/pengaturan",{wa:$("cw").value,jam:$("cj").value,info:$("ci").value});CFG={wa:ph($("cw").value)||"",jam:clean($("cj").value),info:clean($("ci").value)};an();toast("Pengaturan tersimpan.");return}
 if(id==="cp"){await api("/api/admin/password",{lama:$("p1").value,baru:$("p2").value});reset("Kata sandi diganti. Silakan masuk kembali.");return}
 if(id==="tqs"){var r=await api("/api/admin/templat",{daftar:$("tq").value.split("\n")});QR=r.daftar;toast("Templat tersimpan ("+QR.length+").");admPane();return}
 if(!SEL)return;
 if(qb){var ta=$("rt");ta.value=(ta.value?ta.value+"\n":"")+fillT(QR[+qb.dataset.q]);ta.focus();return}
 if(id==="cats"){await api("/api/admin/catatan",{pid:SEL.pid,kunci:SEL.kunci,teks:$("cat").value});SEL.cat=$("cat").value;toast("Catatan tersimpan.");return}
 if(id==="rs"){var t=clean($("rt").value);if(!t)return;e.target.disabled=true;await api("/api/admin/balas",{pid:SEL.pid,kunci:SEL.kunci,isi:t});$("rt").value="";toast("Jawaban terkirim. Beritahu pemohon lewat WhatsApp atau email bila perlu.");ASIG="";SM.sig="";await tick();var b=$("rs");if(b)b.disabled=false}
 if(id==="rc"){await api("/api/admin/selesai",{pid:SEL.pid,kunci:SEL.kunci});toast("Ditandai selesai.");ASIG="";tick()}
 if(id==="rd"){if(e.target.dataset.sure!=="1"){e.target.dataset.sure="1";e.target.textContent="Yakin hapus? Klik lagi";return}await api("/api/admin/hapus",{pid:SEL.pid,kunci:SEL.kunci});SEL=null;ASIG="";await tick();admPane()}
 }catch(x){err(x.message);var b2=$("rs");if(b2)b2.disabled=false}});
/* ---- Menu utama ---- */
function findK(rx,loc){var l=LD[loc]||[];for(var i=0;i<l.length;i++)if(rx.test(l[i][1]))return loc+"_"+l[i][0];return null}
function needLogin(){if(S!=="user"){toast("Masuk sebagai pemohon untuk berdiskusi dengan admin.");var l=$("lg");if(!l.hidden)l.scrollIntoView({block:"center"});return true}return false}
$("t1").onclick=function(){$("res").scrollIntoView({behavior:"smooth",block:"start"})};
$("t2").onclick=function(){$("q").scrollIntoView({block:"center"});$("q").focus()};
$("t3").onclick=function(){$("lc").scrollIntoView({block:"center"});toast("Pilih salah satu lokasi SPP.")};
$("t4").onclick=function(){if(S==="user"){MYV=true;ui()}else needLogin()};
$("t5").onclick=function(){var k=findK(/^loket (informasi|cs)$/i,LOC)||findK(/^loket (informasi|cs)$/i,"pusat");if(k)openKey(k);needLogin()};
$("t6").onclick=function(){var k=findK(/pengaduan/i,LOC)||findK(/pengaduan/i,"pusat");if(k){if(k.indexOf(LOC+"_")!==0)toast("Loket Pengaduan tidak ada di SPP ini. Dialihkan ke SPP lain.");openKey(k)}needLogin()};
$("list").addEventListener("keydown",function(e){if(e.key==="Enter"&&!e.shiftKey&&e.target.matches&&e.target.matches('textarea[data-k^="q:"]')){e.preventDefault();var b=e.target.closest(".qf").querySelector("[data-act=send]");if(b&&!b.disabled)b.click()}});
$("list").addEventListener("input",function(e){if(e.target.matches&&e.target.matches('textarea[data-k^="q:"]')){var c=e.target.closest(".qf").querySelector(".ctr");if(c)c.textContent=e.target.value.length+"/800 \u00b7 Enter untuk kirim"}});
$("v-adm").addEventListener("input",function(e){if(e.target.id==="cat"&&SEL)SEL.cat=e.target.value});
/* ---- Zona MPP ---- */
var ZN="Semua",PZ=null;
var ZC={"Zona 1":"#0e9aa7","Zona 2":"#c026d3","Zona 3":"#84cc16","Zona 4":"#ef4444","Zona 5":"#22c55e"};
function zOk(d){return LOC!=="mpp"||ZN==="Semua"||d[4]===ZN}
function zst(d){return LOC==="mpp"&&ZC[d[4]]?' style="border-left:6px solid '+ZC[d[4]]+'"':""}
function zlist(){var o=[];(LD.mpp||[]).forEach(function(d){if(d[4]&&o.indexOf(d[4])<0)o.push(d[4])});return o}
function zhead(z){PZ=z;var n=(LD.mpp||[]).filter(function(d){return d[4]===z}).length;return '<h3 class="zh" style="--zc:'+(ZC[z]||"#1a46b5")+'"><span class="zd"></span>'+esc(z)+' <small>'+n+' instansi</small></h3>'}
function znui(){var on=LOC==="mpp"&&zlist().length>0;$("zn").hidden=!on;if(!on)return;
 $("zn").innerHTML=["Semua"].concat(zlist()).map(function(z){return '<button type="button" class="chip" data-z="'+esc(z)+'" aria-pressed="'+(z===ZN)+'"'+(ZC[z]?' style="border-left:5px solid '+ZC[z]+'"':'')+'>'+(z==="Semua"?"Semua zona":esc(z))+'</button>'}).join("")}
$("zn").onclick=function(e){var b=e.target.closest("[data-z]");if(!b)return;ZN=b.dataset.z;znui();render()};
$("list").addEventListener("click",function(e){var b=e.target.closest("[data-go]");if(b){LOC=b.dataset.go;ZN="Semua";lc();render()}});
EX.push("BPJS Kesehatan","Pajak");
/* ---- Mulai ---- */
(async function(){try{var j=await api("/api/info");LOCS=j.lokasi.map(function(l){return{id:l.id,nm:l.nama}});LD={};j.loket.forEach(function(r){(LD[r[0]]=LD[r[0]]||[]).push([r[1],r[2],r[3],r[4],r[5]||"",r[6]!==0,r[7]!==0])});for(var k in LD)LD[k].sort(function(a,b){return a[0]-b[0]});
 CFG=j.cfg||{};window.BERITA=j.berita||[];window.KATA=j.kata||[];window.MPPR=j.mpp_roster||[];BALAS=j.balas_menit||null;if(!LD[LOC]&&LOCS.length)LOC=LOCS[0].id;an();lc();
 if(j.saya){await startSession(j)}else ui()}catch(x){err("Server belum bisa dihubungi: "+x.message)}})();
