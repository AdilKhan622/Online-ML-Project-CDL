import './style.css'

const state = { rows: [], headers: [], fileName: '' }

document.querySelector('#app').innerHTML = `
  <header class="topbar">
    <div><span class="eyebrow">BROWSER ML WORKBENCH</span><h1>Model Studio</h1></div>
    <span class="status-dot">LOCAL ONLY</span>
  </header>
  <main>
    <section class="intro"><p class="kicker">CLASSIFICATION + REGRESSION</p><h2>Turn a CSV into a model report.</h2><p>Upload a tidy dataset, choose a target, and get a quick visual read on its performance.</p></section>
    <section class="workspace">
      <aside class="panel controls">
        <div class="panel-heading"><span class="step">01</span><div><h3>Load your data</h3><p>CSV files only · processed in your browser</p></div></div>
        <label class="dropzone" id="dropzone" for="file-input"><span class="upload-mark">↑</span><strong>Drop CSV here</strong><span>or click to browse</span><input id="file-input" type="file" accept=".csv,text/csv"></label>
        <div class="file-readout" id="file-readout">No file selected</div>
        <div class="field"><label for="target">Target column</label><select id="target" disabled><option>Upload a file first</option></select></div>
        <div class="field"><label for="task">Task</label><select id="task"><option value="classification">Classification</option><option value="regression">Regression</option></select></div>
        <div class="field"><label for="test-size">Test split <output id="split-value">20%</output></label><input id="test-size" type="range" min="10" max="40" value="20"></div>
        <button class="run-button" id="run-button" disabled>Run model <span>→</span></button>
        <p class="helper" id="helper">Add a CSV to enable the model run.</p>
      </aside>
      <section class="results" aria-live="polite">
        <div class="panel empty-state" id="empty-state"><div class="empty-icon">⌁</div><h3>Your results will appear here</h3><p>We will show a data preview, target distribution, and model metrics after you run an experiment.</p></div>
        <div id="result-content" hidden>
          <div class="result-heading"><div><span class="eyebrow">EXPERIMENT OUTPUT</span><h3 id="result-title">Model report</h3></div><span class="run-tag" id="run-tag"></span></div>
          <div class="metrics" id="metrics"></div>
          <div class="visual-grid"><div class="panel chart-panel"><div class="section-title"><h3 id="chart-title">Target distribution</h3><span id="chart-note"></span></div><canvas id="chart" width="640" height="280"></canvas></div><div class="panel preview-panel"><div class="section-title"><h3>Data preview</h3><span id="row-note"></span></div><div class="table-wrap" id="preview"></div></div></div>
          <div class="panel predictions-panel"><div class="section-title"><h3>Test predictions</h3><span id="prediction-note"></span></div><div class="table-wrap" id="predictions"></div></div>
        </div>
      </section>
    </section>
  </main>
  <footer>Model Studio runs lightweight models in your browser. Your file is never uploaded.</footer>
`

const $ = (selector) => document.querySelector(selector)
const csvParse = (text) => text.trim().split(/\r?\n/).filter(Boolean).map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))

function loadFile(file) {
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const parsed = csvParse(reader.result)
    if (parsed.length < 2) return setHelper('This file needs a header row and at least one data row.')
    state.headers = parsed[0]
    state.rows = parsed.slice(1).filter((row) => row.length === state.headers.length)
    state.fileName = file.name
    $('#file-readout').textContent = `${file.name} · ${state.rows.length} rows · ${state.headers.length} columns`
    $('#target').innerHTML = state.headers.map((header, index) => `<option value="${index}" ${index === state.headers.length - 1 ? 'selected' : ''}>${escapeHtml(header)}</option>`).join('')
    $('#target').disabled = false
    $('#run-button').disabled = false
    setHelper('Ready to run. The last column is selected as the default target.')
  }
  reader.readAsText(file)
}

function setHelper(message) { $('#helper').textContent = message }
function numeric(value) { return value !== '' && Number.isFinite(Number(value)) }
function mean(values) { return values.reduce((sum, value) => sum + value, 0) / values.length }
function renderTable(headers, rows) { return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>` }

function classification(rows, targetIndex, testRatio) {
  const featureIndices = state.headers.map((_, index) => index).filter((index) => index !== targetIndex)
  const splitIndex = Math.max(1, Math.floor(rows.length * (1 - testRatio)))
  const train = rows.slice(0, splitIndex); const test = rows.slice(splitIndex)
  const predict = (row) => {
    const distances = train.map((item) => ({ label: item[targetIndex], distance: Math.sqrt(featureIndices.reduce((sum, index) => { const left = Number(item[index]); const right = Number(row[index]); return sum + (Number.isFinite(left) && Number.isFinite(right) ? (left - right) ** 2 : item[index] === row[index] ? 0 : 1) }, 0)) })).sort((a, b) => a.distance - b.distance).slice(0, 5)
    const counts = distances.reduce((result, item) => { result[item.label] = (result[item.label] || 0) + 1; return result }, {})
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }
  const predictions = test.map((row) => ({ actual: row[targetIndex], predicted: predict(row), row }))
  const labels = [...new Set(rows.map((row) => row[targetIndex]))]; const correct = predictions.filter((item) => item.actual === item.predicted).length
  const accuracy = predictions.length ? correct / predictions.length : 0
  const scores = labels.map((label) => { const tp = predictions.filter((item) => item.actual === label && item.predicted === label).length; const fp = predictions.filter((item) => item.actual !== label && item.predicted === label).length; const fn = predictions.filter((item) => item.actual === label && item.predicted !== label).length; const precision = tp / (tp + fp || 1); const recall = tp / (tp + fn || 1); return { precision, recall, f1: 2 * precision * recall / (precision + recall || 1) } })
  return { predictions, metrics: [{ label: 'Accuracy', value: accuracy }, { label: 'Precision', value: mean(scores.map((score) => score.precision)) }, { label: 'Recall', value: mean(scores.map((score) => score.recall)) }, { label: 'F1 score', value: mean(scores.map((score) => score.f1)) }], chartData: labels.map((label) => ({ label, value: rows.filter((row) => row[targetIndex] === label).length })), model: 'KNN classifier' }
}

function regression(rows, targetIndex, testRatio) {
  const featureIndex = state.headers.map((_, index) => index).find((index) => index !== targetIndex && rows.every((row) => numeric(row[index])))
  const usable = rows.filter((row) => numeric(row[targetIndex]) && numeric(row[featureIndex]))
  const splitIndex = Math.max(1, Math.floor(usable.length * (1 - testRatio))); const train = usable.slice(0, splitIndex); const test = usable.slice(splitIndex); const xMean = mean(train.map((row) => Number(row[featureIndex]))); const yMean = mean(train.map((row) => Number(row[targetIndex]))); const slope = train.reduce((sum, row) => sum + (Number(row[featureIndex]) - xMean) * (Number(row[targetIndex]) - yMean), 0) / (train.reduce((sum, row) => sum + (Number(row[featureIndex]) - xMean) ** 2, 0) || 1); const intercept = yMean - slope * xMean
  const predictions = test.map((row) => ({ actual: Number(row[targetIndex]), predicted: intercept + slope * Number(row[featureIndex]), row })); const errors = predictions.map((item) => item.actual - item.predicted); const mse = mean(errors.map((error) => error ** 2)); const baseline = mean(test.map((row) => Number(row[targetIndex]))); const total = test.reduce((sum, row) => sum + (Number(row[targetIndex]) - baseline) ** 2, 0) || 1
  return { predictions, metrics: [{ label: 'R² score', value: 1 - errors.reduce((sum, error) => sum + error ** 2, 0) / total }, { label: 'MAE', value: mean(errors.map((error) => Math.abs(error))) }, { label: 'RMSE', value: Math.sqrt(mse) }, { label: 'Rows tested', value: predictions.length, raw: true }], chartData: predictions.map((item) => ({ label: item.actual, value: item.predicted })), model: `Linear regression · ${state.headers[featureIndex]}` }
}

function drawChart(data, isRegression) {
  const canvas = $('#chart'); const context = canvas.getContext('2d'); const width = canvas.width; const height = canvas.height; context.clearRect(0, 0, width, height); context.strokeStyle = '#c7d4e2'; context.fillStyle = '#58718b'; context.font = '13px Arial'; context.beginPath(); context.moveTo(44, 18); context.lineTo(44, height - 36); context.lineTo(width - 20, height - 36); context.stroke(); const max = Math.max(...data.map((item) => isRegression ? Math.max(item.label, item.value) : item.value), 1)
  if (isRegression) { context.fillStyle = '#4a90b8'; data.forEach((item, index) => { const x = 55 + index * ((width - 90) / Math.max(data.length - 1, 1)); const y = height - 38 - (item.value / max) * (height - 65); context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill() }) } else { const barWidth = (width - 80) / data.length - 12; data.forEach((item, index) => { const barHeight = (item.value / max) * (height - 70); const x = 56 + index * (barWidth + 12); context.fillStyle = '#4a90b8'; context.fillRect(x, height - 37 - barHeight, barWidth, barHeight); context.fillStyle = '#58718b'; context.fillText(String(item.label).slice(0, 12), x, height - 16); context.fillText(String(item.value), x, height - 44 - barHeight) }) }
}

function runModel() {
  const targetIndex = Number($('#target').value); const task = $('#task').value; const testRatio = Number($('#test-size').value) / 100; const result = task === 'classification' ? classification(state.rows, targetIndex, testRatio) : regression(state.rows, targetIndex, testRatio)
  if (!result.predictions.length) return setHelper(task === 'regression' ? 'Regression needs a numeric target and at least one numeric feature.' : 'Add more rows so the test split contains data.')
  $('#empty-state').hidden = true; $('#result-content').hidden = false; $('#result-title').textContent = `${result.model} report`; $('#run-tag').textContent = `${state.fileName} · ${Math.round((1 - testRatio) * 100)} / ${Math.round(testRatio * 100)} split`; $('#metrics').innerHTML = result.metrics.map((metric) => `<div class="metric"><span>${metric.label}</span><strong>${metric.raw ? metric.value : task === 'classification' ? `${(metric.value * 100).toFixed(1)}%` : metric.value.toFixed(3)}</strong></div>`).join(''); $('#chart-title').textContent = task === 'classification' ? 'Target distribution' : 'Actual vs predicted'; $('#chart-note').textContent = task === 'classification' ? `${result.chartData.length} classes` : 'test set'; $('#row-note').textContent = `${Math.min(state.rows.length, 6)} of ${state.rows.length} rows`; $('#prediction-note').textContent = `${result.predictions.length} held-out rows`; $('#preview').innerHTML = renderTable(state.headers, state.rows.slice(0, 6)); $('#predictions').innerHTML = renderTable(['Actual', 'Predicted'], result.predictions.slice(0, 8).map((item) => [item.actual, typeof item.predicted === 'number' ? item.predicted.toFixed(2) : item.predicted])); drawChart(result.chartData, task === 'regression')
}

$('#file-input').addEventListener('change', (event) => loadFile(event.target.files[0]))
$('#dropzone').addEventListener('dragover', (event) => { event.preventDefault(); $('#dropzone').classList.add('dragging') })
$('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('dragging'))
$('#dropzone').addEventListener('drop', (event) => { event.preventDefault(); $('#dropzone').classList.remove('dragging'); loadFile(event.dataTransfer.files[0]) })
$('#test-size').addEventListener('input', (event) => { $('#split-value').value = `${event.target.value}%`; $('#split-value').textContent = `${event.target.value}%` })
$('#run-button').addEventListener('click', runModel)
