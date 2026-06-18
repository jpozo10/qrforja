/* ── QRForja · app.js ── */

// ── STATE ──
var currentType    = 'url';
var darkColor      = '#0a0a0f';
var lightColor     = '#ffffff';
var cornerColor    = 'auto'; // 'auto' = same as darkColor
var logoDataUrl    = null;
var fileDataUrls   = {};
var qrGenerated    = false;
var moduleShape    = 'square';
var cornerOuterShape = 'square';
var cornerInnerShape = 'square';
var outerFrameShape  = 'none';

// ── SET TYPE ──
function setType(type) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('type-' + type).classList.add('active');
  var forms = ['url','vcard','wifi','text','email','sms','phone','whatsapp','geo','image','pdf','youtube'];
  forms.forEach(f => document.getElementById('form-' + f).style.display = 'none');
  document.getElementById('form-' + type).style.display = 'block';
  currentType = type;
  autoGenerate();
}

// ── SHAPES ──
function setModuleShape(shape, el) {
  document.querySelectorAll('#module-shapes .shape-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  moduleShape = shape;
  autoGenerate();
}

function setCornerOuter(shape, el) {
  document.querySelectorAll('#corner-outer-shapes .shape-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  cornerOuterShape = shape;
  autoGenerate();
}

function setCornerInner(shape, el) {
  document.querySelectorAll('#corner-inner-shapes .shape-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  cornerInnerShape = shape;
  autoGenerate();
}

function setOuterFrame(shape, el) {
  document.querySelectorAll('#outer-frame-shapes .shape-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  outerFrameShape = shape;
  var labelGroup = document.getElementById('label-text-group');
  labelGroup.style.display = (shape === 'label-bottom' || shape === 'label-top') ? 'block' : 'none';
  autoGenerate();
}

// ── BUILD QR CONTENT ──
function buildContent() {
  switch(currentType) {
    case 'url':
      var u = v('input-url');
      return u ? (u.startsWith('http') ? u : 'https://' + u) : null;
    case 'vcard':
      var fn = v('vc-name'), ln = v('vc-lastname');
      if (!fn && !ln) return null;
      return [
        'BEGIN:VCARD','VERSION:3.0',
        'N:' + ln + ';' + fn,
        'FN:' + fn + ' ' + ln,
        v('vc-org')     ? 'ORG:'   + v('vc-org')     : '',
        v('vc-title')   ? 'TITLE:' + v('vc-title')   : '',
        v('vc-phone')   ? 'TEL;TYPE=CELL:' + v('vc-phone') : '',
        v('vc-email')   ? 'EMAIL:' + v('vc-email')   : '',
        v('vc-url')     ? 'URL:'   + v('vc-url')     : '',
        v('vc-address') ? 'ADR:;;' + v('vc-address') + ';;;' : '',
        'END:VCARD'
      ].filter(Boolean).join('\n');
    case 'wifi':
      var ssid = v('wifi-ssid'), pass = v('wifi-pass'), sec = v('wifi-sec');
      if (!ssid) return null;
      return 'WIFI:T:' + sec + ';S:' + ssid + ';P:' + pass + ';;';
    case 'text':
      return v('input-text') || null;
    case 'email':
      var to = v('email-to');
      if (!to) return null;
      return 'mailto:' + to + '?subject=' + encodeURIComponent(v('email-sub')) + '&body=' + encodeURIComponent(v('email-body'));
    case 'sms':
      var sto = v('sms-to');
      if (!sto) return null;
      return 'smsto:' + sto.replace(/\s/g,'') + ':' + v('sms-body');
    case 'phone':
      var ph = v('input-phone');
      return ph ? 'tel:' + ph.replace(/\s/g,'') : null;
    case 'whatsapp':
      var wp = v('wa-phone'), wm = v('wa-msg');
      if (!wp) return null;
      var num = wp.replace(/[^0-9]/g,'');
      return 'https://wa.me/' + num + (wm ? '?text=' + encodeURIComponent(wm) : '');
    case 'geo':
      var link = v('geo-link');
      if (link) {
        var m = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (m) return 'geo:' + m[1] + ',' + m[2];
        return link;
      }
      var lat = v('geo-lat'), lng = v('geo-lng');
      return (lat && lng) ? 'geo:' + lat + ',' + lng : null;
    case 'image':
      return fileDataUrls['image'] ? buildFileViewerUrl(fileDataUrls['image'], 'image') : null;
    case 'pdf':
      return fileDataUrls['pdf'] ? buildFileViewerUrl(fileDataUrls['pdf'], 'pdf') : null;
    case 'youtube':
      return v('input-yt') || null;
    default: return null;
  }
}

function buildFileViewerUrl(dataUrl, type) {
  var html;
  if (type === 'image') {
    html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Imagen</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#111;}img{max-width:100%;max-height:100vh;border-radius:8px;}</style></head><body><img src="' + dataUrl + '"></body></html>';
  } else {
    html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PDF</title><style>body{margin:0;height:100vh;}</style></head><body><embed src="' + dataUrl + '" width="100%" height="100%" type="application/pdf"></body></html>';
  }
  var blob = new Blob([html], {type: 'text/html'});
  return URL.createObjectURL(blob);
}

function v(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function parseGeoLink() {
  var link = v('geo-link');
  var m = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) {
    document.getElementById('geo-lat').value = m[1];
    document.getElementById('geo-lng').value = m[2];
  }
  autoGenerate();
}

// ── FILE HANDLING ──
function handleFile(inputId, previewId, fileType) {
  var file = document.getElementById(inputId).files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('El archivo supera 5 MB'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    fileDataUrls[fileType] = e.target.result;
    document.getElementById(previewId).innerHTML = '<div class="file-preview">✅ ' + file.name + ' (' + (file.size/1024).toFixed(1) + ' KB)</div>';
    autoGenerate();
  };
  reader.readAsDataURL(file);
}

function handleLogo(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    logoDataUrl = e.target.result;
    document.getElementById('logo-preview-img').src = logoDataUrl;
    document.getElementById('logo-preview-wrap').style.display = 'flex';
    document.getElementById('logo-size-control').classList.remove('hidden');
    // Recommend H error correction
    if (document.getElementById('qr-ecl').value !== 'H') {
      document.getElementById('qr-ecl').value = 'H';
      showToast('💡 Corrección de error cambiada a H (recomendado con logo)');
    }
    autoGenerate();
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  logoDataUrl = null;
  document.getElementById('logo-file').value = '';
  document.getElementById('logo-preview-wrap').style.display = 'none';
  document.getElementById('logo-size-control').classList.add('hidden');
  autoGenerate();
}

function dragOver(e, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.add('drag-over');
}
function dragLeave(zoneId) {
  document.getElementById(zoneId).classList.remove('drag-over');
}
function dropFile(e, inputId, zoneId) {
  e.preventDefault();
  document.getElementById(zoneId).classList.remove('drag-over');
  var file = e.dataTransfer.files[0];
  if (file) {
    var dt = new DataTransfer();
    dt.items.add(file);
    document.getElementById(inputId).files = dt.files;
    document.getElementById(inputId).dispatchEvent(new Event('change'));
  }
}

// ── COLORS ──
function selectColor(role, el) {
  var groupId = role === 'dark' ? 'dark-swatches' : (role === 'light' ? 'light-swatches' : 'corner-swatches');
  document.querySelectorAll('#' + groupId + ' .color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  var hex = el.getAttribute('data-hex');
  if (role === 'dark') {
    darkColor = hex;
    document.getElementById('dark-custom').value = (hex === 'transparent') ? '#ffffff' : hex;
    syncColorText('dark', hex);
  } else if (role === 'light') {
    lightColor = hex;
    if (hex !== 'transparent') document.getElementById('light-custom').value = hex;
    syncColorText('light', hex);
  } else {
    cornerColor = hex;
    if (hex !== 'auto') document.getElementById('corner-custom').value = hex;
    syncColorText('corner', hex);
  }
  autoGenerate();
}

function customColor(role, input) {
  if (role === 'dark') {
    darkColor = input.value;
    document.querySelectorAll('#dark-swatches .color-swatch').forEach(s => s.classList.remove('active'));
  } else if (role === 'light') {
    lightColor = input.value;
    document.querySelectorAll('#light-swatches .color-swatch').forEach(s => s.classList.remove('active'));
  } else {
    cornerColor = input.value;
    document.querySelectorAll('#corner-swatches .color-swatch').forEach(s => s.classList.remove('active'));
  }
  syncColorText(role, input.value);
  autoGenerate();
}

function customColorText(role, input) {
  var parsed = parseColorValue(input.value, role);
  input.classList.toggle('invalid', !parsed);
  if (!parsed) return;

  setRoleColor(role, parsed);
  syncNativeColor(role, parsed);
  clearColorSwatches(role);
  autoGenerate();
}

function setRoleColor(role, value) {
  if (role === 'dark') darkColor = value;
  else if (role === 'light') lightColor = value;
  else cornerColor = value;
}

function syncColorText(role, value) {
  var text = document.getElementById(role + '-custom-text');
  if (text) {
    text.value = value;
    text.classList.remove('invalid');
  }
}

function syncNativeColor(role, value) {
  var nativeInput = document.getElementById(role + '-custom');
  var hex = colorToHex(value);
  if (nativeInput && hex) nativeInput.value = hex;
}

function clearColorSwatches(role) {
  var groupId = role === 'dark' ? 'dark-swatches' : (role === 'light' ? 'light-swatches' : 'corner-swatches');
  document.querySelectorAll('#' + groupId + ' .color-swatch').forEach(s => s.classList.remove('active'));
}

function parseColorValue(value, role) {
  var color = value.trim();
  if (!color) return null;
  if (role === 'light' && color.toLowerCase() === 'transparent') return 'transparent';
  if (role === 'corner' && color.toLowerCase() === 'auto') return 'auto';
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return expandShortHex(color).toLowerCase();

  var rgbMatch = color.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i) ||
                 color.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (rgbMatch) {
    var r = parseInt(rgbMatch[1], 10);
    var g = parseInt(rgbMatch[2], 10);
    var b = parseInt(rgbMatch[3], 10);
    if ([r, g, b].every(n => n >= 0 && n <= 255)) {
      return 'rgb(' + r + ', ' + g + ', ' + b + ')';
    }
  }
  return null;
}

function expandShortHex(hex) {
  if (hex.length !== 4) return hex;
  return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
}

function colorToHex(value) {
  var color = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  if (/^#[0-9a-f]{3}$/i.test(color)) return expandShortHex(color);
  var rgbMatch = color.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgbMatch) return null;
  return '#' + [rgbMatch[1], rgbMatch[2], rgbMatch[3]].map(function(part) {
    return parseInt(part, 10).toString(16).padStart(2, '0');
  }).join('');
}

// ── AUTO GENERATE ──
var autoTimer = null;
function autoGenerate() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(generateQR, 380);
}

// ── GENERATE QR ──
function generateQR() {
  var content = buildContent();
  if (!content) {
    document.getElementById('qr-output').innerHTML = '<div class="qr-empty"><div class="empty-icon">◻</div><div>Rellena los campos para generar</div></div>';
    document.getElementById('dl-row').style.display = 'none';
    return;
  }

  var size   = parseInt(document.getElementById('qr-size').value);
  var ecl    = document.getElementById('qr-ecl').value;
  var eclMap = { L: QRCode.CorrectLevel.L, M: QRCode.CorrectLevel.M, Q: QRCode.CorrectLevel.Q, H: QRCode.CorrectLevel.H };

  var output = document.getElementById('qr-output');
  output.innerHTML = '';

  try {
    // Generate base QR using qrcode.js
    var tempDiv = document.createElement('div');
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    var qrInstance = new QRCode(tempDiv, {
      text:         content,
      width:        size,
      height:       size,
      colorDark:    '#000000',
      colorLight:   '#ffffff',
      correctLevel: eclMap[ecl]
    });

    // Get the base canvas
    var baseCanvas = tempDiv.querySelector('canvas');
    if (!baseCanvas) { document.body.removeChild(tempDiv); throw new Error('No canvas'); }

    // Now render custom styled QR
    var finalCanvas = renderCustomQR(qrInstance, size);
    document.body.removeChild(tempDiv);

    output.appendChild(finalCanvas);

    // Overlay logo if present
    if (logoDataUrl) {
      overlayLogo(finalCanvas, size);
    }

    // Draw outer frame if selected
    if (outerFrameShape !== 'none') {
      drawOuterFrame(finalCanvas, size);
    }

    qrGenerated = true;
    document.getElementById('dl-row').style.display = 'flex';
    document.getElementById('dl-row').style.flexDirection = 'column';
    updateSteps();

  } catch(e) {
    output.innerHTML = '<div class="qr-empty" style="color:#e17055"><div class="empty-icon">⚠️</div><div>El contenido es demasiado largo.<br>Prueba con nivel L.</div></div>';
    console.error(e);
  }
}

// ── CUSTOM QR RENDERER ──
function renderCustomQR(qrInstance, size) {
  var qr = qrInstance && qrInstance._oQRCode;
  if (!qr || !qr.moduleCount || typeof qr.isDark !== 'function') {
    throw new Error('No se pudo leer la matriz del QR');
  }

  var moduleCount = qr.moduleCount;

  // Identify finder pattern positions (top-left, top-right, bottom-left)
  var finderPositions = getFinderPositions(moduleCount);

  // Create output canvas
  var canvas = document.createElement('canvas');
  var cellSize = size / moduleCount;
  var padding = Math.max(8, Math.round(cellSize * 2));
  var totalSize = size + padding * 2;
  canvas.width  = totalSize;
  canvas.height = totalSize;

  var ctx = canvas.getContext('2d');

  // Background
  if (lightColor === 'transparent') {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  var activeCornerColor = (cornerColor === 'auto') ? darkColor : cornerColor;

  // Draw each module
  for (var row = 0; row < moduleCount; row++) {
    for (var col = 0; col < moduleCount; col++) {
      if (!qr.isDark(row, col)) continue;

      var x = padding + col * cellSize;
      var y = padding + row * cellSize;

      // Determine if this cell is part of a finder pattern
      var finderRole = getFinderRole(row, col, moduleCount, finderPositions);

      if (finderRole) {
        ctx.fillStyle = activeCornerColor;
        drawFinderModule(ctx, x, y, cellSize, row, col, moduleCount, finderPositions, cornerOuterShape, cornerInnerShape, finderRole);
      } else {
        ctx.fillStyle = darkColor;
        drawModule(ctx, x, y, cellSize, moduleShape);
      }
    }
  }

  return canvas;
}

// ── GET MODULE COUNT ──
function getModuleCount(imgData, w) {
  // Scan first row to count module transitions
  var data = imgData.data;
  var transitions = 0;
  var lastDark = null;
  var row = Math.floor(w * 0.05); // scan near top
  for (var col = 0; col < w; col++) {
    var i = (row * w + col) * 4;
    var isDark = data[i] < 128;
    if (lastDark !== null && isDark !== lastDark) transitions++;
    lastDark = isDark;
  }
  // Each module produces 0 or 1 transition depending on content
  // Better: scan the top-left finder pattern (7 modules wide)
  // Count dark pixels in first non-white row
  var moduleSize = 1;
  for (var scanRow = 1; scanRow < w; scanRow++) {
    var pxIdx = (scanRow * w + 0) * 4;
    if (data[pxIdx] < 128) {
      moduleSize = scanRow;
      break;
    }
  }
  if (moduleSize < 1) moduleSize = 1;
  return Math.round(w / moduleSize);
}

// ── EXTRACT GRID ──
function extractGrid(imgData, w, moduleCount) {
  var data = imgData.data;
  var grid = [];
  var cellSize = w / moduleCount;
  for (var row = 0; row < moduleCount; row++) {
    grid[row] = [];
    for (var col = 0; col < moduleCount; col++) {
      var px = Math.floor(col * cellSize + cellSize * 0.5);
      var py = Math.floor(row * cellSize + cellSize * 0.5);
      var i = (py * w + px) * 4;
      grid[row][col] = data[i] < 128;
    }
  }
  return grid;
}

// ── FINDER PATTERN HELPERS ──
function getFinderPositions(n) {
  return [
    { startRow: 0, startCol: 0 },           // top-left
    { startRow: 0, startCol: n - 7 },        // top-right
    { startRow: n - 7, startCol: 0 }         // bottom-left
  ];
}

function getFinderRole(row, col, n, fps) {
  for (var i = 0; i < fps.length; i++) {
    var fp = fps[i];
    if (row >= fp.startRow && row < fp.startRow + 7 &&
        col >= fp.startCol && col < fp.startCol + 7) {
      return { fpIdx: i, localRow: row - fp.startRow, localCol: col - fp.startCol };
    }
  }
  return null;
}

function drawFinderModule(ctx, x, y, cellSize, row, col, n, fps, outerShape, innerShape, role) {
  var lr = role.localRow, lc = role.localCol;

  // Outer ring (border, rows/cols 0 and 6)
  var isOuter = (lr === 0 || lr === 6 || lc === 0 || lc === 6);
  // Inner dot (rows/cols 2-4)
  var isInner = (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4);
  // Separator (row/col 1 or 5 — empty)
  var isSep   = !isOuter && !isInner;

  if (isSep) return; // leave empty

  if (isOuter) {
    // Draw only corners of the outer ring using the selected outer shape
    // We draw the full outer border as one shape when we hit the first cell (0,0)
    if (lr === 0 && lc === 0) {
      drawCornerOuterShape(ctx, x, y, cellSize * 7, outerShape);
    }
  } else if (isInner) {
    // Draw inner dot as one shape when we hit local (2,2)
    if (lr === 2 && lc === 2) {
      drawCornerInnerShape(ctx, x, y, cellSize * 3, innerShape);
    }
  }
}

// ── DRAW OUTER CORNER FRAME ──
function drawCornerOuterShape(ctx, x, y, size, shape) {
  var lineWidth = size / 7;
  ctx.save();
  ctx.beginPath();

  switch(shape) {
    case 'square':
      ctx.rect(x, y, size, size);
      ctx.rect(x + lineWidth, y + lineWidth, size - 2*lineWidth, size - 2*lineWidth);
      ctx.fill('evenodd');
      break;
    case 'rounded':
      var r = size * 0.22;
      roundRect(ctx, x, y, size, size, r);
      ctx.fill();
      roundRect(ctx, x + lineWidth, y + lineWidth, size - 2*lineWidth, size - 2*lineWidth, Math.max(0, r - lineWidth));
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'circle':
      var cx = x + size/2, cy = y + size/2, ro = size/2, ri = ro - lineWidth;
      ctx.arc(cx, cy, ro, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, ri, 0, Math.PI*2);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'leaf':
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + size/2, y, x + size, y + size/2);
      ctx.quadraticCurveTo(x + size/2, y + size, x, y + size/2);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(x + lineWidth, y + size/2 - lineWidth/3);
      ctx.quadraticCurveTo(x + size/2, y + lineWidth, x + size - lineWidth, y + size/2);
      ctx.quadraticCurveTo(x + size/2, y + size - lineWidth, x + lineWidth, y + size/2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'diamond':
      var half = size / 2;
      ctx.moveTo(x + half, y);
      ctx.lineTo(x + size, y + half);
      ctx.lineTo(x + half, y + size);
      ctx.lineTo(x, y + half);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      var lw2 = lineWidth * 1.2;
      ctx.moveTo(x + half, y + lw2);
      ctx.lineTo(x + size - lw2, y + half);
      ctx.lineTo(x + half, y + size - lw2);
      ctx.lineTo(x + lw2, y + half);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      break;
    case 'star':
      drawStar(ctx, x + size/2, y + size/2, 5, size/2, size/2 - lineWidth);
      ctx.fill();
      break;
    default:
      ctx.rect(x, y, size, size);
      ctx.rect(x + lineWidth, y + lineWidth, size - 2*lineWidth, size - 2*lineWidth);
      ctx.fill('evenodd');
  }
  ctx.restore();
}

// ── DRAW INNER CORNER DOT ──
function drawCornerInnerShape(ctx, x, y, size, shape) {
  ctx.save();
  ctx.beginPath();
  switch(shape) {
    case 'square':
      ctx.rect(x, y, size, size);
      break;
    case 'rounded':
      roundRect(ctx, x, y, size, size, size * 0.25);
      break;
    case 'circle':
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
      break;
    case 'diamond':
      ctx.moveTo(x + size/2, y);
      ctx.lineTo(x + size, y + size/2);
      ctx.lineTo(x + size/2, y + size);
      ctx.lineTo(x, y + size/2);
      ctx.closePath();
      break;
    case 'star':
      drawStar(ctx, x + size/2, y + size/2, 5, size/2, size/4);
      break;
    case 'cross':
      var t = size * 0.3;
      ctx.rect(x + t, y, size - 2*t, size);
      ctx.rect(x, y + t, size, size - 2*t);
      break;
    default:
      ctx.rect(x, y, size, size);
  }
  ctx.fill();
  ctx.restore();
}

// ── DRAW DATA MODULE ──
function drawModule(ctx, x, y, size, shape) {
  var pad = size * 0.05;
  x += pad; y += pad; size -= pad * 2;
  ctx.save();
  ctx.beginPath();
  switch(shape) {
    case 'square':
      ctx.rect(x, y, size, size);
      break;
    case 'rounded':
      roundRect(ctx, x, y, size, size, size * 0.3);
      break;
    case 'dot':
      ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI*2);
      break;
    case 'diamond':
      ctx.moveTo(x + size/2, y);
      ctx.lineTo(x + size, y + size/2);
      ctx.lineTo(x + size/2, y + size);
      ctx.lineTo(x, y + size/2);
      ctx.closePath();
      break;
    case 'star':
      drawStar(ctx, x + size/2, y + size/2, 5, size/2, size/4);
      break;
    case 'cross':
      var t = size * 0.28;
      ctx.rect(x + t, y, size - 2*t, size);
      ctx.rect(x, y + t, size, size - 2*t);
      break;
    default:
      ctx.rect(x, y, size, size);
  }
  ctx.fill();
  ctx.restore();
}

// ── HELPERS ──
function roundRect(ctx, x, y, w, h, r) {
  if (r > w/2) r = w/2;
  if (r > h/2) r = h/2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStar(ctx, cx, cy, points, outer, inner) {
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var angle = (i * Math.PI / points) - Math.PI/2;
    var radius = (i % 2 === 0) ? outer : inner;
    var sx = cx + Math.cos(angle) * radius;
    var sy = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

// ── LOGO OVERLAY ──
function overlayLogo(canvas, size) {
  var ctx = canvas.getContext('2d');
  var logoSizePct = parseInt(document.getElementById('logo-size').value) / 100;
  var maxLogoSize = canvas.width * logoSizePct;

  var img = new Image();
  img.onload = function() {
    var ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    var logoW = ratio >= 1 ? maxLogoSize : maxLogoSize * ratio;
    var logoH = ratio >= 1 ? maxLogoSize / ratio : maxLogoSize;
    var logoX = (canvas.width - logoW) / 2;
    var logoY = (canvas.height - logoH) / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, logoX, logoY, logoW, logoH);
    ctx.restore();
  };
  img.src = logoDataUrl;
}

// ── OUTER FRAME ──
function drawOuterFrame(canvas, size) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  var frameW = 4;
  var activeCorner = (cornerColor === 'auto') ? darkColor : cornerColor;
  ctx.strokeStyle = activeCorner;
  ctx.lineWidth = frameW;

  var labelH = 24;
  var labelText = v('frame-label-text') || 'ESCANÉAME';

  ctx.save();
  switch(outerFrameShape) {
    case 'square':
      ctx.strokeRect(frameW/2, frameW/2, w - frameW, h - frameW);
      break;
    case 'rounded':
      ctx.beginPath();
      roundRect(ctx, frameW/2, frameW/2, w - frameW, h - frameW, 18);
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(w/2, h/2, w/2 - frameW/2, 0, Math.PI*2);
      ctx.stroke();
      break;
    case 'label-bottom':
      ctx.beginPath();
      roundRect(ctx, frameW/2, frameW/2, w - frameW, h - frameW - labelH, 8);
      ctx.stroke();
      // Label bar
      ctx.fillStyle = activeCorner;
      ctx.beginPath();
      roundRect(ctx, 0, h - labelH - 2, w, labelH + 2, 8);
      ctx.fill();
      ctx.fillStyle = lightColor === 'transparent' ? '#fff' : (lightColor === '#0a0a0f' ? '#fff' : '#fff');
      ctx.font = 'bold ' + Math.round(labelH * 0.55) + 'px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, w/2, h - labelH/2 - 1);
      break;
    case 'label-top':
      ctx.beginPath();
      roundRect(ctx, frameW/2, labelH + frameW/2, w - frameW, h - labelH - frameW, 8);
      ctx.stroke();
      // Label bar
      ctx.fillStyle = activeCorner;
      ctx.beginPath();
      roundRect(ctx, 0, 0, w, labelH + 2, 8);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(labelH * 0.55) + 'px Space Grotesk, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, w/2, labelH/2 + 1);
      break;
  }
  ctx.restore();
}

// ── DOWNLOAD ──
function downloadQR(format) {
  var canvas = document.querySelector('#qr-output canvas');
  if (!canvas) { showToast('Genera el QR primero'); return; }

  if (format === 'png') {
    var link = document.createElement('a');
    link.download = 'qrforja-' + currentType + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG descargado ✅');
  } else if (format === 'svg') {
    var svgContent = canvasToSVG(canvas);
    var blob = new Blob([svgContent], {type: 'image/svg+xml'});
    var url  = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.download = 'qrforja-' + currentType + '.svg';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('SVG descargado ✅');
  }
}

function canvasToSVG(canvas) {
  var dataUrl = canvas.toDataURL('image/png');
  var w = canvas.width, h = canvas.height;
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
    '<image href="' + dataUrl + '" width="' + w + '" height="' + h + '"/></svg>';
}

// ── SCAN MODAL ──
function openScanModal() {
  var canvas = document.querySelector('#qr-output canvas');
  if (!canvas) { showToast('Genera el QR primero'); return; }

  var scanContainer = document.getElementById('scan-qr-display');
  scanContainer.innerHTML = '';

  var scanCanvas = document.createElement('canvas');
  var scanSize = 300;
  scanCanvas.width = scanSize;
  scanCanvas.height = scanSize;
  var ctx = scanCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, scanSize, scanSize);
  scanContainer.appendChild(scanCanvas);

  document.getElementById('scan-modal').classList.add('open');
}

function closeScanModal() {
  document.getElementById('scan-modal').classList.remove('open');
  document.getElementById('scan-qr-display').innerHTML = '';
}

document.getElementById('scan-modal').addEventListener('click', function(e) {
  if (e.target === this) closeScanModal();
});

// ── STEPS ──
function updateSteps() {
  if (qrGenerated) {
    document.getElementById('snum-1').textContent = '✓';
    document.getElementById('step-1-tab').className = 'step-item done';
    document.getElementById('snum-2').textContent = '✓';
    document.getElementById('step-2-tab').className = 'step-item done';
    document.getElementById('snum-3').textContent = '3';
    document.getElementById('step-3-tab').className = 'step-item active';
  }
}

function scrollToStep(n) {
  var el = document.getElementById('anchor-step-' + n);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── TOAST ──
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── INIT ──
setType('url');
