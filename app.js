(function(){
  var KEY='generator-invoice-v1';
  var $=function(s){return document.querySelector(s)};
  var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
  var uid=function(){return Math.random().toString(36).slice(2,9)};
  var clone=function(o){return JSON.parse(JSON.stringify(o))};
  var iso=function(d){return new Date(d.getTime()-d.getTimezoneOffset()*6e4).toISOString().slice(0,10)};
  var rp=function(n){return 'Rp '+Math.round(n).toLocaleString('id-ID')};
  var qtyFmt=function(n){return (+n||0).toLocaleString('id-ID',{maximumFractionDigits:2})};
  var dFmt=function(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return '-';return new Date(v+'T00:00:00Z').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'})};

  /* Terbilang: angka rupiah dalam kata */
  var SAT=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  function tb(n){
    if(n<12)return SAT[n];
    if(n<20)return tb(n-10)+' belas';
    if(n<100)return tb(Math.floor(n/10))+' puluh'+(n%10?' '+tb(n%10):'');
    if(n<200)return 'seratus'+(n>100?' '+tb(n-100):'');
    if(n<1000)return tb(Math.floor(n/100))+' ratus'+(n%100?' '+tb(n%100):'');
    if(n<2000)return 'seribu'+(n>1000?' '+tb(n-1000):'');
    if(n<1e6)return tb(Math.floor(n/1e3))+' ribu'+(n%1e3?' '+tb(n%1e3):'');
    if(n<1e9)return tb(Math.floor(n/1e6))+' juta'+(n%1e6?' '+tb(n%1e6):'');
    if(n<1e12)return tb(Math.floor(n/1e9))+' miliar'+(n%1e9?' '+tb(n%1e9):'');
    return tb(Math.floor(n/1e12))+' triliun'+(n%1e12?' '+tb(n%1e12):'');
  }
  function terbilang(n){n=Math.max(0,Math.round(n));var w=n===0?'nol':tb(n);return w.charAt(0).toUpperCase()+w.slice(1)+' rupiah'}

  /* Storage */
  var store={profile:null,invoices:[]};
  var storageOk=true;
  try{var raw=localStorage.getItem(KEY);if(raw){var o=JSON.parse(raw);if(o&&typeof o==='object'){store.profile=o.profile||null;store.invoices=Array.isArray(o.invoices)?o.invoices:[]}}}catch(e){storageOk=false}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(store));return true}catch(e){storageOk=false;return false}}

  /* State */
  var prof=store.profile?clone(store.profile):{name:'',address:'',phone:'',logo:null};
  var inv,editingId=null,numberAuto=true,confirmDel=null;

  function nextNumber(dateISO,exceptId){
    var ym=(dateISO||iso(new Date())).slice(0,7).replace('-','');
    var prefix='INV-'+ym+'-',max=0;
    store.invoices.forEach(function(r){
      if(r.id===exceptId||!r.number||r.number.indexOf(prefix)!==0)return;
      var n=parseInt(r.number.slice(prefix.length),10);if(n>max)max=n;
    });
    return prefix+String(max+1).padStart(3,'0');
  }
  function blankItem(){return {id:uid(),name:'',qty:1,price:0}}
  function freshInvoice(carryTax){
    var d=new Date(),date=iso(d),due=iso(new Date(d.getTime()+14*864e5));
    return {
      id:uid(),number:nextNumber(date,null),date:date,due:due,
      customer:{name:'',contact:'',address:''},
      items:[blankItem()],
      discount:0,tax:carryTax||0,
      notes:'',
      template:'klasik'
    };
  }
  inv=freshInvoice(0);

  function calc(i){
    var sub=0;i.items.forEach(function(x){sub+=Math.round((+x.qty||0)*(+x.price||0))});
    var disc=Math.round(sub*(+i.discount||0)/100),dpp=sub-disc,tax=Math.round(dpp*(+i.tax||0)/100);
    return {sub:sub,disc:disc,dpp:dpp,tax:tax,total:dpp+tax};
  }

  /* Say */
  var sayT;
  function say(msg,err){var el=$('#status');el.textContent=msg;el.className=err?'err':'';el.hidden=false;clearTimeout(sayT);sayT=setTimeout(function(){el.hidden=true},4500)}

  /* Form <-> state */
  function getK(k){var p=k.split('.');if(p[0]==='p')return prof[p[1]];if(p[0]==='c')return inv.customer[p[1]];return inv[p[1]]}
  function setK(k,v){var p=k.split('.');if(p[0]==='p')prof[p[1]]=v;else if(p[0]==='c')inv.customer[p[1]]=v;else inv[p[1]]=v}
  function fillForm(){
    document.querySelectorAll('[data-k]').forEach(function(el){var v=getK(el.dataset.k);el.value=v==null?'':v});
    document.querySelectorAll('input[name=tpl]').forEach(function(r){r.checked=r.value===inv.template});
    renderItems();renderLogo();renderAll();
  }
  var saveProfT;
  $('#form').addEventListener('input',function(e){
    var el=e.target,k=el.dataset&&el.dataset.k;if(!k)return;
    var v=el.value;
    if(k==='i.discount'||k==='i.tax'){v=Math.min(100,Math.max(0,parseFloat(v)||0))}
    setK(k,v);
    if(k==='i.number')numberAuto=false;
    if(k==='i.date'&&numberAuto){inv.number=nextNumber(v,editingId);$('#i-number').value=inv.number}
    if(k.charAt(0)==='p'){$('#sample-note').hidden=true;clearTimeout(saveProfT);saveProfT=setTimeout(function(){store.profile=clone(prof);persist()},500)}
    renderAll();
  });
  $('#form').addEventListener('change',function(e){
    if(e.target.name==='tpl'){inv.template=e.target.value;renderAll()}
  });

  /* Items */
  function renderItems(){
    $('#items').innerHTML=inv.items.map(function(x){
      return '<div class="irow" data-id="'+x.id+'">'+
        '<label class="f c-name"><span>Nama barang atau jasa</span><input type="text" data-f="name" value="'+esc(x.name)+'"></label>'+
        '<label class="f"><span>Jumlah</span><input type="number" data-f="qty" min="0" step="any" inputmode="decimal" value="'+esc(x.qty)+'"></label>'+
        '<label class="f"><span>Harga satuan (Rp)</span><input type="number" data-f="price" min="0" step="any" inputmode="decimal" value="'+esc(x.price)+'"></label>'+
        '<button class="icon-btn" type="button" data-del aria-label="Hapus baris"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg></button>'+
        '<div class="f c-name" style="flex-direction:row;justify-content:space-between;align-items:baseline"><span>Jumlah harga</span><output class="mono" data-sum style="font-weight:500">'+rp((+x.qty||0)*(+x.price||0))+'</output></div>'+
      '</div>';
    }).join('');
  }
  $('#items').addEventListener('input',function(e){
    var row=e.target.closest('.irow');if(!row)return;
    var it=inv.items.find(function(x){return x.id===row.dataset.id});if(!it)return;
    var f=e.target.dataset.f;
    it[f]=f==='name'?e.target.value:Math.max(0,parseFloat(e.target.value)||0);
    row.querySelector('[data-sum]').textContent=rp((+it.qty||0)*(+it.price||0));
    renderAll();
  });
  $('#items').addEventListener('click',function(e){
    var b=e.target.closest('[data-del]');if(!b)return;
    var id=b.closest('.irow').dataset.id;
    inv.items=inv.items.filter(function(x){return x.id!==id});
    if(!inv.items.length)inv.items.push(blankItem());
    renderItems();renderAll();
  });
  $('#add-item').addEventListener('click',function(){
    inv.items.push(blankItem());renderItems();renderAll();
    var rows=document.querySelectorAll('#items .irow');rows[rows.length-1].querySelector('input').focus();
  });

  /* Logo */
  function renderLogo(){
    var box=$('#logo-box');
    if(prof.logo&&prof.logo.url){box.innerHTML='<img alt="Logo usaha" src="'+prof.logo.url+'">';$('#logo-del').hidden=false}
    else{box.textContent='Logo';$('#logo-del').hidden=true}
  }
  $('#logo-pick').addEventListener('click',function(){$('#logo-file').click()});
  $('#logo-del').addEventListener('click',function(){prof.logo=null;store.profile=clone(prof);persist();renderLogo();renderAll()});
  $('#logo-file').addEventListener('change',function(e){
    var f=e.target.files&&e.target.files[0];if(!f)return;
    var rd=new FileReader();
    rd.onload=function(){
      var im=new Image();
      im.onload=function(){
        var s=Math.min(1,320/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*s)),h=Math.max(1,Math.round(im.height*s));
        var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);
        prof.logo={url:c.toDataURL('image/png'),w:w,h:h};
        $('#sample-note').hidden=true;store.profile=clone(prof);persist();renderLogo();renderAll();
      };
      im.onerror=function(){say('File logo tidak bisa dibaca. Coba gambar PNG atau JPG.',true)};
      im.src=rd.result;
    };
    rd.readAsDataURL(f);e.target.value='';
  });

  /* Preview */
  function paperHTML(i,b){
    var c=calc(i),cu=i.customer;
    var rows=i.items.filter(function(x){return x.name.trim()||+x.price>0}).map(function(x,n){
      return '<tr><td>'+(n+1)+'</td><td>'+esc(x.name)+'</td><td class="n">'+qtyFmt(x.qty)+'</td><td class="n">'+rp(x.price)+'</td><td class="n">'+rp((+x.qty||0)*(+x.price||0))+'</td></tr>';
    }).join('')||'<tr><td colspan="5" style="color:#66717c">Belum ada barang atau jasa.</td></tr>';
    return '<div class="p-head"><div class="p-brand">'+(b.logo&&b.logo.url?'<img alt="" src="'+b.logo.url+'">':'')+
      '<div><strong>'+esc(b.name||'Nama usaha')+'</strong><div class="p-sub">'+esc([b.address,b.phone].filter(Boolean).join('\n'))+'</div></div></div>'+
      '<div class="p-title"><b>INVOICE</b><span>'+esc(i.number)+'</span></div></div>'+
      '<div class="p-meta"><div><h4>DITAGIHKAN KEPADA</h4><div class="nm">'+esc(cu.name||'Nama pelanggan')+'</div><div class="pre">'+esc(cu.address)+'</div><div>'+esc(cu.contact)+'</div></div>'+
      '<dl><dt>Tanggal terbit</dt><dd>'+esc(dFmt(i.date))+'</dd><dt>Jatuh tempo</dt><dd>'+esc(dFmt(i.due))+'</dd></dl></div>'+
      '<div class="tw"><table class="p-table"><thead><tr><th style="width:28px">No</th><th>Deskripsi</th><th class="n">Jml</th><th class="n">Harga</th><th class="n">Jumlah</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="p-tot"><div><span>Subtotal</span><span class="g">'+rp(c.sub)+'</span></div>'+
      (c.disc?'<div><span>Diskon ('+qtyFmt(i.discount)+'%)</span><span class="g">- '+rp(c.disc)+'</span></div>':'')+
      (c.tax?'<div><span>Pajak ('+qtyFmt(i.tax)+'%)</span><span class="g">'+rp(c.tax)+'</span></div>':'')+
      '<div class="big"><span>TOTAL</span><span class="g">'+rp(c.total)+'</span></div></div>'+
      '<p class="p-words">Terbilang: '+esc(terbilang(c.total))+'</p>'+
      (i.notes.trim()?'<div class="p-notes"><b>Catatan</b>'+esc(i.notes)+'</div>':'');
  }
  function renderAll(){
    var p=$('#paper');p.className='paper t-'+inv.template;p.innerHTML=paperHTML(inv,prof);
    var c=calc(inv);
    $('#calc').innerHTML='<dt>Subtotal</dt><dd class="mono">'+rp(c.sub)+'</dd>'+
      '<dt>Diskon</dt><dd class="mono">- '+rp(c.disc)+'</dd>'+
      '<dt>Pajak</dt><dd class="mono">'+rp(c.tax)+'</dd>'+
      '<dt class="tot">Total</dt><dd class="tot mono">'+rp(c.total)+'</dd>';
    $('#state').textContent=editingId?'Mengedit '+inv.number:'Invoice baru';
    $('#btn-save').textContent=editingId?'Simpan perubahan':'Simpan';
  }

  /* PDF */
  var TPL={klasik:{ac:[31,58,95],soft:[232,237,244],mode:'band'},modern:{ac:[14,116,106],soft:[224,242,239],mode:'bar'},minimal:{ac:[27,31,36],soft:[240,240,240],mode:'plain'}};
  function buildPdf(i,b){
    var jsPDF=window.jspdf.jsPDF,doc=new jsPDF({unit:'mm',format:'a4'});
    var T=TPL[i.template]||TPL.klasik,W=210,M=16,R=W-M,ink=[27,31,36],mu=[100,108,116],white=[255,255,255];
    var col=function(c){doc.setTextColor(c[0],c[1],c[2])},fil=function(c){doc.setFillColor(c[0],c[1],c[2])},drw=function(c){doc.setDrawColor(c[0],c[1],c[2])};
    var tx=function(s,x,y,o){doc.text(String(s),x,y,o)};
    var font=function(w,s){doc.setFont('helvetica',w);doc.setFontSize(s)};
    var wrap=function(s,w){var out=[];String(s||'').split('\n').forEach(function(l){if(l.trim())out=out.concat(doc.splitTextToSize(l,w))});return out};
    var c=calc(i),cu=i.customer,bar=T.mode==='bar';
    var hasLogo=b.logo&&b.logo.url,lh=14,lw=hasLogo?Math.min(30,lh*b.logo.w/b.logo.h):0;
    if(bar){fil(T.ac);doc.rect(0,0,W,38,'F')}
    var hy=bar?11:M,x0=M;
    if(hasLogo){
      if(bar){fil(white);doc.rect(M,hy-2,lw+4,lh+4,'F');try{doc.addImage(b.logo.url,'PNG',M+2,hy,lw,lh)}catch(e){}x0=M+lw+10}
      else{try{doc.addImage(b.logo.url,'PNG',M,hy,lw,lh)}catch(e){}x0=M+lw+6}
    }
    font('bold',15);col(bar?white:ink);tx(b.name||'Nama usaha',x0,hy+5);
    font('normal',9);col(bar?[225,240,238]:mu);
    var al=wrap([b.address,b.phone].filter(Boolean).join('\n'),95).slice(0,4);
    al.forEach(function(l,n){tx(l,x0,hy+10+n*4.2)});
    font('bold',22);col(bar?white:(T.mode==='plain'?ink:T.ac));tx('INVOICE',R,hy+6,{align:'right'});
    font('normal',10);col(bar?white:ink);tx(i.number,R,hy+13,{align:'right'});
    var hb=bar?38:Math.max(hy+(hasLogo?lh:0),hy+10+al.length*4.2);
    var y;
    if(bar){y=hb+12}else{drw(T.ac);doc.setLineWidth(T.mode==='plain'?0.3:0.7);doc.line(M,hb+4,R,hb+4);y=hb+14}
    font('bold',8);col(mu);tx('DITAGIHKAN KEPADA',M,y);
    font('bold',11);col(ink);tx(cu.name||'Nama pelanggan',M,y+5.5);
    font('normal',9.5);col(mu);
    var cl=wrap(cu.address,90).concat(cu.contact?[cu.contact]:[]).slice(0,5);
    cl.forEach(function(l,n){tx(l,M,y+10.5+n*4.4)});
    var lx=R-62;
    [['Tanggal terbit',dFmt(i.date)],['Jatuh tempo',dFmt(i.due)]].forEach(function(r,n){
      font('normal',9);col(mu);tx(r[0],lx,y+n*6);font('bold',9);col(ink);tx(r[1],R,y+n*6,{align:'right'});
    });
    y+=Math.max(14+cl.length*4.4,20)+6;
    var cx=[M,M+10,M+92,M+108,M+140,R];
    function head(){
      if(T.mode==='band'){fil(T.ac);doc.rect(M,y,R-M,8,'F')}
      else if(T.mode==='bar'){fil(T.soft);doc.rect(M,y,R-M,8,'F')}
      else{drw(ink);doc.setLineWidth(0.3);doc.line(M,y,R,y);doc.line(M,y+8,R,y+8)}
      font('bold',8);col(T.mode==='band'?white:(T.mode==='bar'?T.ac:ink));
      tx('NO',cx[0]+2,y+5.3);tx('DESKRIPSI',cx[1]+2,y+5.3);tx('JML',cx[3]-2,y+5.3,{align:'right'});tx('HARGA',cx[4]-2,y+5.3,{align:'right'});tx('JUMLAH',cx[5]-2,y+5.3,{align:'right'});
      y+=8;
    }
    head();
    var list=i.items.filter(function(x){return x.name.trim()||+x.price>0});
    list.forEach(function(x,n){
      font('normal',9.5);
      var ls=doc.splitTextToSize(x.name||'-',cx[2]-cx[1]-4),h=Math.max(8,ls.length*4.4+4);
      if(y+h>278){doc.addPage();y=M;head()}
      col(ink);font('normal',9.5);
      tx(n+1,cx[0]+2,y+5.4);
      ls.forEach(function(l,k){tx(l,cx[1]+2,y+5.4+k*4.4)});
      tx(qtyFmt(x.qty),cx[3]-2,y+5.4,{align:'right'});tx(rp(x.price),cx[4]-2,y+5.4,{align:'right'});tx(rp((+x.qty||0)*(+x.price||0)),cx[5]-2,y+5.4,{align:'right'});
      drw([222,227,231]);doc.setLineWidth(0.2);doc.line(M,y+h,R,y+h);
      y+=h;
    });
    if(y>222){doc.addPage();y=M}
    y+=8;
    var ty=y,bx=R-82;
    var lines=[['Subtotal',rp(c.sub)]];
    if(c.disc)lines.push(['Diskon ('+qtyFmt(i.discount)+'%)','- '+rp(c.disc)]);
    if(c.tax)lines.push(['Pajak ('+qtyFmt(i.tax)+'%)',rp(c.tax)]);
    lines.forEach(function(r){font('normal',9.5);col(mu);tx(r[0],bx,y);col(ink);tx(r[1],R,y,{align:'right'});y+=6});
    y+=1;
    if(T.mode==='plain'){drw(ink);doc.setLineWidth(0.3);doc.line(bx,y-3,R,y-3);doc.line(bx,y+8,R,y+8)}
    else{fil(T.ac);doc.rect(bx,y-3,R-bx,11,'F')}
    font('bold',10);col(T.mode==='plain'?ink:white);tx('TOTAL',bx+3,y+4);
    font('bold',12);tx(rp(c.total),R-3,y+4.2,{align:'right'});
    y+=14;
    font('italic',9);col(mu);
    var tw=doc.splitTextToSize('Terbilang: '+terbilang(c.total),88);
    tw.forEach(function(l,k){tx(l,M,ty+k*4.4)});
    y=Math.max(y,ty+tw.length*4.4)+6;
    if(i.notes.trim()){
      var nl=wrap(i.notes,R-M);
      if(y+8+nl.length*4.4>285){doc.addPage();y=M}
      drw([222,227,231]);doc.setLineWidth(0.2);doc.line(M,y,R,y);
      font('bold',9);col(ink);tx('Catatan',M,y+6);
      font('normal',9);col(mu);nl.forEach(function(l,k){tx(l,M,y+11+k*4.4)});
    }
    return doc;
  }
  var dl=null;
  if(window.claude&&window.claude.use){window.claude.use('downloads').then(function(d){dl=d}).catch(function(){dl=null})}
  async function exportPdf(i,b){
    if(!(window.jspdf&&window.jspdf.jsPDF)){say('Pustaka PDF belum termuat. Coba lagi sebentar.',true);return}
    if(!dl&&window.claude&&window.claude.use){try{dl=await window.claude.use('downloads')}catch(e){dl=null}}
    var fname=(i.number||'invoice').replace(/[^\w.-]+/g,'-')+'.pdf';
    try{
      var pdf=buildPdf(i,b);
      if(dl){
        await dl.save({filename:fname,data:pdf.output('arraybuffer')});
      }else{
        /* Dipakai saat halaman dibuka langsung di browser (bukan di dalam claude.ai) */
        pdf.save(fname);
      }
      say('PDF siap: '+i.number);
    }catch(e){
      if(e&&e.code==='declined')say('Unduhan dibatalkan.');
      else say('PDF belum bisa disimpan'+(e&&e.message?': '+e.message:'.'),true);
    }
  }
  $('#btn-pdf').addEventListener('click',function(){exportPdf(inv,prof)});

  /* Save, new, history */
  async function saveToDatabase(record){
    var response=await fetch('/api/invoices.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(record)});
    var data=await response.json();if(!response.ok)throw new Error(data.error||'Invoice gagal disimpan ke database.');
    return data;
  }
  async function saveProfileToDatabase(){
    var response=await fetch('/api/profile.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(prof)});
    var data=await response.json();if(!response.ok)throw new Error(data.error||'Profil usaha gagal disimpan ke database.');
  }
  async function save(){
    if(!inv.customer.name.trim()){say('Isi nama pelanggan dulu.',true);$('#c-name').focus();return}
    if(!inv.items.some(function(x){return x.name.trim()})){say('Tambahkan minimal satu barang atau jasa.',true);return}
    if(!inv.number.trim()){say('Nomor invoice tidak boleh kosong.',true);$('#i-number').focus();return}
    var dup=store.invoices.some(function(r){return r.id!==inv.id&&r.number===inv.number});
    if(dup){say('Nomor '+inv.number+' sudah dipakai invoice lain.',true);$('#i-number').focus();return}
    var rec=clone(inv);rec.updated=Date.now();rec.business=clone(prof);
    var idx=store.invoices.findIndex(function(r){return r.id===inv.id});
    if(idx>=0)store.invoices[idx]=rec;else store.invoices.push(rec);
    store.profile=clone(prof);
    editingId=inv.id;
    var ok=persist();
    $('#btn-save').disabled=true;
    try{await saveToDatabase(rec);$('#btn-save').disabled=false}catch(e){$('#btn-save').disabled=false;say(e.message,true);return}
    renderAll();renderHistory();
    say(ok?'Invoice '+inv.number+' tersimpan di riwayat.':'Tidak bisa menyimpan di browser ini. Unduh PDF sebelum menutup halaman.',!ok);
  }
  $('#btn-save').addEventListener('click',save);
  $('#btn-new').addEventListener('click',function(){
    inv=freshInvoice(inv.tax);editingId=null;numberAuto=true;fillForm();$('#sample-note').hidden=true;
    show('buat');say('Invoice baru siap diisi.');
  });

  function renderHistory(){
    var list=store.invoices.slice().sort(function(a,b){return (b.updated||0)-(a.updated||0)});
    $('#count').textContent=list.length;
    if(!list.length){
      $('#hlist').innerHTML='<div class="empty"><b>Belum ada invoice tersimpan</b>Isi form di tab Buat invoice, lalu tekan Simpan.'+(storageOk?'':'<br>Penyimpanan browser tidak tersedia, riwayat tidak akan bertahan.')+'</div>';
      return;
    }
    $('#hlist').innerHTML=list.map(function(r){
      var c=calc(r),asking=confirmDel===r.id;
      return '<div class="hrow" data-id="'+r.id+'"><div><div class="no">'+esc(r.number)+'</div><div class="who">'+esc(r.customer.name)+' · '+esc(dFmt(r.date))+'</div></div>'+
        '<div class="who">'+r.items.filter(function(x){return x.name.trim()}).length+' baris</div>'+
        '<div class="amt">'+rp(c.total)+'</div>'+
        '<div class="hacts">'+
          (asking
            ?'<button class="btn small danger" type="button" data-act="del-yes">Ya, hapus</button><button class="btn small" type="button" data-act="del-no">Batal</button>'
            :'<button class="btn small" type="button" data-act="edit">Edit</button><button class="btn small" type="button" data-act="pdf">Unduh PDF</button><button class="btn small danger" type="button" data-act="del">Hapus</button>')+
        '</div></div>';
    }).join('');
  }
  $('#hlist').addEventListener('click',function(e){
    var b=e.target.closest('[data-act]');if(!b)return;
    var id=b.closest('.hrow').dataset.id,r=store.invoices.find(function(x){return x.id===id});if(!r)return;
    var a=b.dataset.act;
    if(a==='edit'){inv=clone(r);delete inv.business;delete inv.updated;prof=clone(r.business||prof);editingId=r.id;numberAuto=false;fillForm();$('#sample-note').hidden=true;show('buat');say('Mengedit '+r.number)}
    else if(a==='pdf')exportPdf(r,r.business||prof);
    else if(a==='del'){confirmDel=id;renderHistory()}
    else if(a==='del-no'){confirmDel=null;renderHistory()}
    else if(a==='del-yes'){
      store.invoices=store.invoices.filter(function(x){return x.id!==id});confirmDel=null;persist();
      fetch('/api/invoices.php?number='+encodeURIComponent(r.number),{method:'DELETE'}).catch(function(){say('Invoice terhapus di tampilan, tetapi belum terhapus dari database.',true)});
      if(editingId===id){editingId=null;renderAll()}
      renderHistory();say('Invoice '+r.number+' dihapus.');
    }
  });
  function exportExcel(){
    if(!window.XLSX){say('Pustaka Excel belum termuat. Periksa koneksi internet lalu coba lagi.',true);return}
    if(!store.invoices.length){say('Belum ada invoice yang bisa diexport.',true);return}
    var summary=[],detail=[];
    store.invoices.slice().sort(function(a,b){return (b.updated||0)-(a.updated||0)}).forEach(function(r){
      var c=calc(r);summary.push({Nomor:r.number,Tanggal:dFmt(r.date),Jatuh_Tempo:dFmt(r.due),Pelanggan:r.customer.name,Kontak:r.customer.contact||'',Subtotal:c.sub,Diskon:c.disc,Pajak:c.tax,Total:c.total,Status:r.due&&r.due<iso(new Date())?'Jatuh tempo':'Aktif'});
      r.items.filter(function(x){return x.name.trim()}).forEach(function(x,n){detail.push({Invoice:r.number,Tanggal:dFmt(r.date),Pelanggan:r.customer.name,No:n+1,Deskripsi:x.name,Jumlah:+x.qty||0,Harga_Satuan:+x.price||0,Jumlah_Harga:Math.round((+x.qty||0)*(+x.price||0))})});
    });
    var wb=XLSX.utils.book_new(),ws1=XLSX.utils.json_to_sheet(summary),ws2=XLSX.utils.json_to_sheet(detail);
    ws1['!cols']=[{wch:18},{wch:16},{wch:16},{wch:24},{wch:20},{wch:16},{wch:14},{wch:14},{wch:16},{wch:16}];ws2['!cols']=[{wch:18},{wch:16},{wch:24},{wch:7},{wch:38},{wch:12},{wch:18},{wch:18}];
    ws1['!autofilter']={ref:ws1['!ref']};ws2['!autofilter']={ref:ws2['!ref']};ws1['!freeze']={xSplit:0,ySplit:1};ws2['!freeze']={xSplit:0,ySplit:1};
    XLSX.utils.book_append_sheet(wb,ws1,'Ringkasan Invoice');XLSX.utils.book_append_sheet(wb,ws2,'Detail Barang');
    XLSX.writeFile(wb,'riwayat-invoice-'+iso(new Date())+'.xlsx');say('File Excel berhasil dibuat.');
  }
  $('#btn-export').addEventListener('click',exportExcel);

  /* Tabs */
  function show(which){
    var buat=which==='buat';
    $('#view-buat').hidden=!buat;$('#view-riwayat').hidden=buat;
    $('#tab-buat').setAttribute('aria-selected',buat);$('#tab-riwayat').setAttribute('aria-selected',!buat);
    if(!buat){confirmDel=null;renderHistory()}
  }
  function showWorkspace(which){
    var profile=which==='profil', buat=which==='buat';
    $('#business-profile').classList.toggle('profile-focus',profile);
    $('#form').classList.toggle('profile-mode',profile);
    $('#view-buat').hidden=false;
    $('#view-buat').classList.toggle('workspace-profile',profile);
    $('#view-buat').classList.toggle('workspace-invoice',buat);
    $('#tab-profil').setAttribute('aria-selected',profile);
    $('#tab-buat').setAttribute('aria-selected',buat);
    $('#tab-riwayat').setAttribute('aria-selected',false);
    $('#view-riwayat').hidden=true;
  }
  $('#tab-buat').addEventListener('click',function(){showWorkspace('buat');show('buat')});
  $('#tab-riwayat').addEventListener('click',function(){show('riwayat')});
  $('#tab-profil').addEventListener('click',function(){showWorkspace('profil')});
  $('#btn-profile-save').addEventListener('click',function(){
    var button=this;button.disabled=true;saveProfileToDatabase().then(function(){store.profile=clone(prof);persist();showWorkspace('buat');say('Profil usaha tersimpan dan siap digunakan di invoice.')}).catch(function(e){say(e.message,true)}).finally(function(){button.disabled=false});
  });
  var themeButton=$('#theme-toggle');
  function applyTheme(theme){document.documentElement.dataset.theme=theme;themeButton.querySelector('span').textContent=theme==='dark'?'☀':'☾';themeButton.setAttribute('aria-label',theme==='dark'?'Gunakan mode terang':'Gunakan mode gelap')}
  applyTheme(localStorage.getItem('invoice-theme')||'light');
  themeButton.addEventListener('click',function(){var next=document.documentElement.dataset.theme==='dark'?'light':'dark';localStorage.setItem('invoice-theme',next);applyTheme(next)});

  $('#sample-note').hidden=false;
  async function loadProfileFromDatabase(){
    try{var response=await fetch('/api/profile.php');if(!response.ok)return;var data=await response.json();if(data&&data.name!==undefined){prof=data;store.profile=clone(prof);fillForm()}}catch(e){say('Profil usaha dari database belum dapat dimuat.',true)}
  }
  async function loadInvoicesFromDatabase(){
    try{var response=await fetch('/api/invoices.php');if(!response.ok)return;var rows=await response.json();if(Array.isArray(rows)){store.invoices=rows;persist();renderHistory()}}catch(e){say('Riwayat database belum dapat dimuat.',true)}
  }
  fillForm();renderHistory();showWorkspace('buat');loadProfileFromDatabase();loadInvoicesFromDatabase();
})();
