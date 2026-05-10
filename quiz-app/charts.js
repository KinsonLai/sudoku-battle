const COLORS = {
  bg: '#0f0f23',
  card: '#1a1a3e',
  accent: '#00d4ff',
  text: '#e8e8f0',
  textSecondary: '#9a9abf',
  textMuted: '#5a5a7a',
  border: '#2a2a5a',
  correct: '#51cf66',
  wrong: '#ff6b6b',
  warning: '#ffd43b'
};

function clearCanvas(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
}

function drawGridLines(ctx, x, y, w, h, count, horizontal) {
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  if (horizontal) {
    const spacing = h / count;
    for (let i = 0; i <= count; i++) {
      const py = y + h - i * spacing;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  } else {
    const spacing = w / count;
    for (let i = 0; i <= count; i++) {
      const px = x + i * spacing;
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }
  }

  ctx.setLineDash([]);
}

export function renderProgressChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const w = 300;
  const h = 200;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  clearCanvas(ctx, w, h);

  if (!data || data.length === 0) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', w / 2, h / 2);
    return;
  }

  const margin = { top: 20, right: 16, bottom: 36, left: 42 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const maxScore = Math.max(...data.map(d => d.score), 1);
  const yMax = Math.ceil(maxScore / 5) * 5;

  drawGridLines(ctx, margin.left, margin.top, chartW, chartH, 5, true);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = Math.round((yMax / 5) * i);
    const py = margin.top + chartH - (chartH / 5) * i;
    ctx.fillText(val, margin.left - 6, py + 3);
  }

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '8px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  const barWidth = Math.min(24, (chartW / data.length) * 0.7);
  const gap = (chartW - barWidth * data.length) / (data.length + 1);

  data.forEach((d, i) => {
    const barH = (d.score / yMax) * chartH;
    const bx = margin.left + gap + i * (barWidth + gap);
    const by = margin.top + chartH - barH;

    const gradient = ctx.createLinearGradient(bx, by, bx, margin.top + chartH);
    gradient.addColorStop(0, COLORS.accent);
    gradient.addColorStop(1, 'rgba(0, 212, 255, 0.2)');
    ctx.fillStyle = gradient;
    ctx.fillRect(bx, by, barWidth, barH);

    ctx.save();
    ctx.translate(bx + barWidth / 2, margin.top + chartH + 6);
    ctx.rotate(-0.5);
    ctx.textAlign = 'right';
    ctx.fillText(d.date, 0, 0);
    ctx.restore();
  });

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Score', margin.left - 20, margin.top - 6);
}

export function renderTrendChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const w = 300;
  const h = 200;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  clearCanvas(ctx, w, h);

  if (!data || data.length === 0) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '13px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', w / 2, h / 2);
    return;
  }

  const margin = { top: 20, right: 16, bottom: 36, left: 42 };
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const maxAcc = Math.min(100, Math.max(...data.map(d => d.accuracy), 1));
  const yMax = Math.ceil(maxAcc / 20) * 20;

  drawGridLines(ctx, margin.left, margin.top, chartW, chartH, 5, true);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 5; i++) {
    const val = Math.round((yMax / 5) * i);
    const py = margin.top + chartH - (chartH / 5) * i;
    ctx.fillText(val + '%', margin.left - 6, py + 3);
  }

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = '8px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';

  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW / 2;
  const points = data.map((d, i) => ({
    x: margin.left + (data.length > 1 ? i * stepX : chartW / 2),
    y: margin.top + chartH - (d.accuracy / yMax) * chartH
  }));

  ctx.beginPath();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.card;
    ctx.fill();
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  data.forEach((d, i) => {
    const px = points[i].x;
    ctx.save();
    ctx.translate(px, margin.top + chartH + 6);
    ctx.rotate(-0.5);
    ctx.textAlign = 'right';
    ctx.fillText(d.date, 0, 0);
    ctx.restore();
  });

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Accuracy', margin.left - 24, margin.top - 6);
}

export function renderCategoryChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const w = 250;
  const h = 250;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  clearCanvas(ctx, w, h);

  if (!data || Object.keys(data).length === 0) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', w / 2, h / 2);
    return;
  }

  const categories = Object.entries(data);
  const total = categories.reduce((s, [, c]) => s + c, 0);

  const segmentColors = [
    '#00d4ff', '#51cf66', '#ffd43b', '#ff6b6b',
    '#c084fc', '#fb923c', '#38bdf8', '#a3e635',
    '#f472b6', '#fbbf24'
  ];

  const cx = 90;
  const cy = 110;
  const radius = 75;
  const innerRadius = 35;

  let angle = -Math.PI / 2;

  ctx.font = '10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';

  const legendX = 175;
  let legendY = 20;
  const legendSpacing = 18;

  categories.forEach(([cat, count], i) => {
    const sliceAngle = (count / total) * (Math.PI * 2);
    const color = segmentColors[i % segmentColors.length];

    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
    ctx.arc(cx, cy, innerRadius, angle + sliceAngle, angle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    const midAngle = angle + sliceAngle / 2;
    const labelR = (radius + innerRadius) / 2;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;

    const pct = Math.round((count / total) * 100);
    if (pct >= 8) {
      ctx.fillStyle = COLORS.bg;
      ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct + '%', lx, ly);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.fillStyle = color;
    ctx.fillRect(legendX, legendY, 10, 10);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = '9px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    const name = cat.length > 14 ? cat.slice(0, 13) + '\u2026' : cat;
    ctx.fillText(name + ' (' + count + ')', legendX + 14, legendY + 9);

    legendY += legendSpacing;

    angle += sliceAngle;
  });

  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Quizzes by Category', cx, h - 6);
}
