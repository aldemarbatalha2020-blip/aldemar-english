// Ícones em SVG (traço arredondado, herdam a cor do texto). Uso: Mods.ic('mic', 22) devolve um elemento <span class="ic">.
(function () {
  'use strict';
  var M = window.Mods = window.Mods || {};
  var P = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13 21 3"/>',
    camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3z"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    flip: '<path d="M4 8V5h3M20 16v3h-3"/><path d="M5.5 9A8 8 0 0 1 19 7M18.5 15A8 8 0 0 1 5 17"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.5 4.5 0 0 1 12 7.2 4.5 4.5 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    comment: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
    share: '<path d="M4 12v7h16v-7M12 15V3M7.5 7.5 12 3l4.5 4.5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
    more: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
    play: '<path d="M7 4.5v15l13-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    chevup: '<path d="m6 15 6-6 6 6"/>',
    chevleft: '<path d="m15 6-6 6 6 6"/>',
    game: '<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10v5M5.5 12.5h5M15.5 11.5h.01M18 13.5h.01"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.5A6 6 0 0 1 21 20"/>',
    bolt: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
    poll: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 17h.01"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
    gift: '<rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M12 9v11M3 13h18M12 9C9 9 7 7.5 8 6s4 .5 4 3c0-2.5 3-4.500 4-3s-1 3-4 3z"/>',
    star: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.500 9.700l5.900-.8z"/>',
    live: '<circle cx="12" cy="12" r="2.2"/><path d="M7.500 7.500a6.400 6.400 0 0 0 0 9M16.500 7.500a6.400 6.400 0 0 1 0 9M4.800 4.800a10.200 10.200 0 0 0 0 14.400M19.200 4.800a10.200 10.200 0 0 1 0 14.400"/>',
    film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9h18M8 4l3 5M13 4l3 5"/>',
    circle: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>',
    download: '<path d="M12 4v11M7.500 10.500 12 15l4.500-4.500M5 20h14"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8.500 14a4 4 0 0 0 7 0M9 9.500h.01M15 9.500h.01"/>',
  };
  function ic(nome, tam, cheio) {
    var s = document.createElement('span'); s.className = 'ic'; s.setAttribute('aria-hidden', 'true');
    var t = tam || 22;
    s.innerHTML = '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" fill="' + (cheio ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + (P[nome] || '') + '</svg>';
    return s;
  }
  M.ic = ic;
})();
