;(() => {
  // ===== DATA STRUCTURES =====
  function Node(v) { this.value = v; this.prev = null; this.next = null; }

  function DLL() { this.head = null; this.tail = null; this._length = 0; this._cursor = null; }

  DLL.prototype.toArray = function() { var a=[], c=this.head; while(c){a.push(c.value);c=c.next;} return a; };

  DLL.prototype.pushFront = function(v) {
    var n=new Node(v);
    if(!this.head){this.head=this.tail=n;}else{n.next=this.head;this.head.prev=n;this.head=n;}
    if(!this._cursor)this._cursor=n; this._length++;
  };

  DLL.prototype.pushBack = function(v) {
    var n=new Node(v);
    if(!this.tail){this.head=this.tail=n;}else{n.prev=this.tail;this.tail.next=n;this.tail=n;}
    if(!this._cursor)this._cursor=n; this._length++;
  };

  DLL.prototype.insertAt = function(v,pos) {
    if(pos<=1){this.pushFront(v);return;} if(pos>this._length){this.pushBack(v);return;}
    var idx=1,cur=this.head; while(cur&&idx<pos){cur=cur.next;idx++;}
    if(!cur){this.pushBack(v);return;}
    var n=new Node(v),p=cur.prev; n.next=cur;n.prev=p;
    if(p)p.next=n;else this.head=n; cur.prev=n; this._length++;
    if(!this._cursor)this._cursor=n;
  };

  DLL.prototype.removeCursor = function() {
    if(!this._cursor)return null;
    var nd=this._cursor,p=nd.prev,nx=nd.next;
    if(p)p.next=nx;else this.head=nx; if(nx)nx.prev=p;else this.tail=p;
    this._length--; this._cursor=nx||p||null; return nd.value;
  };

  DLL.prototype.removeById = function(id) {
    var c=this.head; while(c){if(c.value.id===id){
      var p=c.prev,nx=c.next; if(p)p.next=nx;else this.head=nx;
      if(nx)nx.prev=p;else this.tail=p; this._length--;
      if(this._cursor===c)this._cursor=nx||p||null; return c.value;
    }c=c.next;} return null;
  };

  DLL.prototype.moveNode = function(from,to) {
    if(from===to)return; var a=this.toArray();
    if(from>=a.length||to>=a.length)return;
    var item=a.splice(from,1)[0]; a.splice(to,0,item);
    this.head=null;this.tail=null;this._length=0;this._cursor=null;
    for(var i=0;i<a.length;i++)this.pushBack(a[i]);
  };

  DLL.prototype.moveNext = function() { if(this._cursor&&this._cursor.next)this._cursor=this._cursor.next; return this._cursor?this._cursor.value:null; };
  DLL.prototype.movePrev = function() { if(this._cursor&&this._cursor.prev)this._cursor=this._cursor.prev; return this._cursor?this._cursor.value:null; };

  function uid(){return Math.random().toString(36).slice(2,9);}

  // ===== STATE =====
  var playlists = { main: new DLL(), favorites: new DLL() };
  var currentPlaylistId = 'main';
  var customPlaylists = [];
  var favorites = [];
  var searchCache = [];
  var recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
  var isPlaying = false;
  var draggedIndex = null;
  var shuffleMode = false;
  var repeatMode = 0;
  var queue = [];
  var recentlyPlayed = JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
  var audioCtx = null, analyser = null, sourceNode = null;
  var debounceTimer = null;
  var currentSort = 'default';
  var songNotifTimer = null;

  // ===== DOM =====
  var $ = function(id){return document.getElementById(id);};
  var audio = $('audio-player');
  var listEl = $('playlist');
  var searchTerm = $('search-term'), searchResults = $('search-results');
  var searchDropdown = $('search-dropdown');
  var cbPlay = $('cb-play'), cbPrev = $('cb-prev'), cbNext = $('cb-next');
  var cbProgress = $('cb-progress'), cbVolume = $('cb-volume');
  var cbFav = $('cb-fav'), cbFullscreen = $('cb-fullscreen');
  var fsPlayer = $('fs-player'), fsClose = $('fs-close');
  var newPlaylistBtn = $('new-playlist-btn');
  var modal = $('create-playlist-modal'), modalName = $('new-playlist-name');
  var confirmPlaylist = $('confirm-playlist'), cancelPlaylist = $('cancel-playlist');
  var heroAlbumArt = $('hero-album-art'), heroBg = $('hero-bg');
  var searchFilters = $('search-filters');
  var progressFill = $('progress-fill'), volFill = $('vol-fill');
  var toastContainer = $('toast-container');
  var queuePanel = $('queue-panel'), queueClose = $('queue-close');
  var cbQueueBtn = $('cb-queue-btn');
  var npVisualizer = $('np-visualizer');
  var fsVisualizer = $('fs-visualizer');
  var tracklistFilter = $('tracklist-filter');
  var sortBtn = $('sort-btn'), sortMenu = $('sort-menu');

  // ===== UTILS =====
  function toast(msg,type){
    var t=document.createElement('div');
    t.className='toast'+(type==='error'?' toast-error':'');
    t.textContent=msg; toastContainer.appendChild(t);
    setTimeout(function(){t.remove();},3000);
  }

  function getList(){return playlists[currentPlaylistId]||playlists.main;}
  function formatTime(s){if(!isFinite(s))return'0:00';var m=Math.floor(s/60),sec=Math.floor(s%60);return m+':'+String(sec).padStart(2,'0');}

  // ===== PERSISTENCE =====
  function save(){
    try{
      var s={playlists:{},cur:currentPlaylistId,custom:customPlaylists,favs:favorites,vol:cbVolume?cbVolume.value:80,shuffle:shuffleMode,repeat:repeatMode};
      for(var k in playlists)s.playlists[k]=playlists[k].toArray();
      localStorage.setItem('musikState',JSON.stringify(s));
    }catch(e){}
  }

  function load(){
    try{
      var raw=localStorage.getItem('musikState'); if(!raw)return false;
      var s=JSON.parse(raw);
      if(s.custom)customPlaylists=s.custom;
      if(s.favs)favorites=s.favs;
      if(s.shuffle)shuffleMode=s.shuffle;
      if(s.repeat)repeatMode=s.repeat;
      for(var k in s.playlists){
        if(!playlists[k])playlists[k]=new DLL();
        else{playlists[k].head=null;playlists[k].tail=null;playlists[k]._length=0;playlists[k]._cursor=null;}
        s.playlists[k].forEach(function(song){playlists[k].pushBack(song);});
      }
      if(s.cur&&playlists[s.cur])currentPlaylistId=s.cur;
      if(s.vol&&cbVolume){cbVolume.value=s.vol;if(volFill)volFill.style.width=s.vol+'%';}
      customPlaylists.forEach(function(cp){addPlaylistCard(cp.id,cp.name);});
      return true;
    }catch(e){return false;}
  }

  // ===== DYNAMIC COLOR =====
  function extractColor(url){
    if(!url){heroBg.style.background='linear-gradient(135deg,#c0392b,#e74c3c 40%,#d35400)';return;}
    var img=new Image();img.crossOrigin='anonymous';
    img.onload=function(){
      var c=document.createElement('canvas');c.width=1;c.height=1;
      var ctx=c.getContext('2d');ctx.drawImage(img,0,0,1,1);
      try{
        var px=ctx.getImageData(0,0,1,1).data;
        var r=px[0],g=px[1],b=px[2];
        heroBg.style.background='linear-gradient(135deg,rgb('+r+','+g+','+b+'),rgb('+Math.floor(r*0.4)+','+Math.floor(g*0.4)+','+Math.floor(b*0.4)+'))';
        var fb=$('fs-bg');if(fb)fb.style.background='linear-gradient(135deg,rgb('+r+','+g+','+b+'),rgb('+Math.floor(r*0.2)+','+Math.floor(g*0.2)+','+Math.floor(b*0.2)+'))';
      }catch(e){}
    };img.src=url;
  }

  // ===== VISUALIZER =====
  function initAudio(){
    if(audioCtx)return;
    try{
      audioCtx=new(window.AudioContext||window.webkitAudioContext)();
      analyser=audioCtx.createAnalyser();analyser.fftSize=256;
      sourceNode=audioCtx.createMediaElementSource(audio);
      sourceNode.connect(analyser);analyser.connect(audioCtx.destination);
      drawViz();
    }catch(e){}
  }

  function drawViz(){
    if(!analyser)return;
    var buf=analyser.frequencyBinCount,data=new Uint8Array(buf);
    function loop(){
      requestAnimationFrame(loop);
      analyser.getByteFrequencyData(data);
      // NP visualizer (right sidebar)
      if(npVisualizer){
        var ctx=npVisualizer.getContext('2d'),w=npVisualizer.width,h=npVisualizer.height;
        ctx.clearRect(0,0,w,h);
        if(isPlaying){
          ctx.beginPath();ctx.moveTo(0,h);
          var step=Math.floor(buf/30);
          for(var i=0;i<30;i++){
            var v=data[i*step]/255;
            var x=(i/(30-1))*w,y=h-v*h*0.8;
            if(i===0)ctx.moveTo(x,y);
            else{var px=((i-1)/(30-1))*w,py=h-data[(i-1)*step]/255*h*0.8;
              ctx.quadraticCurveTo(px+(x-px)/2,py,x,y);}
          }
          ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
          var grad=ctx.createLinearGradient(0,0,0,h);
          grad.addColorStop(0,'rgba(255,107,53,0.6)');grad.addColorStop(1,'rgba(255,107,53,0.05)');
          ctx.fillStyle=grad;ctx.fill();
          ctx.beginPath();ctx.moveTo(0,h);
          for(var j=0;j<30;j++){
            var v2=data[j*step]/255;
            var x2=(j/(30-1))*w,y2=h-v2*h*0.8;
            if(j===0)ctx.moveTo(x2,y2);
            else{var px2=((j-1)/(30-1))*w,py2=h-data[(j-1)*step]/255*h*0.8;
              ctx.quadraticCurveTo(px2+(x2-px2)/2,py2,x2,y2);}
          }
          ctx.strokeStyle='rgba(255,107,53,0.8)';ctx.lineWidth=2;ctx.stroke();
        }
      }
      // FS visualizer
      if(fsVisualizer&&fsPlayer.classList.contains('active')){
        var fc=fsVisualizer.getContext('2d'),fw=fsVisualizer.width,fh=fsVisualizer.height;
        fc.clearRect(0,0,fw,fh);
        var st2=Math.floor(buf/40),bw=fw/40;
        for(var k=0;k<40;k++){
          var val=data[k*st2]/255,bh=val*fh;
          fc.fillStyle='rgba(255,255,255,'+(0.2+val*0.5)+')';
          fc.fillRect(k*bw+1,fh-bh,bw-2,bh);
        }
      }
    }
    loop();
  }

  // ===== PLAY ICONS =====
  var playPath='M8 5v14l11-7z', pausePath='M6 19h4V5H6v14zm8-14v14h4V5h-4z';
  function updatePlayIcons(){
    var p=isPlaying?pausePath:playPath;
    ['cb-play-icon','np-play-icon','fs-play-icon'].forEach(function(id){
      var el=$(id);if(el)el.innerHTML='<path d="'+p+'"/>';
    });
  }

  // ===== RENDER =====
  function render(){
    var list=getList(), cur=list._cursor?list._cursor.value:null;

    // Control bar
    var cbTitle=$('cb-title'),cbArtist=$('cb-artist'),cbArt=$('cb-art');
    if(cbTitle)cbTitle.textContent=cur?cur.title:'Sin reproducción';
    if(cbArtist)cbArtist.textContent=cur?cur.artist:'—';
    if(cbArt){if(cur&&cur.artwork){cbArt.style.backgroundImage='url('+cur.artwork+')';cbArt.style.display='block';}else{cbArt.style.backgroundImage='';cbArt.style.display='none';}}

    // NP widget (right sidebar)
    var npTitle=$('np-title'),npArtist=$('np-artist'),npArt=$('np-art');
    if(npTitle)npTitle.textContent=cur?cur.title:'Sin reproducción';
    if(npArtist)npArtist.textContent=cur?cur.artist:'—';
    if(npArt&&cur&&cur.artwork)npArt.style.backgroundImage='url('+cur.artwork+')';

    // Hero
    if(heroAlbumArt){
      if(cur&&cur.artwork){heroAlbumArt.style.backgroundImage='url('+cur.artwork+')';extractColor(cur.artwork);}
      else{heroAlbumArt.style.backgroundImage='';extractColor(null);}
    }

    // Fav button
    if(cbFav&&cur){
      var isFav=favorites.some(function(f){return f.id===cur.id;});
      cbFav.textContent=isFav?'❤':'♡';
      cbFav.classList.toggle('is-fav',isFav);
    }

    // Audio src
    if(audio){
      var src=cur&&cur.previewUrl?cur.previewUrl:'';
      if(src){if(audio.src!==src){audio.src=src;audio.volume=cbVolume?parseInt(cbVolume.value||'80',10)/100:0.8;}}
      else{if(!audio.paused)audio.pause();audio.removeAttribute('src');isPlaying=false;}
    }

    // Track list
    listEl.innerHTML='';
    var arr=list.toArray();

    // Apply filter
    var filterVal = tracklistFilter ? tracklistFilter.value.trim().toLowerCase() : '';
    var filtered = arr;
    if(filterVal){
      filtered = arr.filter(function(s){
        return s.title.toLowerCase().indexOf(filterVal)!==-1 || s.artist.toLowerCase().indexOf(filterVal)!==-1;
      });
    }

    // Apply sort
    if(currentSort==='title') filtered.sort(function(a,b){ return a.title.localeCompare(b.title); });
    else if(currentSort==='artist') filtered.sort(function(a,b){ return a.artist.localeCompare(b.artist); });

    // Empty state
    if(arr.length===0){
      listEl.innerHTML='<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div><h3>Tu playlist está vacía</h3><p>Busca canciones con Ctrl+K y agrégalas a tu colección</p></div>';
    }

    filtered.forEach(function(song,i){
      var realIndex = arr.indexOf(song);
      var li=document.createElement('li');
      li.setAttribute('data-index',realIndex+1);
      li.setAttribute('draggable','true');
      var isCurrent = cur&&cur.id===song.id;
      if(isCurrent) li.classList.add('is-playing');

      var thumb=document.createElement('div');thumb.className='song-thumb';
      if(song.artwork)thumb.style.backgroundImage='url('+song.artwork+')';
      var thumbPlay=document.createElement('span');thumbPlay.className='thumb-play';thumbPlay.textContent='▶';
      thumb.appendChild(thumbPlay);

      var info=document.createElement('div');info.className='song-info';
      info.innerHTML='<div class="song-title">'+song.title+'</div>';

      var artistCol=document.createElement('div');artistCol.className='song-artist-col';
      artistCol.textContent=song.artist;

      // Duration column
      var durCol=document.createElement('div');durCol.className='song-duration';
      durCol.textContent=song.previewUrl?'0:30':'—';

      var actions=document.createElement('div');actions.className='song-actions';
      var fb=document.createElement('button');fb.className='song-fav-btn';
      fb.textContent=favorites.some(function(f){return f.id===song.id;})?'❤':'♡';
      fb.addEventListener('click',function(e){e.stopPropagation();toggleFav(song);});
      var qb=document.createElement('button');qb.className='song-queue-btn';qb.textContent='+ Cola';
      qb.addEventListener('click',function(e){e.stopPropagation();addToQueue(song);});
      var db=document.createElement('button');db.className='song-del-btn';db.textContent='×';db.title='Eliminar';
      db.addEventListener('click',function(e){
        e.stopPropagation();
        list.removeById(song.id);
        if(audio&&!audio.paused&&cur&&cur.id===song.id){audio.pause();isPlaying=false;}
        render();save();toast('Canción eliminada');
      });
      actions.appendChild(fb);actions.appendChild(qb);actions.appendChild(db);

      li.appendChild(thumb);li.appendChild(info);li.appendChild(artistCol);li.appendChild(durCol);li.appendChild(actions);

      // Equalizer bars for playing song (replace number)
      if(isCurrent && isPlaying){
        li.setAttribute('data-index','');
        var eq=document.createElement('div');eq.className='eq-bars';
        eq.innerHTML='<span></span><span></span><span></span><span></span>';
        li.prepend(eq);
      }

      // Drag
      li.addEventListener('dragstart',function(e){draggedIndex=realIndex;li.style.opacity='0.4';e.dataTransfer.effectAllowed='move';});
      li.addEventListener('dragend',function(){li.style.opacity='1';draggedIndex=null;});
      li.addEventListener('dragover',function(e){e.preventDefault();li.style.borderTop='2px solid var(--accent)';});
      li.addEventListener('dragleave',function(){li.style.borderTop='';});
      li.addEventListener('drop',function(e){e.preventDefault();li.style.borderTop='';if(draggedIndex!==null&&draggedIndex!==realIndex){list.moveNode(draggedIndex,realIndex);render();save();}});

      li.addEventListener('click',function(){
        var nd=list.head,idx=0;
        while(nd){if(idx===realIndex){list._cursor=nd;render();playCurrent();break;}nd=nd.next;idx++;}
      });

      listEl.appendChild(li);
    });

    $('total-songs').textContent=arr.length+' canciones';
    $('hero-likes').textContent=favorites.length;
    updatePlaylistCounts();
    updatePlayIcons();
    updateShuffleUI();
    renderQueue();
    renderRightPlaylists();
  }

  // ===== FAVORITES =====
  function toggleFav(song){
    var idx=favorites.findIndex(function(f){return f.id===song.id;});
    if(idx>=0){favorites.splice(idx,1);playlists.favorites.removeById(song.id);toast('Eliminado de favoritos');}
    else{favorites.push(song);playlists.favorites.pushBack(song);toast('❤ Agregado a favoritos');}
    render();save();
  }

  function updatePlaylistCounts(){
    document.querySelectorAll('.pcard').forEach(function(c){
      var id=c.getAttribute('data-playlist-id');
      var el=c.querySelector('.pcard-count');
      if(el&&playlists[id])el.textContent=playlists[id]._length+' canciones';
    });
  }

  // ===== QUEUE =====
  function addToQueue(song){queue.push(song);toast('Agregado a la cola');renderQueue();}

  function renderQueue(){
    var qc=$('queue-current'),ql=$('queue-list');if(!qc||!ql)return;
    var list=getList(),cur=list._cursor?list._cursor.value:null;
    qc.innerHTML='';if(cur)qc.appendChild(mkQueueItem(cur));
    ql.innerHTML='';
    queue.forEach(function(s){ql.appendChild(mkQueueItem(s));});
    if(list._cursor&&list._cursor.next){var nd=list._cursor.next,ct=0;while(nd&&ct<10){ql.appendChild(mkQueueItem(nd.value));nd=nd.next;ct++;}}
  }

  function mkQueueItem(s){
    var d=document.createElement('div');d.className='queue-item';
    d.innerHTML='<div class="qi-thumb"'+(s.artwork?' style="background-image:url('+s.artwork+')"':'')+'></div><div class="qi-info"><div class="qi-title">'+s.title+'</div><div class="qi-artist">'+s.artist+'</div></div>';
    return d;
  }

  // ===== RIGHT SIDEBAR PLAYLISTS =====
  function renderRightPlaylists(){
    var el=$('rp-list');if(!el)return;el.innerHTML='';
    var all=[{id:'main',name:'Mi Playlist'},{id:'favorites',name:'Favoritos'}].concat(customPlaylists);
    all.forEach(function(p){
      var pl=playlists[p.id];if(!pl)return;
      var d=document.createElement('div');d.className='rp-item';
      d.innerHTML='<div class="rp-item-art" style="background:linear-gradient(135deg,hsl('+(p.id.charCodeAt(0)*7%360)+',50%,35%),hsl('+(p.id.charCodeAt(0)*13%360)+',50%,20%));"></div><div class="rp-item-info"><div class="rp-item-name">'+p.name+'</div><div class="rp-item-meta">'+pl._length+' canciones</div></div>';
      d.addEventListener('click',function(){
        currentPlaylistId=p.id;
        document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('active-card');});
        var card=document.querySelector('.pcard[data-playlist-id="'+p.id+'"]');
        if(card)card.classList.add('active-card');
        $('hero-title').textContent=p.name;
        render();save();
      });
      el.appendChild(d);
    });
  }

  // ===== SHUFFLE & REPEAT =====
  function updateShuffleUI(){
    ['cb-shuffle','np-shuffle'].forEach(function(id){var e=$(id);if(e)e.classList.toggle('active',shuffleMode);});
    ['cb-repeat','np-repeat'].forEach(function(id){var e=$(id);if(e)e.classList.toggle('active',repeatMode>0);});
  }

  function toggleShuffle(){shuffleMode=!shuffleMode;toast(shuffleMode?'Aleatorio ON':'Aleatorio OFF');updateShuffleUI();save();}
  function cycleRepeat(){repeatMode=(repeatMode+1)%3;toast(['Repetir OFF','Repetir todo','Repetir una'][repeatMode]);updateShuffleUI();save();}

  function getNext(){
    if(queue.length>0)return queue.shift();
    var list=getList();if(!list._cursor)return null;
    if(shuffleMode){
      var arr=list.toArray();if(arr.length<=1)return null;
      var cur=list._cursor.value,others=arr.filter(function(s){return s.id!==cur.id;});
      var pick=others[Math.floor(Math.random()*others.length)];
      var nd=list.head;while(nd){if(nd.value.id===pick.id){list._cursor=nd;return pick;}nd=nd.next;}return null;
    }
    if(list._cursor.next){list.moveNext();return list._cursor.value;}
    if(repeatMode===1&&list.head){list._cursor=list.head;return list._cursor.value;}
    return null;
  }

  // ===== SEARCH =====
  function mkResultCard(item){
    var card=document.createElement('div');card.className='result-card';
    var title=item.trackName||'Sin título',artist=item.artistName||'Desconocido';
    var art=item.artworkUrl100||'',preview=item.previewUrl||'';
    card.innerHTML='<div class="rc-left">'+(art?'<img alt="cover" src="'+art+'"/>':'<div style="width:44px;height:44px;background:var(--surface3);border-radius:4px;"></div>')+'</div><div class="rc-mid"><div class="rc-title">'+title+'</div><div class="rc-artist">'+artist+'</div></div><div class="rc-right"><button class="rc-play">▶</button><button class="rc-add">Añadir</button></div>';
    card.querySelector('.rc-play').addEventListener('click',function(){
      if(preview&&audio){initAudio();audio.src=preview;audio.volume=cbVolume?parseInt(cbVolume.value,10)/100:0.8;audio.play().then(function(){isPlaying=true;updatePlayIcons();}).catch(function(){});}
    });
    card.querySelector('.rc-add').addEventListener('click',function(){
      var song={id:String(item.trackId||uid()),title:title,artist:artist,previewUrl:preview,artwork:art};
      var list=getList();
      list.pushBack(song);
      // Move cursor to the newly added song (last node) and play
      list._cursor=list.tail;
      render();save();playCurrent();
      toast('▶ '+title+' reproduciendo');
      closeDropdown();
    });
    return card;
  }

  function doSearch(term,container,btn){
    var q=(term||'').trim();if(!q){container.innerHTML='<div class="muted">Escribe algo para buscar</div>';return;}
    if(recentSearches.indexOf(q)===-1){recentSearches.unshift(q);if(recentSearches.length>5)recentSearches.pop();localStorage.setItem('recentSearches',JSON.stringify(recentSearches));renderRecent();}
    container.innerHTML='<div class="muted">Buscando…</div>';
    if(btn){btn.textContent='...';btn.disabled=true;}
    fetch('https://itunes.apple.com/search?term='+encodeURIComponent(q)+'&media=music&entity=song&limit=20')
      .then(function(r){return r.json();})
      .then(function(data){
        var items=(data&&data.results)||[];
        if(!items.length){container.innerHTML='<div class="muted">Sin resultados</div>';if(searchFilters)searchFilters.style.display='none';return;}
        if(container===searchResults){searchCache=items;if(searchFilters)searchFilters.style.display='flex';}
        var frag=document.createDocumentFragment();
        items.forEach(function(it){frag.appendChild(mkResultCard(it));});
        container.innerHTML='';container.appendChild(frag);
      })
      .catch(function(){container.innerHTML='<div class="muted">Error. Intenta de nuevo.</div>';})
      .finally(function(){if(btn){btn.textContent='Buscar';btn.disabled=false;}});
  }

  function renderRecent(){
    var el=$('sd-recent');if(!el)return;el.innerHTML='';
    recentSearches.forEach(function(t){
      var tag=document.createElement('button');tag.className='recent-tag';tag.textContent=t;
      tag.addEventListener('click',function(){
        searchTerm.value=t;
        doSearch(t,searchResults,null);
      });
      el.appendChild(tag);
    });
  }

  // ===== RECENTLY PLAYED =====
  function trackRecentlyPlayed(song){
    if(!song || !song.artwork) return;
    // Remove if already exists
    recentlyPlayed = recentlyPlayed.filter(function(s){ return s.id !== song.id; });
    // Add to front
    recentlyPlayed.unshift({ id: song.id, title: song.title, artist: song.artist, artwork: song.artwork, previewUrl: song.previewUrl });
    // Keep max 12
    if(recentlyPlayed.length > 12) recentlyPlayed = recentlyPlayed.slice(0, 12);
    try { localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed)); } catch(e){}
    renderRecentlyPlayed();
  }

  function renderRecentlyPlayed(){
    var section = $('recent-played-section');
    var container = $('recent-played-cards');
    if(!section || !container) return;

    if(recentlyPlayed.length < 3){ section.style.display = 'none'; return; }
    section.style.display = 'block';
    container.innerHTML = '';

    recentlyPlayed.forEach(function(song){
      var card = document.createElement('div');
      card.className = 'rp-card';
      card.innerHTML = '<div class="rp-card-art" style="background-image:url(' + song.artwork + ')"><span class="rp-card-play">▶</span></div><div class="rp-card-title">' + song.title + '</div><div class="rp-card-artist">' + song.artist + '</div>';
      card.addEventListener('click', function(){
        // Add to current playlist if not there, then play
        var list = getList();
        var exists = list.toArray().some(function(s){ return s.id === song.id; });
        if(!exists) list.pushBack(song);
        // Move cursor to this song
        var nd = list.head;
        while(nd){ if(nd.value.id === song.id){ list._cursor = nd; break; } nd = nd.next; }
        render(); playCurrent();
      });
      container.appendChild(card);
    });
  }

  // ===== SONG NOTIFICATION =====
  function showSongNotif(song){
    if(!song) return;
    var notif=$('song-notif'),snArt=$('sn-art'),snTitle=$('sn-title'),snArtist=$('sn-artist');
    if(!notif) return;
    if(song.artwork) snArt.style.backgroundImage='url('+song.artwork+')';
    snTitle.textContent=song.title;
    snArtist.textContent=song.artist;
    notif.classList.add('show');
    clearTimeout(songNotifTimer);
    songNotifTimer=setTimeout(function(){ notif.classList.remove('show'); },3500);
  }

  // ===== PLAYBACK =====
  function playCurrent(){
    var cur=getList()._cursor;if(!cur||!cur.value.previewUrl)return;
    trackRecentlyPlayed(cur.value);
    showSongNotif(cur.value);
    initAudio();audio.src=cur.value.previewUrl;
    audio.volume=cbVolume?parseInt(cbVolume.value,10)/100:0.8;
    audio.play().then(function(){isPlaying=true;updatePlayIcons();updateFS();}).catch(function(){});
  }

  function updateFS(){
    var cur=getList()._cursor;if(!cur)return;var v=cur.value;
    var ft=$('fs-title'),fa=$('fs-artist'),fart=$('fs-art');
    if(ft)ft.textContent=v.title;if(fa)fa.textContent=v.artist;
    if(fart&&v.artwork)fart.style.backgroundImage='url('+v.artwork+')';
  }

  function updateProgress(){
    if(!audio)return;var ct=audio.currentTime||0,d=audio.duration||0;
    if(d>0){var pct=(ct/d)*100;cbProgress.value=String(pct);if(progressFill)progressFill.style.width=pct+'%';
      var tc=$('cb-time-current'),tt=$('cb-time-total');
      if(tc)tc.textContent=formatTime(ct);if(tt)tt.textContent=formatTime(d);}
  }


  // ===== PLAYLIST CARD =====
  function addPlaylistCard(id,name){
    // Add to horizontal cards
    var container=$('playlists-cards');
    var card=document.createElement('div');card.className='pcard';card.setAttribute('data-playlist-id',id);
    var hue=Math.floor(Math.random()*360);
    card.innerHTML='<div class="pcard-art" style="background:linear-gradient(135deg,hsl('+hue+',50%,35%),hsl('+(hue+40)+',50%,20%));"><svg width="32" height="32" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div><div class="pcard-name">'+name+'</div><div class="pcard-count">0 canciones</div>';
    card.addEventListener('click',function(){
      document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('active-card');});
      card.classList.add('active-card');
      currentPlaylistId=id;$('hero-title').textContent=name;
      updateIconbarActive(id);
      render();save();
    });
    container.appendChild(card);

    // Add to iconbar
    addIconbarItem(id, name, hue);
  }

  function addIconbarItem(id, name, hue) {
    var ibContainer = $('ib-playlists');
    var btn = document.createElement('button');
    btn.className = 'ib-pl';
    btn.setAttribute('data-playlist-id', id);
    btn.setAttribute('title', name);
    var h = hue || (id.charCodeAt(0) * 7 % 360);
    btn.innerHTML = '<div class="ib-pl-art" style="background:linear-gradient(135deg,hsl('+h+',50%,35%),hsl('+(h+40)+',50%,20%));"><svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg></div>';
    btn.addEventListener('click', function(){
      currentPlaylistId = id;
      $('hero-title').textContent = name;
      document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('active-card');});
      var pcard = document.querySelector('.pcard[data-playlist-id="'+id+'"]');
      if(pcard) pcard.classList.add('active-card');
      updateIconbarActive(id);
      render(); save();
    });
    ibContainer.appendChild(btn);
  }

  function updateIconbarActive(id) {
    document.querySelectorAll('.ib-pl').forEach(function(b){ b.classList.remove('active-ib'); });
    var active = document.querySelector('.ib-pl[data-playlist-id="'+id+'"]');
    if(active) active.classList.add('active-ib');
  }

  // ===== EVENTS =====

  // Search dropdown behavior
  function openDropdown(){ if(searchDropdown) searchDropdown.classList.add('open'); }
  function closeDropdown(){ if(searchDropdown) searchDropdown.classList.remove('open'); }

  if(searchTerm){
    searchTerm.addEventListener('focus', function(){
      openDropdown();
    });
    searchTerm.addEventListener('keydown',function(e){
      if(e.key==='Enter'){ doSearch(searchTerm.value,searchResults,null); openDropdown(); }
      if(e.key==='Escape'){ closeDropdown(); searchTerm.blur(); }
    });
    searchTerm.addEventListener('input',function(){
      openDropdown();
      clearTimeout(debounceTimer);
      debounceTimer=setTimeout(function(){
        var v=searchTerm.value.trim();
        if(v.length>=2) doSearch(v,searchResults,null);
        else { searchResults.innerHTML=''; if(searchFilters) searchFilters.style.display='none'; }
      },400);
    });
  }

  // Close dropdown on click outside
  document.addEventListener('click',function(e){
    if(searchDropdown && !searchDropdown.contains(e.target) && e.target!==searchTerm && !e.target.closest('.topnav-search')){
      closeDropdown();
    }
  });

  // Ctrl+K shortcut to focus search
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey) && e.key==='k'){
      e.preventDefault();
      searchTerm.focus();
      openDropdown();
    }
  });

  if(searchFilters)searchFilters.querySelectorAll('.filter-chip').forEach(function(tab){
    tab.addEventListener('click',function(){searchFilters.querySelectorAll('.filter-chip').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');
      if(searchCache.length>0){var frag=document.createDocumentFragment();searchCache.forEach(function(it){frag.appendChild(mkResultCard(it));});searchResults.innerHTML='';searchResults.appendChild(frag);}
    });
  });

  // Audio events
  if(audio){
    audio.addEventListener('ended',function(){isPlaying=false;updatePlayIcons();if(repeatMode===2){audio.currentTime=0;audio.play().then(function(){isPlaying=true;updatePlayIcons();});return;}var nx=getNext();if(nx){render();playCurrent();}});
    audio.addEventListener('play',function(){isPlaying=true;updatePlayIcons();});
    audio.addEventListener('pause',function(){isPlaying=false;updatePlayIcons();});
    audio.addEventListener('timeupdate',updateProgress);
    audio.addEventListener('loadedmetadata',updateProgress);
  }

  // Control bar
  if(cbPrev)cbPrev.addEventListener('click',function(){var l=getList();if(!l._cursor||!l._cursor.prev){toast('No hay anterior','error');return;}l.movePrev();render();playCurrent();});
  if(cbNext)cbNext.addEventListener('click',function(){var nx=getNext();if(nx){render();playCurrent();}else toast('No hay siguiente','error');});
  if(cbPlay)cbPlay.addEventListener('click',function(){
    var l=getList();if(!l._cursor){toast('Nada seleccionado','error');return;}initAudio();
    if(audio.paused){var c=l._cursor.value;if(!c||!c.previewUrl){toast('Sin preview','error');return;}if(!audio.src||audio.src!==c.previewUrl)audio.src=c.previewUrl;audio.volume=cbVolume?parseInt(cbVolume.value,10)/100:0.8;audio.play().then(function(){isPlaying=true;updatePlayIcons();updateFS();}).catch(function(){});}
    else{audio.pause();isPlaying=false;updatePlayIcons();}
  });

  if(cbVolume)cbVolume.addEventListener('input',function(){var v=parseInt(cbVolume.value,10);if(audio)audio.volume=v/100;if(volFill)volFill.style.width=v+'%';});
  if(cbProgress)cbProgress.addEventListener('input',function(){var p=parseFloat(cbProgress.value)/100;if(audio&&audio.duration>0)audio.currentTime=p*audio.duration;});
  if(cbFav)cbFav.addEventListener('click',function(){var c=getList()._cursor;if(c)toggleFav(c.value);});

  // Shuffle & Repeat (all buttons)
  ['cb-shuffle','np-shuffle'].forEach(function(id){var e=$(id);if(e)e.addEventListener('click',toggleShuffle);});
  ['cb-repeat','np-repeat'].forEach(function(id){var e=$(id);if(e)e.addEventListener('click',cycleRepeat);});

  // NP mini controls
  var npPlay=$('np-play'),npPrev=$('np-prev'),npNext=$('np-next');
  if(npPlay)npPlay.addEventListener('click',function(){cbPlay.click();});
  if(npPrev)npPrev.addEventListener('click',function(){cbPrev.click();});
  if(npNext)npNext.addEventListener('click',function(){cbNext.click();});

  // Queue
  if(cbQueueBtn)cbQueueBtn.addEventListener('click',function(){queuePanel.classList.toggle('open');});
  if(queueClose)queueClose.addEventListener('click',function(){queuePanel.classList.remove('open');});

  // Fullscreen
  if(cbFullscreen)cbFullscreen.addEventListener('click',function(){updateFS();fsPlayer.classList.add('active');});
  if(fsClose)fsClose.addEventListener('click',function(){fsPlayer.classList.remove('active');});
  var fsPrev=$('fs-prev'),fsPlay=$('fs-play'),fsNext=$('fs-next');
  if(fsPrev)fsPrev.addEventListener('click',function(){cbPrev.click();updateFS();});
  if(fsNext)fsNext.addEventListener('click',function(){cbNext.click();updateFS();});
  if(fsPlay)fsPlay.addEventListener('click',function(){cbPlay.click();});

  // Iconbar playlist clicks (initial ones)
  document.querySelectorAll('.ib-pl').forEach(function(btn){
    btn.addEventListener('click',function(){
      var id=btn.getAttribute('data-playlist-id');
      currentPlaylistId=id;
      $('hero-title').textContent=id==='favorites'?'❤️ Favoritos':'Mi Playlist Principal';
      document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('active-card');});
      var pcard=document.querySelector('.pcard[data-playlist-id="'+id+'"]');
      if(pcard)pcard.classList.add('active-card');
      updateIconbarActive(id);
      render();save();
    });
  });

  // Iconbar create button
  var ibCreate=$('ib-create');
  if(ibCreate)ibCreate.addEventListener('click',function(){modal.style.display='flex';setTimeout(function(){modalName.focus();},100);});

  // Playlist cards click (initial ones)
  document.querySelectorAll('.pcard').forEach(function(card){
    card.addEventListener('click',function(){
      document.querySelectorAll('.pcard').forEach(function(c){c.classList.remove('active-card');});
      card.classList.add('active-card');
      var id=card.getAttribute('data-playlist-id');
      currentPlaylistId=id;
      $('hero-title').textContent=id==='favorites'?'❤️ Favoritos':'Mi Playlist Principal';
      updateIconbarActive(id);
      render();save();
    });
  });

  // New playlist
  if(newPlaylistBtn)newPlaylistBtn.addEventListener('click',function(){modal.style.display='flex';setTimeout(function(){modalName.focus();},100);});
  if(confirmPlaylist)confirmPlaylist.addEventListener('click',function(){
    var name=(modalName.value||'').trim();if(!name){toast('Ingresa un nombre','error');return;}
    var id='pl_'+uid();playlists[id]=new DLL();customPlaylists.push({id:id,name:name});
    addPlaylistCard(id,name);modal.style.display='none';modalName.value='';save();toast('Playlist "'+name+'" creada');
  });
  if(cancelPlaylist)cancelPlaylist.addEventListener('click',function(){modal.style.display='none';modalName.value='';});

  // ===== SORT & FILTER =====
  if(tracklistFilter) tracklistFilter.addEventListener('input', function(){ render(); });

  if(sortBtn) sortBtn.addEventListener('click', function(e){
    e.stopPropagation();
    sortMenu.classList.toggle('open');
  });

  if(sortMenu) sortMenu.querySelectorAll('button').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      currentSort = btn.getAttribute('data-sort');
      var sortLabel = $('sort-label');
      if(sortLabel) sortLabel.textContent = btn.textContent;
      sortMenu.classList.remove('open');
      render();
    });
  });

  document.addEventListener('click', function(){ if(sortMenu) sortMenu.classList.remove('open'); });

  // ===== SHORTCUTS MODAL =====
  var shortcutsModal = $('shortcuts-modal');
  var closeShortcuts = $('close-shortcuts');
  if(closeShortcuts) closeShortcuts.addEventListener('click', function(){ shortcutsModal.style.display='none'; });

  // ===== KEYBOARD =====
  document.addEventListener('keydown',function(e){
    if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;
    switch(e.code){
      case'Space':e.preventDefault();if(cbPlay)cbPlay.click();break;
      case'ArrowRight':if(cbNext)cbNext.click();break;
      case'ArrowLeft':if(cbPrev)cbPrev.click();break;
      case'KeyS':toggleShuffle();break;
      case'KeyR':cycleRepeat();break;
      case'KeyF':if(cbFullscreen)cbFullscreen.click();break;
      case'Escape':fsPlayer.classList.remove('active');queuePanel.classList.remove('open');if(shortcutsModal)shortcutsModal.style.display='none';break;
      case'ArrowUp':e.preventDefault();if(cbVolume){cbVolume.value=Math.min(100,parseInt(cbVolume.value)+5);cbVolume.dispatchEvent(new Event('input'));}break;
      case'ArrowDown':e.preventDefault();if(cbVolume){cbVolume.value=Math.max(0,parseInt(cbVolume.value)-5);cbVolume.dispatchEvent(new Event('input'));}break;
    }
    // ? key for shortcuts
    if(e.key==='?' && shortcutsModal){ shortcutsModal.style.display = shortcutsModal.style.display==='flex'?'none':'flex'; }
  });

  // ===== INIT =====
  var loaded=load();
  // Clean old default songs that have no previewUrl
  ['main','favorites'].forEach(function(k){
    if(!playlists[k])return;
    var arr=playlists[k].toArray();
    var dirty=false;
    arr.forEach(function(s){
      if(!s.previewUrl && !s.artwork){
        playlists[k].removeById(s.id); dirty=true;
      }
    });
    if(dirty)save();
  });
  renderRecent();renderRecentlyPlayed();render();
})();
