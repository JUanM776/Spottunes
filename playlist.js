;(() => {
  function Node(value) {
    this.value = value
    this.prev = null
    this.next = null
  }

  function DoublyLinkedList() {
    this.head = null
    this.tail = null
    this._length = 0
    this._cursor = null
  }

  DoublyLinkedList.prototype.toArray = function () {
    var a = []
    var c = this.head
    while (c) {
      a.push(c.value)
      c = c.next
    }
    return a
  }

  DoublyLinkedList.prototype.pushFront = function (value) {
    var n = new Node(value)
    if (!this.head) {
      this.head = this.tail = n
    } else {
      n.next = this.head
      this.head.prev = n
      this.head = n
    }
    if (!this._cursor) this._cursor = n
    this._length++
  }

  DoublyLinkedList.prototype.pushBack = function (value) {
    var n = new Node(value)
    if (!this.tail) {
      this.head = this.tail = n
    } else {
      n.prev = this.tail
      this.tail.next = n
      this.tail = n
    }
    if (!this._cursor) this._cursor = n
    this._length++
  }

  DoublyLinkedList.prototype.insertAt = function (value, position) {
    if (position <= 1) {
      this.pushFront(value)
      return
    }
    if (position > this._length) {
      this.pushBack(value)
      return
    }
    var idx = 1
    var cur = this.head
    while (cur && idx < position) {
      cur = cur.next
      idx++
    }
    if (!cur) {
      this.pushBack(value)
      return
    }
    var n = new Node(value)
    var p = cur.prev
    n.next = cur
    n.prev = p
    if (p) p.next = n
    else this.head = n
    cur.prev = n
    this._length++
    if (!this._cursor) this._cursor = n
  }

  DoublyLinkedList.prototype.removeCursor = function () {
    if (!this._cursor) return null
    var node = this._cursor
    var prev = node.prev,
      next = node.next
    if (prev) prev.next = next
    else this.head = next
    if (next) next.prev = prev
    else this.tail = prev
    this._length--
    this._cursor = next || prev || null
    return node.value
  }

  DoublyLinkedList.prototype.removeById = function (id) {
    var cur = this.head
    while (cur) {
      if (cur.value.id === id) {
        var prev = cur.prev,
          next = cur.next
        if (prev) prev.next = next
        else this.head = next
        if (next) next.prev = prev
        else this.tail = prev
        this._length--
        if (this._cursor === cur) this._cursor = next || prev || null
        return cur.value
      }
      cur = cur.next
    }
    return null
  }

  DoublyLinkedList.prototype.moveNode = function (fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    var arr = this.toArray()
    if (fromIndex >= arr.length || toIndex >= arr.length) return

    var item = arr.splice(fromIndex, 1)[0]
    arr.splice(toIndex, 0, item)

    this.head = null
    this.tail = null
    this._length = 0
    this._cursor = null

    for (var i = 0; i < arr.length; i++) {
      this.pushBack(arr[i])
    }
  }

  DoublyLinkedList.prototype.moveNext = function () {
    if (this._cursor && this._cursor.next) this._cursor = this._cursor.next
    return this._cursor ? this._cursor.value : null
  }

  DoublyLinkedList.prototype.movePrev = function () {
    if (this._cursor && this._cursor.prev) this._cursor = this._cursor.prev
    return this._cursor ? this._cursor.value : null
  }

  function uid() {
    return Math.random().toString(36).slice(2, 9)
  }

  var playlists = {
    main: new DoublyLinkedList(),
    favorites: new DoublyLinkedList(),
  }
  var currentPlaylistId = "main"
  var customPlaylists = []
  var favorites = []
  var searchResultsCache = []

  var titleInput = document.getElementById("song-title")
  var artistInput = document.getElementById("song-artist")
  var positionInput = document.getElementById("song-position")
  var addStartBtn = document.getElementById("add-start")
  var addEndBtn = document.getElementById("add-end")
  var addAtBtn = document.getElementById("add-at")
  var removeBtn = document.getElementById("remove-current")
  var nextBtn = document.getElementById("next")
  var prevBtn = document.getElementById("prev")
  var playCurrentBtn = document.getElementById("play-current")
  var listEl = document.getElementById("playlist")
  var searchTerm = document.getElementById("search-term")
  var searchBtn = document.getElementById("search-btn")
  var searchResults = document.getElementById("search-results")
  var audio = document.getElementById("audio-player")
  var playAllBtn = document.getElementById("play-all")
  var ytKeyInput = document.getElementById("yt-api-key")
  var ytKeySave = document.getElementById("save-yt-key")
  var ytPlayerContainer = document.getElementById("yt-player")
  var cbPrev = document.getElementById("cb-prev")
  var cbPlay = document.getElementById("cb-play")
  var cbNext = document.getElementById("cb-next")
  var cbProgress = document.getElementById("cb-progress")
  var cbVolume = document.getElementById("cb-volume")
  var cbFavorite = document.getElementById("cb-favorite")
  var cbFullscreen = document.getElementById("cb-fullscreen")
  var fullscreenPlayer = document.getElementById("fullscreen-player")
  var fsClose = document.getElementById("fs-close")
  var sidebarSearchTerm = document.getElementById("sidebar-search-term")
  var sidebarSearchBtn = document.getElementById("sidebar-search-btn")
  var sidebarSearchResults = document.getElementById("sidebar-search-results")
  var sidebarSearch = document.getElementById("sidebar-search")
  var newPlaylistBtn = document.getElementById("new-playlist-btn")
  var createPlaylistModal = document.getElementById("create-playlist-modal")
  var newPlaylistName = document.getElementById("new-playlist-name")
  var confirmPlaylist = document.getElementById("confirm-playlist")
  var cancelPlaylist = document.getElementById("cancel-playlist")
  var heroAlbumArt = document.getElementById("hero-album-art")
  var searchFilters = document.getElementById("search-filters")

  var isPlaying = false
  var draggedIndex = null

  function getCurrentPlaylist() {
    return playlists[currentPlaylistId] || playlists.main
  }

  function updatePlayButton() {
    if (cbPlay) {
      cbPlay.textContent = isPlaying ? "⏸" : "▶"
    }
    if (playCurrentBtn) {
      playCurrentBtn.textContent = isPlaying ? "Pausar" : "Reproducir actual"
    }
  }

  function render() {
    var playlist = getCurrentPlaylist()
    var cur = playlist._cursor ? playlist._cursor.value : null

    var cbTitle = document.getElementById("cb-current-title")
    var cbArtist = document.getElementById("cb-current-artist")
    var cbAlbumArt = document.getElementById("cb-album-art")
    if (cbTitle) cbTitle.textContent = cur ? cur.title : "—"
    if (cbArtist) cbArtist.textContent = cur ? cur.artist : "—"

    if (cbAlbumArt) {
      if (cur && cur.artwork) {
        cbAlbumArt.style.backgroundImage = "url(" + cur.artwork + ")"
        cbAlbumArt.style.display = "block"
      } else {
        cbAlbumArt.style.backgroundImage = ""
        cbAlbumArt.style.display = "none"
      }
    }

    if (heroAlbumArt) {
      if (cur && cur.artwork) {
        heroAlbumArt.style.backgroundImage = "url(" + cur.artwork + ")"
        heroAlbumArt.style.display = "block"
      } else {
        heroAlbumArt.style.display = "none"
      }
    }

    // Update favorite button
    if (cbFavorite && cur) {
      var isFav = favorites.some((f) => f.id === cur.id)
      cbFavorite.textContent = isFav ? "❤" : "♡"
      cbFavorite.style.color = isFav ? "#1db954" : ""
    }

    if (audio) {
      var src = cur && cur.previewUrl ? cur.previewUrl : ""
      if (src) {
        if (audio.src !== src) {
          audio.src = src
          audio.volume = cbVolume ? Number.parseInt(cbVolume.value || "80", 10) / 100 : 0.8
        }
      } else {
        if (!audio.paused) audio.pause()
        audio.removeAttribute("src")
        isPlaying = false
      }
    }

    listEl.innerHTML = ""
    var arr = playlist.toArray()
    arr.forEach((song, index) => {
      var li = document.createElement("li")
      li.setAttribute("data-index", index + 1)
      li.setAttribute("data-song-id", song.id)
      li.setAttribute("draggable", "true")

      // Add album art thumbnail
      var thumb = document.createElement("div")
      thumb.className = "song-thumb"
      if (song.artwork) {
        thumb.style.backgroundImage = "url(" + song.artwork + ")"
      }

      var info = document.createElement("div")
      info.className = "song-info"

      var titleDiv = document.createElement("div")
      titleDiv.className = "song-title"
      titleDiv.textContent = song.title

      var artistDiv = document.createElement("div")
      artistDiv.className = "song-artist"
      artistDiv.textContent = song.artist

      info.appendChild(titleDiv)
      info.appendChild(artistDiv)

      var actions = document.createElement("div")
      actions.className = "song-actions"

      var favBtn = document.createElement("button")
      favBtn.className = "song-fav-btn"
      var isFav = favorites.some((f) => f.id === song.id)
      favBtn.textContent = isFav ? "❤" : "♡"
      favBtn.title = isFav ? "Quitar de favoritos" : "Agregar a favoritos"
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation()
        toggleFavorite(song)
      })

      actions.appendChild(favBtn)

      li.appendChild(thumb)
      li.appendChild(info)
      li.appendChild(actions)

      if (cur && cur.id === song.id) {
        li.style.background = "var(--gray-700)"
        li.style.color = "var(--white)"
      }

      // Drag and drop handlers
      li.addEventListener("dragstart", (e) => {
        draggedIndex = index
        li.style.opacity = "0.5"
        e.dataTransfer.effectAllowed = "move"
      })

      li.addEventListener("dragend", (e) => {
        li.style.opacity = "1"
        draggedIndex = null
      })

      li.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
        li.style.borderTop = "2px solid var(--white)"
      })

      li.addEventListener("dragleave", (e) => {
        li.style.borderTop = ""
      })

      li.addEventListener("drop", (e) => {
        e.preventDefault()
        li.style.borderTop = ""
        if (draggedIndex !== null && draggedIndex !== index) {
          playlist.moveNode(draggedIndex, index)
          render()
        }
      })

      li.addEventListener("click", () => {
        var node = playlist.head
        var idx = 0
        while (node) {
          if (idx === index) {
            playlist._cursor = node
            render()
            playCurrent()
            break
          }
          node = node.next
          idx++
        }
      })

      listEl.appendChild(li)
    })

    var totalSongs = document.getElementById("total-songs")
    if (totalSongs) totalSongs.textContent = arr.length + " canciones"

    // Update playlist counts in sidebar
    updatePlaylistCounts()

    updatePlayButton()
  }

  function toggleFavorite(song) {
    var index = favorites.findIndex((f) => f.id === song.id)
    if (index >= 0) {
      favorites.splice(index, 1)
      playlists.favorites.removeById(song.id)
    } else {
      favorites.push(song)
      playlists.favorites.pushBack(song)
    }
    render()
  }

  function updatePlaylistCounts() {
    var items = document.querySelectorAll(".playlist-item")
    items.forEach((item) => {
      var id = item.getAttribute("data-playlist-id")
      var countEl = item.querySelector(".playlist-count")
      if (countEl && playlists[id]) {
        countEl.textContent = playlists[id]._length + " canciones"
      }
    })
  }

  function createResultCard(item, container) {
    var card = document.createElement("div")
    card.className = "result-card"
    var title = item.trackName || "Sin título"
    var artist = item.artistName || "Desconocido"
    var art = item.artworkUrl100 || item.artworkUrl60 || ""
    var preview = item.previewUrl || ""

    card.innerHTML =
      '<div class="rc-left">' +
      (art
        ? '<img alt="cover" src="' + art + '"/>'
        : '<div style="width:60px;height:60px;background:#282828;border-radius:4px;"></div>') +
      '</div><div class="rc-mid"><div class="rc-title">' +
      title +
      '</div><div class="rc-artist">' +
      artist +
      '</div></div><div class="rc-right"><button class="rc-play">▶</button><button class="rc-add">Añadir</button></div>'

    var playBtn = card.querySelector(".rc-play")
    var addBtn = card.querySelector(".rc-add")

    playBtn.addEventListener("click", () => {
      if (preview && audio) {
        audio.src = preview
        audio.volume = cbVolume ? Number.parseInt(cbVolume.value || "80", 10) / 100 : 0.8
        audio
          .play()
          .then(() => {
            isPlaying = true
            updatePlayButton()
          })
          .catch((e) => {
            console.error("Error al reproducir:", e)
          })
      }
    })

    addBtn.addEventListener("click", () => {
      var song = {
        id: String(item.trackId || Math.random()),
        title: title,
        artist: artist,
        previewUrl: preview,
        artwork: art,
      }
      var playlist = getCurrentPlaylist()
      playlist.pushBack(song)
      render()

      addBtn.textContent = "✓ Añadida"
      addBtn.style.background = "var(--white)"
      addBtn.style.color = "var(--black)"
      setTimeout(() => {
        addBtn.textContent = "Añadir"
        addBtn.style.background = ""
        addBtn.style.color = ""
      }, 1500)
    })

    return card
  }

  function doSearch(term, resultsContainer, btnElement) {
    var q = (term || "").trim()
    if (!q) {
      resultsContainer.innerHTML = '<div class="muted">Escribe algo para buscar</div>'
      if (resultsContainer === searchResults && searchFilters) {
        searchFilters.style.display = "none"
      }
      return
    }

    resultsContainer.innerHTML = '<div class="muted">Buscando…</div>'
    if (btnElement) {
      btnElement.textContent = "Buscando..."
      btnElement.disabled = true
    }

    var url = "https://itunes.apple.com/search?term=" + encodeURIComponent(q) + "&media=music&entity=song&limit=25"

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        var items = (data && data.results) || []
        if (!items.length) {
          resultsContainer.innerHTML = '<div class="muted">Sin resultados en iTunes</div>'
          if (resultsContainer === searchResults && searchFilters) {
            searchFilters.style.display = "none"
          }
          return
        }

        if (resultsContainer === searchResults) {
          searchResultsCache = items
          if (searchFilters) {
            searchFilters.style.display = "flex"
          }
        }

        var frag = document.createDocumentFragment()
        items.forEach((item) => {
          frag.appendChild(createResultCard(item, resultsContainer))
        })

        resultsContainer.innerHTML = ""
        resultsContainer.appendChild(frag)
      })
      .catch((err) => {
        console.error(err)
        resultsContainer.innerHTML = '<div class="muted">Error buscando en iTunes. Intenta de nuevo.</div>'
        if (resultsContainer === searchResults && searchFilters) {
          searchFilters.style.display = "none"
        }
      })
      .finally(() => {
        if (btnElement) {
          btnElement.textContent = "Buscar"
          btnElement.disabled = false
        }
      })
  }

  function playCurrent() {
    var playlist = getCurrentPlaylist()
    var cur = playlist._cursor ? playlist._cursor.value : null
    if (!cur) return

    var src = cur.previewUrl || ""
    if (src && audio) {
      audio.src = src
      audio.volume = cbVolume ? Number.parseInt(cbVolume.value || "80", 10) / 100 : 0.8
      audio
        .play()
        .then(() => {
          isPlaying = true
          updatePlayButton()
          updateFullscreenPlayer()
        })
        .catch((e) => {
          console.error("Error al reproducir:", e)
        })
    }
  }

  function updateFullscreenPlayer() {
    var playlist = getCurrentPlaylist()
    var cur = playlist._cursor ? playlist._cursor.value : null
    if (!cur) return

    var fsTitle = document.getElementById("fs-title")
    var fsArtist = document.getElementById("fs-artist")
    var fsAlbumArt = document.getElementById("fs-album-art")

    if (fsTitle) fsTitle.textContent = cur.title
    if (fsArtist) fsArtist.textContent = cur.artist
    if (fsAlbumArt && cur.artwork) {
      fsAlbumArt.style.backgroundImage = "url(" + cur.artwork + ")"
    }
  }

  function readSong() {
    var title = (titleInput.value || "").trim()
    var artist = (artistInput.value || "").trim() || "Desconocido"
    if (!title) {
      alert("Por favor ingresa un título de canción")
      return null
    }
    return { id: uid(), title: title, artist: artist }
  }

  function clearInputs() {
    titleInput.value = ""
    artistInput.value = ""
    positionInput.value = ""
  }

  addStartBtn.addEventListener("click", () => {
    var s = readSong()
    if (!s) return
    var playlist = getCurrentPlaylist()
    playlist.pushFront(s)
    render()
    clearInputs()

    addStartBtn.textContent = "✓ Agregada"
    setTimeout(() => {
      addStartBtn.textContent = "Agregar al inicio"
    }, 1000)
  })

  addEndBtn.addEventListener("click", () => {
    var s = readSong()
    if (!s) return
    var playlist = getCurrentPlaylist()
    playlist.pushBack(s)
    render()
    clearInputs()

    addEndBtn.textContent = "✓ Agregada"
    setTimeout(() => {
      addEndBtn.textContent = "Agregar al final"
    }, 1000)
  })

  addAtBtn.addEventListener("click", () => {
    var s = readSong()
    if (!s) return
    var pos = Number.parseInt(positionInput.value, 10)
    if (isFinite(pos) && pos > 0) {
      var playlist = getCurrentPlaylist()
      playlist.insertAt(s, pos)
    } else {
      alert("Por favor ingresa una posición válida")
      return
    }
    render()
    clearInputs()

    addAtBtn.textContent = "✓ Agregada"
    setTimeout(() => {
      addAtBtn.textContent = "Agregar en posición"
    }, 1000)
  })

  removeBtn.addEventListener("click", () => {
    var playlist = getCurrentPlaylist()
    if (!playlist._cursor) {
      alert("No hay ninguna canción seleccionada para eliminar")
      return
    }
    var removed = playlist.removeCursor()
    if (removed) {
      if (audio && !audio.paused) {
        audio.pause()
        isPlaying = false
      }
      render()

      removeBtn.textContent = "✓ Eliminada"
      setTimeout(() => {
        removeBtn.textContent = "Eliminar canción actual"
      }, 1000)
    }
  })

  nextBtn.addEventListener("click", () => {
    var playlist = getCurrentPlaylist()
    if (!playlist._cursor || !playlist._cursor.next) {
      alert("No hay siguiente canción")
      return
    }
    playlist.moveNext()
    render()
    playCurrent()
  })

  prevBtn.addEventListener("click", () => {
    var playlist = getCurrentPlaylist()
    if (!playlist._cursor || !playlist._cursor.prev) {
      alert("No hay canción anterior")
      return
    }
    playlist.movePrev()
    render()
    playCurrent()
  })

  if (playCurrentBtn) {
    playCurrentBtn.addEventListener("click", () => {
      var playlist = getCurrentPlaylist()
      var cur = playlist._cursor ? playlist._cursor.value : null
      if (!cur) {
        alert("No hay ninguna canción seleccionada")
        return
      }

      var src = cur.previewUrl || ""
      if (src && audio) {
        if (audio.src !== src) audio.src = src
        if (audio.paused) {
          audio.volume = cbVolume ? Number.parseInt(cbVolume.value || "80", 10) / 100 : 0.8
          audio
            .play()
            .then(() => {
              isPlaying = true
              updatePlayButton()
              updateFullscreenPlayer()
            })
            .catch((e) => {
              console.error("Error:", e)
            })
        } else {
          audio.pause()
          isPlaying = false
          updatePlayButton()
        }
      } else {
        alert("Esta canción no tiene preview disponible")
      }
    })
  }

  if (playAllBtn) {
    playAllBtn.addEventListener("click", () => {
      var playlist = getCurrentPlaylist()
      if (playlist._length === 0) {
        alert("La lista está vacía. Agrega canciones primero.")
        return
      }

      var cur = playlist._cursor ? playlist._cursor.value : null
      var src = cur && cur.previewUrl

      if (src) {
        playCurrent()
      } else {
        var moved = false
        var guard = 0
        var startNode = playlist._cursor
        while (guard < playlist._length) {
          playlist.moveNext()
          guard++
          var c = playlist._cursor ? playlist._cursor.value : null
          var s = c && c.previewUrl
          if (s) {
            render()
            audio.play().then(() => {
              isPlaying = true
              updatePlayButton()
              updateFullscreenPlayer()
            })
            return
          }
          if (playlist._cursor === startNode) break
        }
        if (!moved) alert("No hay canciones con preview disponible en la lista.")
      }
    })
  }

  if (audio) {
    audio.addEventListener("ended", () => {
      isPlaying = false
      updatePlayButton()

      var playlist = getCurrentPlaylist()
      var guard = 0
      var startNode = playlist._cursor
      while (guard < playlist._length) {
        playlist.moveNext()
        guard++
        var c = playlist._cursor ? playlist._cursor.value : null
        var s = c && c.previewUrl
        if (s) {
          render()
          audio.play().then(() => {
            isPlaying = true
            updatePlayButton()
            updateFullscreenPlayer()
          })
          return
        }
        if (playlist._cursor === startNode) break
      }
    })

    audio.addEventListener("play", () => {
      isPlaying = true
      updatePlayButton()
    })

    audio.addEventListener("pause", () => {
      isPlaying = false
      updatePlayButton()
    })

    audio.addEventListener("timeupdate", () => {
      updateProgress()
    })
    audio.addEventListener("loadedmetadata", () => {
      updateProgress()
    })
  }

  function formatTime(s) {
    if (!isFinite(s)) return "0:00"
    var m = Math.floor(s / 60)
    var sec = Math.floor(s % 60)
    return m + ":" + String(sec).padStart(2, "0")
  }

  function updateProgress() {
    if (audio) {
      var curT = audio.currentTime || 0
      var d = audio.duration || 0
      if (d > 0) {
        cbProgress.value = String((curT / d) * 100)
        var cbTimeCurrent = document.getElementById("cb-time-current")
        var cbTimeTotal = document.getElementById("cb-time-total")
        if (cbTimeCurrent) cbTimeCurrent.textContent = formatTime(curT)
        if (cbTimeTotal) cbTimeTotal.textContent = formatTime(d)
      }
    }
  }

  if (cbPrev) {
    cbPrev.addEventListener("click", () => {
      prevBtn.click()
    })
  }

  if (cbNext) {
    cbNext.addEventListener("click", () => {
      nextBtn.click()
    })
  }

  if (cbPlay) {
    cbPlay.addEventListener("click", () => {
      var playlist = getCurrentPlaylist()
      if (!playlist._cursor) {
        alert("No hay ninguna canción seleccionada")
        return
      }
      if (audio) {
        if (audio.paused) {
          var cur = playlist._cursor ? playlist._cursor.value : null
          if (!cur || !cur.previewUrl) {
            alert("Esta canción no tiene preview disponible")
            return
          }
          audio.volume = cbVolume ? Number.parseInt(cbVolume.value || "80", 10) / 100 : 0.8
          audio
            .play()
            .then(() => {
              isPlaying = true
              updatePlayButton()
              updateFullscreenPlayer()
            })
            .catch((e) => {
              console.error("Error:", e)
            })
        } else {
          audio.pause()
          isPlaying = false
          updatePlayButton()
        }
      }
    })
  }

  if (cbVolume) {
    cbVolume.addEventListener("input", () => {
      var v = Number.parseInt(cbVolume.value || "80", 10) / 100
      if (audio) audio.volume = v
    })
  }

  if (cbProgress) {
    cbProgress.addEventListener("input", () => {
      var p = Number.parseFloat(cbProgress.value || "0") / 100
      if (audio) {
        var d = audio.duration || 0
        if (d > 0) audio.currentTime = p * d
      }
    })
  }

  if (cbFavorite) {
    cbFavorite.addEventListener("click", () => {
      var playlist = getCurrentPlaylist()
      var cur = playlist._cursor ? playlist._cursor.value : null
      if (cur) {
        toggleFavorite(cur)
      }
    })
  }

  if (cbFullscreen) {
    cbFullscreen.addEventListener("click", () => {
      var playlist = getCurrentPlaylist()
      var cur = playlist._cursor ? playlist._cursor.value : null
      if (cur && isPlaying) {
        updateFullscreenPlayer()
        fullscreenPlayer.classList.add("active")
      }
    })
  }

  if (fsClose) {
    fsClose.addEventListener("click", () => {
      fullscreenPlayer.classList.remove("active")
    })
  }

  var navItems = document.querySelectorAll(".library-nav li")
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      var nav = item.getAttribute("data-nav")

      // Hide all sections first
      sidebarSearch.style.display = "none"
      document.querySelector(".library-lists").style.display = "flex"

      if (nav === "search") {
        sidebarSearch.style.display = "block"
        document.querySelector(".library-lists").style.display = "none"
      } else if (nav === "create") {
        createPlaylistModal.style.display = "flex"
      }
    })
  })

  if (sidebarSearchBtn) {
    sidebarSearchBtn.addEventListener("click", () => {
      doSearch(sidebarSearchTerm.value, sidebarSearchResults, sidebarSearchBtn)
    })
  }

  if (sidebarSearchTerm) {
    sidebarSearchTerm.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        doSearch(sidebarSearchTerm.value, sidebarSearchResults, sidebarSearchBtn)
      }
    })
  }

  if (newPlaylistBtn) {
    newPlaylistBtn.addEventListener("click", () => {
      createPlaylistModal.style.display = "flex"
    })
  }

  if (confirmPlaylist) {
    confirmPlaylist.addEventListener("click", () => {
      var name = (newPlaylistName.value || "").trim()
      if (!name) {
        alert("Por favor ingresa un nombre para la playlist")
        return
      }

      var id = "playlist_" + uid()
      playlists[id] = new DoublyLinkedList()
      customPlaylists.push({ id: id, name: name })

      var container = document.getElementById("playlists-container")
      var item = document.createElement("div")
      item.className = "playlist-item"
      item.setAttribute("data-playlist-id", id)
      item.innerHTML =
        '<div class="playlist-thumb"></div><div class="playlist-info"><div class="playlist-name">' +
        name +
        '</div><div class="playlist-count">0 canciones</div></div><button class="playlist-delete-btn" title="Eliminar playlist">×</button>'

      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("playlist-delete-btn")) return

        document.querySelectorAll(".playlist-item").forEach((p) => {
          p.classList.remove("active")
        })
        item.classList.add("active")
        currentPlaylistId = id

        var heroTitle = document.getElementById("hero-title")
        if (heroTitle) heroTitle.textContent = name

        render()
      })

      var deleteBtn = item.querySelector(".playlist-delete-btn")
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation()

        if (confirm("¿Estás seguro de que quieres eliminar esta playlist?")) {
          // Remove from DOM
          item.remove()

          // Remove from data structures
          delete playlists[id]
          var index = customPlaylists.findIndex((p) => p.id === id)
          if (index >= 0) {
            customPlaylists.splice(index, 1)
          }

          // Switch to main playlist if deleted playlist was active
          if (currentPlaylistId === id) {
            currentPlaylistId = "main"
            var mainItem = document.querySelector('[data-playlist-id="main"]')
            if (mainItem) {
              document.querySelectorAll(".playlist-item").forEach((p) => {
                p.classList.remove("active")
              })
              mainItem.classList.add("active")

              var heroTitle = document.getElementById("hero-title")
              if (heroTitle) heroTitle.textContent = "Lista de reproducción de canciones"
            }
            render()
          }
        }
      })

      container.appendChild(item)

      createPlaylistModal.style.display = "none"
      newPlaylistName.value = ""
    })
  }

  if (cancelPlaylist) {
    cancelPlaylist.addEventListener("click", () => {
      createPlaylistModal.style.display = "none"
      newPlaylistName.value = ""
    })
  }

  var playlistItems = document.querySelectorAll(".playlist-item")
  playlistItems.forEach((item) => {
    item.addEventListener("click", () => {
      playlistItems.forEach((p) => {
        p.classList.remove("active")
      })
      item.classList.add("active")

      var id = item.getAttribute("data-playlist-id")
      currentPlaylistId = id

      var heroTitle = document.getElementById("hero-title")
      var heroType = document.getElementById("hero-type")

      if (id === "favorites") {
        if (heroTitle) heroTitle.textContent = "❤️ Favoritos"
        if (heroType) heroType.textContent = "Playlist de favoritos"
      } else if (id === "main") {
        if (heroTitle) heroTitle.textContent = "Lista de reproducción de canciones"
        if (heroType) heroType.textContent = "Playlist"
      } else {
        var custom = customPlaylists.find((p) => p.id === id)
        if (custom && heroTitle) heroTitle.textContent = custom.name
        if (heroType) heroType.textContent = "Playlist"
      }

      render()
    })
  })

  if (ytKeyInput) ytKeyInput.style.display = "none"
  if (ytKeySave) ytKeySave.style.display = "none"
  if (ytPlayerContainer) ytPlayerContainer.style.display = "none"

  if (searchBtn) {
    searchBtn.addEventListener("click", () => {
      doSearch(searchTerm.value, searchResults, searchBtn)
    })
  }

  if (searchTerm) {
    searchTerm.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch(searchTerm.value, searchResults, searchBtn)
    })
  }

  if (searchFilters) {
    var filterTabs = searchFilters.querySelectorAll(".filter-tab")
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        filterTabs.forEach((t) => t.classList.remove("active"))
        tab.classList.add("active")

        var filter = tab.getAttribute("data-filter")
        // For now, just show all results (can be enhanced later)
        if (searchResultsCache.length > 0) {
          var frag = document.createDocumentFragment()
          searchResultsCache.forEach((item) => {
            frag.appendChild(createResultCard(item, searchResults))
          })
          searchResults.innerHTML = ""
          searchResults.appendChild(frag)
        }
      })
    })
  }

  playlists.main.pushBack({ id: uid(), title: "Intro", artist: "DJ Start" })
  playlists.main.pushBack({ id: uid(), title: "Canción 2", artist: "La Banda" })
  playlists.main.pushBack({ id: uid(), title: "Finale", artist: "Cierre" })
  render()
})()
