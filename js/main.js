/* =========================================================
   НАСТРОЙКИ САЙТА.
   Цены, тексты и контакты Виктория меняет в Google Таблице (ссылка в README).
   Значения ниже — запасные: сайт покажет их, если таблица не откроется.
   Меняйте только текст между кавычками '…'.
   ========================================================= */
var SETTINGS = {
  // Google Таблица с ценами, текстами и контактами: её номер из ссылки
  // docs.google.com/spreadsheets/d/<номер>/edit. Пустые кавычки '' — таблица не используется.
  sheet: '1zfPmFc4208Ct0cdfrfNAF45_XxgTXNGnjG2EpyzpkpY',

  // Группа ВКонтакте
  vk: 'https://vk.ru/club104990443',

  // Max. TODO: ссылки пока нет. Её можно вписать в таблицу (вкладка «Контакты и график»)
  // или сюда, например 'https://max.ru/…'. Пока пусто, кнопка Max на сайте не показывается.
  max: '',

  // Телефон так, как его видно на сайте. Ссылка для звонка соберётся сама.
  phone: '+7 921 577-71-39',

  // Адрес
  address: 'Большая Вруда, д. 51',
  entrance: 'Вход со стороны аптеки',

  // Дом на Яндекс Картах (ссылка «Открыть на Яндекс Картах» под адресом).
  // Если поставить пустые кавычки '', ссылка пропадёт с сайта.
  map: 'https://yandex.ru/maps/?pt=29.243711,59.407097&z=17&l=map',

  // График работы. Пока пусто, строки «График» на сайте нет.
  hours: ''
};

/* =========================================================
   Дальше код сайта. Его менять не нужно.
   ========================================================= */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || doc).querySelectorAll(selector));
  }

  /* ---------- 1. Контакты из SETTINGS ---------- */

  function cleanUrl(value) {
    var s = String(value || '').trim();
    return /^https?:\/\/[^\s]+\.[^\s]+/i.test(s) ? s : '';
  }

  function phoneHref(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.charAt(0) === '8') digits = '7' + digits.slice(1);
    return digits.length >= 10 ? 'tel:+' + digits : '';
  }

  // Неразрывный пробел после коротких слов («в Большой», «на маникюр»), чтобы они
  // не оставались в конце строки, и после «д.» и «№»
  function typo(text) {
    var s = String(text);
    for (var i = 0; i < 2; i++) {
      s = s.replace(/(^|[\s«(„"])([а-яёА-ЯЁa-zA-Z]{1,2}\.?|№)[ \t]+/g, '$1$2 ');
    }
    return s;
  }

  var links = {};

  function applyContacts() {
    links = {
      vk: cleanUrl(SETTINGS.vk),
      max: cleanUrl(SETTINGS.max),
      map: cleanUrl(SETTINGS.map),
      phone: phoneHref(SETTINGS.phone)
    };

    $all('[data-link]').forEach(function (el) {
      var url = links[el.getAttribute('data-link')];
      if (url) {
        el.setAttribute('href', url);
        if (el.hasAttribute('data-optional')) el.hidden = false;
      } else if (el.hasAttribute('data-optional')) {
        el.hidden = true;
      }
    });

    $all('[data-text]').forEach(function (el) {
      var text = String(SETTINGS[el.getAttribute('data-text')] || '').trim();
      if (text) {
        el.textContent = typo(text);
        if (el.hasAttribute('data-optional')) el.hidden = false;
      } else if (el.hasAttribute('data-optional')) {
        el.hidden = true;
      }
    });

    // Max показываем только когда есть настоящая ссылка
    $all('[data-max-only]').forEach(function (el) {
      el.hidden = !links.max;
    });

    // строка «График» — только когда график вписан
    $all('[data-hours-row]').forEach(function (el) {
      el.hidden = !String(SETTINGS.hours || '').trim();
    });
  }

  applyContacts();

  $all('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- 1а. Данные для поисковиков: телефон, ссылки и цены ---------- */

  function updateSchema() {
    var script = doc.getElementById('ld-json');
    if (!script) return;
    try {
      var data = JSON.parse(script.textContent);
      if (links.phone) data.telephone = links.phone.replace('tel:', '');
      if (SETTINGS.address) data.address.streetAddress = String(SETTINGS.address).trim();
      data.sameAs = [links.vk, links.max].filter(Boolean);
      if (links.map) data.hasMap = links.map; else delete data.hasMap;
      if (/^https?:$/.test(location.protocol)) {
        data.url = location.href.split('#')[0];
        data.image = new URL('img/og.jpg', location.href).href;
      }

      var prices = [];
      var offers = $all('.menu__row').map(function (row) {
        var nameEl = row.querySelector('.menu__name').cloneNode(true);
        $all('.menu__no', nameEl).forEach(function (n) { n.parentNode.removeChild(n); });
        var name = nameEl.textContent.replace(/\s+/g, ' ').trim();
        var sumEl = row.querySelector('.menu__sum');
        var sum = sumEl && !sumEl.classList.contains('menu__sum--word')
          ? parseInt(sumEl.textContent.replace(/\D/g, ''), 10) : NaN;
        var from = !!row.querySelector('.menu__from');
        var offer = { '@type': 'Offer', priceCurrency: 'RUB', itemOffered: { '@type': 'Service', name: name } };
        if (!isNaN(sum)) {
          prices.push(sum);
          if (from) offer.priceSpecification = { '@type': 'PriceSpecification', minPrice: sum, priceCurrency: 'RUB' };
          else offer.price = sum;
        }
        return offer;
      });
      if (offers.length) {
        data.hasOfferCatalog = { '@type': 'OfferCatalog', name: 'Услуги и цены', itemListElement: offers };
      }
      if (prices.length) {
        var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
        var lo = Math.min.apply(null, prices), hi = Math.max.apply(null, prices);
        data.priceRange = (lo === hi ? fmt(lo) : fmt(lo) + '–' + fmt(hi)) + ' ₽';
      }
      script.textContent = JSON.stringify(data);
    } catch (e) { /* если что-то пошло не так, остаются данные из index.html */ }
  }

  /* ---------- 1б. Цены, тексты, подписи к фото и контакты из Google Таблицы ----------
     Сайт читает таблицу при каждом открытии. Пока она грузится, показывает то,
     что видел в прошлый раз (запоминает в браузере), а если таблица не откроется —
     то, что записано в index.html и в SETTINGS выше. */

  var TABS = {
    services: { name: 'Услуги', head: 'Услуга' },
    texts: { name: 'Тексты', head: 'Поле' },
    photos: { name: 'Фото', head: '№' },
    contacts: { name: 'Контакты и график', head: 'Поле' }
  };

  // левый столбик вкладки «Тексты» → место на сайте (data-copy="…")
  var TEXT_FIELDS = {
    'Обложка: строка над названием': 'kicker',
    'Обложка: текст под названием': 'lead',
    'Обложка: подпись под фото': 'hero-caption',
    'Цитата': 'quote',
    'Цены: подзаголовок': 'prices-lead',
    'Цены: строка под подзаголовком': 'prices-aside',
    'Работы: подзаголовок': 'works-lead'
  };

  // левый столбик вкладки «Контакты и график» → SETTINGS; empty: пустая ячейка убирает строку с сайта
  var CONTACT_FIELDS = {
    'ВКонтакте': { key: 'vk' },
    'Max': { key: 'max', empty: true },
    'Телефон': { key: 'phone' },
    'Адрес': { key: 'address' },
    'Как найти вход': { key: 'entrance', empty: true },
    'Ссылка на карту': { key: 'map', empty: true },
    'График работы': { key: 'hours', empty: true }
  };

  var NUMBERS = ['', 'Одна', 'Две', 'Три', 'Четыре', 'Пять', 'Шесть', 'Семь', 'Восемь', 'Девять', 'Десять',
    'Одиннадцать', 'Двенадцать', 'Тринадцать', 'Четырнадцать', 'Пятнадцать'];
  var ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

  function servicesPhrase(n) {
    var a = n % 10, b = n % 100;
    var word = a === 1 && b !== 11 ? 'услуга' : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'услуги' : 'услуг');
    return (NUMBERS[n] || String(n)) + ' ' + word;
  }

  function el(tag, cls, text) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // текст со *звёздочками* → наклонные слова
  function fill(node, text) {
    while (node.firstChild) node.removeChild(node.firstChild);
    String(text).split(/\*([^*]+)\*/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2) node.appendChild(el('em', '', typo(part)));
      else node.appendChild(doc.createTextNode(typo(part)));
    });
  }

  function parseCsv(text) {
    var rows = [], row = [], cell = '', quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text.charAt(i);
      if (quoted) {
        if (c === '"') {
          if (text.charAt(i + 1) === '"') { cell += '"'; i++; } else quoted = false;
        } else cell += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text.charAt(i + 1) === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // строки вкладки без заголовка; null, если это не та вкладка
  function body(rows, tab) {
    if (!rows || !rows.length || String(rows[0][0] || '').trim() !== tab.head) return null;
    return rows.slice(1).map(function (r) {
      return r.map(function (v) { return String(v == null ? '' : v).trim(); });
    });
  }

  // «1 200 ₽», «от 2 200 ₽», «бесплатно» → части цены
  function priceParts(raw) {
    var s = String(raw).replace(/[\s ]+/g, ' ').trim();
    var from = /^от\s/i.test(s);
    var rest = s.replace(/^от\s+/i, '').replace(/\s*(₽|руб(лей|\.)?|р\.)\s*$/i, '').trim();
    var digits = rest.replace(/\s/g, '');
    if (/^\d+$/.test(digits)) {
      return { from: from, sum: digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') };
    }
    return { word: s };
  }

  function buildMenu(rows) {
    var menu = doc.querySelector('.menu');
    if (!menu) return 0;
    // строка попадает на сайт, когда есть название и цена, а в «Показывать» не «нет»
    var list = rows.filter(function (r) {
      return r[0] && r[2] && String(r[3] || '').toLowerCase() !== 'нет';
    });
    if (!list.length) return 0;   // пустая вкладка — оставляем прежний прайс
    var frag = doc.createDocumentFragment();
    list.forEach(function (r, i) {
      var li = el('li', 'menu__row');
      var name = el('span', 'menu__name');
      var no = el('span', 'menu__no', ROMAN[i] || String(i + 1));
      no.setAttribute('aria-hidden', 'true');
      name.appendChild(no);
      // слова в скобках — наклонные, как «(обработка)»
      r[0].split(/(\([^)]*\))/).forEach(function (part) {
        if (!part) return;
        if (part.charAt(0) === '(') name.appendChild(el('em', '', typo(part)));
        else name.appendChild(doc.createTextNode(typo(part)));
      });
      var dots = el('span', 'menu__dots');
      dots.setAttribute('aria-hidden', 'true');
      var price = el('span', 'menu__price');
      var p = priceParts(r[2] || '');
      if (p.word !== undefined) {
        price.appendChild(el('span', 'menu__sum menu__sum--word', p.word));
      } else {
        if (p.from) {
          price.appendChild(el('em', 'menu__from', 'от'));
          price.appendChild(doc.createTextNode(' '));
        }
        price.appendChild(el('span', 'menu__sum', p.sum));
        price.appendChild(el('span', 'menu__cur', '₽'));
      }
      li.appendChild(name);
      li.appendChild(dots);
      li.appendChild(price);
      if (r[1]) li.appendChild(el('span', 'menu__note', typo(r[1])));
      frag.appendChild(li);
    });
    while (menu.firstChild) menu.removeChild(menu.firstChild);
    menu.appendChild(frag);
    return list.length;
  }

  // «Пять услуг» в оглавлении и в подзаголовке прайса — по числу строк в прайсе
  function updateCounts() {
    var n = $all('.menu__row').length;
    if (!n) return;
    var phrase = servicesPhrase(n);
    $all('[data-count="services"]').forEach(function (node) { node.textContent = phrase; });
    var lead = doc.querySelector('[data-copy="prices-lead"]');
    var first = lead && lead.firstChild;
    if (first && first.nodeType === 3) {
      first.nodeValue = first.nodeValue.replace(/^(\S+)[\s ]+услуг[аи]?(?=[\s :.,;—–-]|$)/i, function (all, w) {
        var known = /^\d+$/.test(w) || NUMBERS.some(function (x) { return x && x.toLowerCase() === w.toLowerCase(); });
        return known ? phrase.replace(' ', ' ') : all;
      });
    }
  }

  function applySheet(data) {
    if (!data) return;

    var texts = body(data.texts, TABS.texts);
    if (texts) texts.forEach(function (r) {
      var key = TEXT_FIELDS[r[0]];
      if (!key || !r[1]) return;
      $all('[data-copy="' + key + '"]').forEach(function (node) { fill(node, r[1]); });
    });

    var services = body(data.services, TABS.services);
    if (services) buildMenu(services);
    updateCounts();

    var photos = body(data.photos, TABS.photos);
    if (photos) photos.forEach(function (r) {
      var n = parseInt(r[0], 10);
      if (!(n > 0)) return;
      var file = 'img/' + (n < 10 ? '0' : '') + n + '.jpg';
      if (r[1]) $all('[data-shot][href="' + file + '"]').forEach(function (link) {
        link.setAttribute('data-title', r[1]);
        var t = link.querySelector('.shot__title');
        if (t) t.textContent = typo(r[1]);
      });
      if (r[2]) $all('img[src="' + file + '"]').forEach(function (img) { img.setAttribute('alt', r[2]); });
    });

    var contacts = body(data.contacts, TABS.contacts);
    if (contacts) {
      contacts.forEach(function (r) {
        var f = CONTACT_FIELDS[r[0]];
        if (f && (r[1] || f.empty)) SETTINGS[f.key] = r[1] || '';
      });
      applyContacts();
    }

    updateSchema();
  }

  var CACHE_KEY = 'manicure-vr-sheet-v1';

  function loadSheet() {
    var id = String(SETTINGS.sheet || '').trim();
    if (!id || !window.fetch || !window.Promise) return;

    var cached = null;
    var saved = {};
    try { cached = window.localStorage.getItem(CACHE_KEY); } catch (e) { /* браузер не даёт хранить */ }
    if (cached) {
      try { saved = JSON.parse(cached) || {}; applySheet(saved); } catch (e) { cached = null; saved = {}; }
    }

    var keys = Object.keys(TABS);
    Promise.all(keys.map(function (k) {
      var url = 'https://docs.google.com/spreadsheets/d/' + encodeURIComponent(id) +
        '/gviz/tq?tqx=out:csv&headers=1&sheet=' + encodeURIComponent(TABS[k].name);
      var timer = null;
      var timeout = new Promise(function (resolve) { timer = window.setTimeout(function () { resolve(null); }, 10000); });
      var request = fetch(url, { cache: 'no-store', credentials: 'omit' })
        .then(function (res) { return res.ok ? res.text() : null; })
        .then(function (text) { return text ? parseCsv(text) : null; })
        .catch(function () { return null; });
      return Promise.race([request, timeout]).then(function (rows) { window.clearTimeout(timer); return rows; });
    })).then(function (results) {
      // вкладка, которая сейчас не загрузилась, остаётся такой, как в прошлый раз
      var data = {};
      var any = false;
      keys.forEach(function (k, i) {
        if (body(results[i], TABS[k])) { data[k] = results[i]; any = true; }
        else if (saved[k]) data[k] = saved[k];
      });
      if (!any) return;
      var fresh = JSON.stringify(data);
      if (fresh === cached) return;    // в таблице ничего не поменялось
      applySheet(data);
      try { window.localStorage.setItem(CACHE_KEY, fresh); } catch (e) { /* ничего */ }
      // журнал пересчитает высоту страниц под новый текст
      window.dispatchEvent(new Event('resize'));
    });
  }

  updateSchema();
  loadSheet();

  /* ---------- 2. Если webp-файла нет, показываем jpg ---------- */

  function useJpeg(img) {
    var picture = img.parentNode;
    if (!picture || picture.nodeName !== 'PICTURE') return;
    $all('source', picture).forEach(function (source) { picture.removeChild(source); });
    var link = img.closest('[data-shot]');
    if (link) link.setAttribute('data-no-webp', '');
  }

  $all('picture img').forEach(function (img) {
    img.addEventListener('error', function () { useJpeg(img); });
    if (img.complete && img.naturalWidth === 0 && img.currentSrc && /\.webp(\?|$)/i.test(img.currentSrc)) {
      useJpeg(img);
    }
  });

  /* ---------- 3. Кнопка «Записаться» внизу на телефоне ----------
     Прячется, когда видны кнопки на обложке или журнал: у журнала свои кнопки
     и вкладка «Запись», а нижняя кнопка закрывала бы их. */

  var dock = doc.querySelector('.dock');
  var magState = { onContact: false };
  var dockSeen = { hero: false, mag: false };

  function setDock(show) {
    if (!dock) return;
    dock.classList.toggle('is-hidden', !show);
    if (show) {
      dock.removeAttribute('aria-hidden');
      dock.removeAttribute('tabindex');
    } else {
      dock.setAttribute('aria-hidden', 'true');
      dock.setAttribute('tabindex', '-1');
    }
  }

  function updateDock() {
    setDock(!(dockSeen.hero || dockSeen.mag));
  }

  if (dock && 'IntersectionObserver' in window) {
    var heroActions = doc.querySelector('.hero .actions');
    var magBlock = doc.querySelector('.mag');
    var dockIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === heroActions) dockSeen.hero = entry.isIntersecting;
        if (entry.target === magBlock) dockSeen.mag = entry.isIntersecting;
      });
      updateDock();
    });
    [heroActions, magBlock].forEach(function (el) { if (el) dockIo.observe(el); });
  }

  /* ---------- 3а. Журнал: страницы листаются ----------
     Все страницы лежат стопкой в одной рамке. Верхнюю можно:
     • потянуть за правый нижний уголок (или нажать на него) — откроется следующая;
     • потянуть за левый нижний уголок (или нажать) — вернётся предыдущая;
     • провести пальцем по странице влево или вправо;
     • перелистнуть стрелками и вкладками под журналом или клавишами ← →.
     Сгиб считается как у настоящего листа: уголок отражается через линию сгиба,
     а тени появляются только на сгибе и только пока лист в движении. */

  (function magazine() {
    var book = doc.querySelector('[data-book]');
    if (!book) return;
    var pages = $all('.page', book);
    var mag = book.closest('.mag');
    if (pages.length < 2 || !mag) return;

    var nav = mag.querySelector('.mag__nav');
    var hint = mag.querySelector('.mag__hint');
    var status = mag.querySelector('[data-mag-status]');
    var btnPrev = mag.querySelector('[data-mag-prev]');
    var btnNext = mag.querySelector('[data-mag-next]');
    var tabs = $all('[data-mag-go]', mag);
    var masthead = doc.querySelector('.masthead');

    var REST = 22;      // отогнутый уголок в покое, px
    var PEEK = 72;      // насколько уголок приподнимается при наведении
    var TURN_MS = 950;  // время переворота
    var animated = !reduceMotion.matches && !!window.requestAnimationFrame;

    var idx = 0;
    var W = 0;
    var H = 0;
    var busy = false;
    var top = null;
    var P = null;
    var raf = null;
    var safety = null;
    var drag = null;
    var pending = null;
    var suppressClick = false;

    var ids = {};
    pages.forEach(function (pg, i) { if (pg.id) ids[pg.id] = i; });

    function make(cls, parent) {
      var d = doc.createElement('div');
      d.className = cls;
      d.setAttribute('aria-hidden', 'true');
      (parent || book).appendChild(d);
      return d;
    }
    var shadow = make('flip-shadow');
    var flap = make('flip-flap');
    var flapShade = make('flip-flap__shade', flap);
    var cornerNext = make('mag__corner mag__corner--next');
    var cornerPrev = make('mag__corner mag__corner--prev');

    book.classList.add('is-ready');
    if (nav) nav.hidden = false;
    if (hint) hint.hidden = false;

    if (location.hash && location.hash.slice(1) in ids) idx = ids[location.hash.slice(1)];

    /* --- высота журнала: страница целиком на экране, но не меньше содержимого --- */
    function layout() {
      var mobile = window.innerWidth < 720;
      var avail = window.innerHeight - (masthead ? masthead.offsetHeight : 0) -
        (nav ? nav.offsetHeight : 0) - (mobile ? 56 + 44 : 72);
      var target = Math.max(mobile ? 480 : 500, Math.min(avail, 900));
      book.style.height = target + 'px';
      var need = 0;
      pages.forEach(function (pg) { need = Math.max(need, pg.scrollHeight); });
      if (need > target + 1) book.style.height = Math.ceil(need) + 'px';
      W = book.clientWidth;
      H = book.clientHeight;
      flap.style.width = W + 'px';
      flap.style.height = H + 'px';
      if (!busy && !drag) setIdle();
    }

    /* --- геометрия сгиба --- */
    function constrain(p) {
      // лист держится за левый край: нижний уголок не дальше ширины листа от корешка,
      // верхний — не дальше диагонали
      var bx = p.x, by = p.y - H, d = Math.sqrt(bx * bx + by * by);
      if (d > W) p = { x: bx * W / d, y: H + by * W / d };
      var D = Math.sqrt(W * W + H * H), t = Math.sqrt(p.x * p.x + p.y * p.y);
      if (t > D) p = { x: p.x * D / t, y: p.y * D / t };
      return p;
    }

    function cut(M, n, sign) {
      // часть прямоугольника страницы по одну сторону линии сгиба
      var pts = [[0, 0], [W, 0], [W, H], [0, H]], out = [];
      function side(q) { return ((q[0] - M.x) * n.x + (q[1] - M.y) * n.y) * sign; }
      for (var i = 0; i < 4; i++) {
        var a = pts[i], b = pts[(i + 1) % 4], sa = side(a), sb = side(b);
        if (sa >= 0) out.push(a);
        if ((sa >= 0) !== (sb >= 0)) {
          var k = sa / (sa - sb);
          out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
        }
      }
      return out;
    }

    function poly(pts) {
      if (pts.length < 3) return 'polygon(0 0, 0 0, 0 0)';
      return 'polygon(' + pts.map(function (q) {
        return q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px';
      }).join(', ') + ')';
    }

    function strip(node, M, angle, length, height) {
      node.style.width = length + 'px';
      node.style.height = height + 'px';
      node.style.left = (M.x - length / 2) + 'px';
      node.style.top = M.y + 'px';
      node.style.transform = 'rotate(' + angle.toFixed(3) + 'deg)';
    }

    // P — где сейчас правый нижний уголок верхнего листа
    function render(p) {
      P = p;
      if (!top) return;
      var dx = p.x - W, dy = p.y - H, len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) {
        top.style.clipPath = '';
        flap.style.display = 'none';
        shadow.style.display = 'none';
        return;
      }
      var n = { x: dx / len, y: dy / len };
      var M = { x: (W + p.x) / 2, y: (H + p.y) / 2 };
      var m2 = 2 * (M.x * n.x + M.y * n.y);

      top.style.clipPath = poly(cut(M, n, 1));

      // оборот листа — отражение отогнутой части через линию сгиба
      flap.style.display = 'block';
      flap.style.clipPath = poly(cut(M, n, -1));
      flap.style.transform = 'matrix(' + [
        1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.y, 1 - 2 * n.y * n.y, m2 * n.x, m2 * n.y
      ].map(function (v) { return v.toFixed(5); }).join(',') + ')';

      var angle = Math.atan2(n.x, -n.y) * 180 / Math.PI;
      var length = 2 * (W + H);
      var k = Math.max(0, Math.min(1, (len - 50) / 160)); // сила теней: в покое 0

      strip(flapShade, M, angle, length, len / 2 + 2);
      flapShade.style.setProperty('--k', k.toFixed(3));

      shadow.style.display = k > 0 ? 'block' : 'none';
      strip(shadow, M, angle, length, Math.max(24, Math.min(140, len * 0.3)));
      shadow.style.opacity = k.toFixed(3);
    }

    /* --- какая страница сверху, какая под ней --- */
    function stack(topPage, underPage) {
      pages.forEach(function (pg, i) {
        pg.classList.remove('is-top', 'is-under');
        pg.style.clipPath = '';
        var active = i === idx;
        if (active) {
          pg.removeAttribute('inert');
          pg.removeAttribute('aria-hidden');
        } else {
          pg.setAttribute('inert', '');
          pg.setAttribute('aria-hidden', 'true');
        }
      });
      top = topPage;
      if (topPage) topPage.classList.add('is-top');
      if (underPage) underPage.classList.add('is-under');
    }

    function setIdle() {
      var hasNext = idx < pages.length - 1;
      stack(pages[idx], hasNext ? pages[idx + 1] : null);
      cornerNext.hidden = !hasNext;
      cornerPrev.hidden = idx === 0;
      render(hasNext ? constrain({ x: W - REST, y: H - REST }) : { x: W, y: H });
      ui();
    }

    function ui() {
      if (btnPrev) btnPrev.disabled = idx === 0;
      if (btnNext) btnNext.disabled = idx === pages.length - 1;
      var section = pages[idx].getAttribute('data-section');
      tabs.forEach(function (t) {
        t.setAttribute('aria-current', t.getAttribute('data-mag-go') === section ? 'true' : 'false');
      });
      magState.onContact = section === 'zapis';
      updateDock();
    }

    function announce() {
      if (status) status.textContent = 'Страница ' + (idx + 1) + ' из ' + pages.length;
    }

    /* --- плавное движение уголка --- */
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

    function stop() {
      if (raf) window.cancelAnimationFrame(raf);
      if (safety) window.clearTimeout(safety);
      raf = null;
      safety = null;
    }

    function tween(from, to, ms, lift, done) {
      stop();
      var t0 = null, finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        stop();
        render(constrain(to));
        if (done) done();
      }
      function frame(now) {
        if (finished) return;
        if (t0 === null) t0 = now;
        var t = Math.min(1, (now - t0) / ms), e = ease(t);
        render(constrain({
          x: from.x + (to.x - from.x) * e,
          y: from.y + (to.y - from.y) * e - lift * Math.sin(Math.PI * e)
        }));
        if (t < 1) raf = window.requestAnimationFrame(frame);
        else finish();
      }
      raf = window.requestAnimationFrame(frame);
      // если браузер не рисует кадры (вкладка в фоне), лист всё равно доходит до конца
      safety = window.setTimeout(finish, ms + 400);
    }

    /* --- перелистнуть на страницу target --- */
    function turnTo(target, from) {
      if (busy || target === idx || target < 0 || target >= pages.length) return;
      var forward = target > idx;
      if (!animated) {
        idx = target;
        setIdle();
        announce();
        return;
      }
      busy = true;
      var start, end;
      if (forward) {
        stack(pages[idx], pages[target]);          // текущий лист уходит, под ним нужная страница
        start = from || P || { x: W - REST, y: H - REST };
        end = { x: -W, y: H };
      } else {
        stack(pages[target], pages[idx]);          // нужная страница возвращается поверх текущей
        start = from || { x: -W, y: H };
        end = { x: W, y: H };
      }
      tween(start, end, TURN_MS, 0.14 * H, function () {
        idx = target;
        busy = false;
        setIdle();
        announce();
      });
    }

    function peek(amount) {
      if (!animated || busy || drag || idx >= pages.length - 1) return;
      var to = constrain({ x: W - amount, y: H - amount });
      tween(P || to, to, 260, 0, null);
    }

    /* --- перетаскивание --- */
    function local(e) {
      var r = book.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function begin(e, dir, mode) {
      var target = idx + dir;
      if (busy || target < 0 || target >= pages.length) return false;
      stop();
      var pt = local(e);
      drag = {
        id: e.pointerId, dir: dir, mode: mode, x0: pt.x, y0: pt.y, moved: mode === 'swipe',
        base: dir > 0 ? (P || { x: W - REST, y: H - REST }) : { x: -W, y: H }
      };
      if (dir > 0) stack(pages[idx], pages[target]);
      else stack(pages[target], pages[idx]);
      if (dir < 0) render(drag.base);
      return true;
    }

    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var pt = local(e);
      if (!drag.moved && Math.abs(pt.x - drag.x0) + Math.abs(pt.y - drag.y0) > 6) drag.moved = true;
      if (!drag.moved) return;
      var p = drag.mode === 'corner'
        ? { x: 2 * pt.x - W, y: pt.y }
        : { x: drag.base.x + 2 * (pt.x - drag.x0), y: drag.base.y + (pt.y - drag.y0) * 0.4 };
      p.x = Math.max(-W, Math.min(W, p.x));
      p.y = Math.max(-H * 0.2, Math.min(H, p.y));
      render(constrain(p));
    }

    function end(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      var target = idx + d.dir;
      if (!d.moved && !cancelled) {           // просто нажали на уголок
        turnTo(target, d.dir > 0 ? P : null);
        return;
      }
      // гасим только щелчок, который браузер может прислать сразу после перетаскивания,
      // а не следующее нажатие пользователя
      suppressClick = d.moved;
      if (suppressClick) window.setTimeout(function () { suppressClick = false; }, 350);
      var done = d.dir > 0 ? P.x < W * 0.35 : P.x > -W * 0.35;
      if (cancelled) done = false;
      if (!animated) {
        if (done) idx = target;
        setIdle();
        if (done) announce();
        return;
      }
      busy = true;
      if (done) {
        tween(P, d.dir > 0 ? { x: -W, y: H } : { x: W, y: H }, TURN_MS * 0.6, 0.05 * H, function () {
          idx = target;
          busy = false;
          setIdle();
          announce();
        });
      } else {
        tween(P, d.dir > 0 ? { x: W - REST, y: H - REST } : { x: -W, y: H }, 380, 0, function () {
          busy = false;
          setIdle();
        });
      }
    }

    [[cornerNext, 1], [cornerPrev, -1]].forEach(function (pair) {
      var corner = pair[0], dir = pair[1];
      corner.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        if (begin(e, dir, 'corner')) {
          try { corner.setPointerCapture(e.pointerId); } catch (err) { /* ничего */ }
        }
      });
      corner.addEventListener('pointermove', move);
      corner.addEventListener('pointerup', function (e) { end(e, false); });
      corner.addEventListener('pointercancel', function (e) { end(e, true); });
    });

    cornerNext.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') peek(PEEK); });
    cornerNext.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') peek(REST); });

    // свайп пальцем по странице
    book.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' || drag || busy) return;
      if (e.target.closest('.mag__corner')) return;
      pending = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });
    book.addEventListener('pointermove', function (e) {
      if (drag && drag.mode === 'swipe') { move(e); return; }
      if (!pending || e.pointerId !== pending.id) return;
      var dx = e.clientX - pending.x, dy = e.clientY - pending.y;
      if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { pending = null; return; }
      if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        var start = pending;
        pending = null;
        if (begin({ pointerId: e.pointerId, clientX: start.x, clientY: start.y }, dx < 0 ? 1 : -1, 'swipe')) {
          try { book.setPointerCapture(e.pointerId); } catch (err) { /* ничего */ }
          move(e);
        }
      }
    });
    book.addEventListener('pointerup', function (e) {
      pending = null;
      if (drag && drag.mode === 'swipe') end(e, false);
    });
    book.addEventListener('pointercancel', function (e) {
      pending = null;
      if (drag && drag.mode === 'swipe') end(e, true);
    });

    // после перетаскивания не открываем фото случайным нажатием
    book.addEventListener('click', function (e) {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    }, true);

    /* --- кнопки, вкладки, клавиши, ссылки меню --- */
    if (btnPrev) btnPrev.addEventListener('click', function () { turnTo(idx - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { turnTo(idx + 1); });
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { turnTo(ids[t.getAttribute('data-mag-go')]); });
    });
    mag.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); turnTo(idx + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); turnTo(idx - 1); }
    });

    doc.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      if (!(id in ids)) return;
      e.preventDefault();
      mag.scrollIntoView({ behavior: animated ? 'smooth' : 'auto', block: 'start' });
      var target = ids[id];
      if (target !== idx) window.setTimeout(function () { turnTo(target); }, animated ? 500 : 0);
    });

    // уголок один раз приподнимается, когда журнал впервые появляется на экране
    if (animated && 'IntersectionObserver' in window) {
      var introIo = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        introIo.disconnect();
        window.setTimeout(function () {
          peek(PEEK + 30);
          window.setTimeout(function () { peek(REST); }, 700);
        }, 400);
      }, { threshold: 0.4 });
      introIo.observe(book);
    }

    // якорь в адресе (#ceny, #raboty, #zapis) — открыть нужную страницу
    window.addEventListener('hashchange', function () {
      var id = location.hash.slice(1);
      if (id in ids && ids[id] !== idx) turnTo(ids[id]);
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(layout, 150);
    });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(layout);
    layout();
    announce();
  })();

  /* ---------- 4. Просмотр фото на весь экран ---------- */

  var shots = $all('[data-shot]');
  var viewer = doc.getElementById('viewer');
  if (!viewer || !shots.length || typeof viewer.showModal !== 'function') return;

  var vImg = viewer.querySelector('.viewer__img');
  var vTitle = viewer.querySelector('.viewer__title');
  var vText = viewer.querySelector('.viewer__text');
  var vIndex = viewer.querySelector('[data-viewer-index]');
  var vTotal = viewer.querySelector('[data-viewer-total]');
  var stage = viewer.querySelector('.viewer__stage');
  var current = 0;
  var token = 0;
  var lastFocus = null;

  var webpOk = (function () {
    try {
      return doc.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) { return false; }
  })();

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function photo(i) {
    var link = shots[i];
    var img = link.querySelector('img');
    var source = link.querySelector('source[type="image/webp"]');
    var src = (webpOk && source && !link.hasAttribute('data-no-webp'))
      ? source.getAttribute('srcset')
      : link.getAttribute('href');
    return {
      src: src,
      alt: img ? img.getAttribute('alt') : '',
      title: link.getAttribute('data-title') || ''
    };
  }

  function preload(i) {
    var im = new Image();
    im.src = photo((i + shots.length) % shots.length).src;
  }

  function show(i, dir) {
    current = (i + shots.length) % shots.length;
    var my = ++token;
    var p = photo(current);
    vIndex.textContent = pad(current + 1);

    var next = new Image();
    var apply = function () {
      if (my !== token) return;
      vImg.src = next.naturalWidth ? p.src : shots[current].getAttribute('href');
      vImg.alt = p.alt;
      vTitle.textContent = p.title;
      vTitle.hidden = !p.title;
      vText.textContent = p.alt;
      [vTitle, vText].forEach(function (el) {
        if (dir && !reduceMotion.matches && el.animate) {
          el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-out' });
        }
      });
      resetDrag();
      if (dir && !reduceMotion.matches && vImg.animate) {
        vImg.animate(
          [{ opacity: 0, transform: 'translateX(' + (dir * 40) + 'px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }
        );
      }
    };
    next.onload = apply;
    next.onerror = apply;
    next.src = p.src;

    preload(current + 1);
    preload(current - 1);
  }

  function open(i) {
    lastFocus = doc.activeElement;
    vTotal.textContent = pad(shots.length);
    root.classList.add('is-locked');
    viewer.showModal();
    show(i, 0);
    if (!reduceMotion.matches && viewer.animate) {
      viewer.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
    }
  }

  function close() {
    if (viewer.open) viewer.close();
  }

  viewer.addEventListener('close', function () {
    root.classList.remove('is-locked');
    token++;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  });

  shots.forEach(function (link, i) {
    link.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      open(i);
    });
  });

  viewer.querySelector('[data-viewer-close]').addEventListener('click', close);
  viewer.querySelector('[data-viewer-prev]').addEventListener('click', function () { show(current - 1, -1); });
  viewer.querySelector('[data-viewer-next]').addEventListener('click', function () { show(current + 1, 1); });

  viewer.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(current - 1, -1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); show(current + 1, 1); }
  });

  // Свайп: влево/вправо — листать, вниз — закрыть, короткий тап мимо фото — закрыть
  var drag = null;

  function resetDrag() {
    vImg.style.transition = '';
    vImg.style.transform = '';
    vImg.style.opacity = '';
  }

  stage.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, target: e.target };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* ничего */ }
    vImg.style.transition = 'none';
  });

  stage.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (Math.abs(drag.dx) > Math.abs(drag.dy)) {
      vImg.style.transform = 'translateX(' + drag.dx + 'px)';
      vImg.style.opacity = '';
    } else if (drag.dy > 0) {
      vImg.style.transform = 'translateY(' + drag.dy + 'px)';
      vImg.style.opacity = String(Math.max(0.35, 1 - drag.dy / 400));
    }
  });

  function endDrag(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    vImg.style.transition = reduceMotion.matches ? 'none' : 'transform .25s ease, opacity .25s ease';
    vImg.style.transform = '';
    vImg.style.opacity = '';
    if (cancelled) return;

    var ax = Math.abs(d.dx);
    var ay = Math.abs(d.dy);
    if (ax > 60 && ax > ay) {
      show(current + (d.dx < 0 ? 1 : -1), d.dx < 0 ? 1 : -1);
    } else if (d.dy > 90 && ay > ax) {
      close();
    } else if (ax < 6 && ay < 6 && d.target !== vImg) {
      close();
    }
  }

  stage.addEventListener('pointerup', function (e) { endDrag(e, false); });
  stage.addEventListener('pointercancel', function (e) { endDrag(e, true); });
})();
