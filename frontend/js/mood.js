
async function getCurrentUser() {
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = await res.json();
    return data.user;
  } catch (err) {
    return null;
  }
}
// Mood graph page script for whisper deploy
// Fetches mood entries from the backend and renders a line chart summarizing daily mood trends.
document.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('moodChart').getContext('2d');
    const rangeButtons = {
        '7': document.getElementById('range7'),
        '30': document.getElementById('range30'),
        'all': document.getElementById('rangeAll')
    };

    // Mood numeric values for plotting
    const moodValues = {
        '😢': 1,
        '🥺': 1,
        '😰': 2,
        '😠': 2,
        '😐': 3,
        '🤔': 3,
        '😴': 3,
        '😌': 4,
        '😊': 5,
        '🤗': 5,
        '😍': 5
    };

    let moodEntries = [];
    let moodChart;

    async function loadMoods() {
        try {
            const user = await getCurrentUser();
        if (!user) { alert('กรุณาเข้าสู่ระบบ'); return; }
        const userId = user._id;
            if (!userId) return;
            const res = await fetch(`/api/moods?userId=${encodeURIComponent(userId)}`);
            const data = await res.json();
            moodEntries = data.map(item => ({ mood: item.mood, timestamp: item.timestamp }));
            moodEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            initChart('all');
        } catch (err) {
            console.error('Error loading moods', err);
        }
    }

    // Aggregate mood entries by date and pick the most recent entry for that day.
    // Instead of averaging all moods, this function returns the last mood recorded
    // for each day so that the graph reflects the latest feeling rather than
    // smoothing out multiple entries. This addresses user feedback that
    // subsequent mood selections should overwrite earlier moods on the same day.
    function aggregateByDay(entries) {
        const map = {};
        entries.forEach(item => {
            const dateStr = item.timestamp.split('T')[0];
            // Keep the most recent mood entry for each day
            if (!map[dateStr] || new Date(item.timestamp) > new Date(map[dateStr].timestamp)) {
                map[dateStr] = item;
            }
        });
        const aggregated = [];
        Object.keys(map).forEach(dateStr => {
            const item = map[dateStr];
            const mood = item.mood;
            const value = moodValues[mood] || 3;
            aggregated.push({ date: dateStr, avgValue: value, mood: mood });
        });
        aggregated.sort((a, b) => new Date(a.date) - new Date(b.date));
        return aggregated;
    }

    function getFilteredData(range) {
        let aggregated = aggregateByDay(moodEntries);
        if (range === 7 || range === 30) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - range);
            aggregated = aggregated.filter(item => new Date(item.date) >= cutoff);
        }
        const labels = aggregated.map(item => {
            const d = new Date(item.date);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
        });
        const data = aggregated.map(item => moodValues[item.mood] || 3);
        const emojis = aggregated.map(item => item.mood);
        return { labels, data, emojis };
    }

    // Emoji plugin for Chart.js
    const emojiPlugin = {
        id: 'emojiPlugin',
        afterDatasetDraw(chart) {
            const { ctx } = chart;
            const dataset = chart.data.datasets[0];
            ctx.save();
            dataset.data.forEach((value, index) => {
                const meta = chart.getDatasetMeta(0);
                const x = meta.data[index].x;
                const y = meta.data[index].y;
                ctx.font = '24px serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(dataset.emojis[index], x, y - 18);
            });
            ctx.restore();
        }
    };

    function initChart(rangeKey) {
        const range = rangeKey === 'all' ? 'all' : parseInt(rangeKey);
        const { labels, data, emojis } = getFilteredData(range);
        if (moodChart) {
            moodChart.destroy();
        }
        moodChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: '',
                    data: data,
                    emojis: emojis,
                    borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#9c88ff',
                    backgroundColor: 'rgba(156, 136, 255, 0.2)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }]
            },
            options: {
                scales: {
                    /* Hide numeric y-axis values while preserving relative heights. */
                    y: {
                        min: 0,
                        max: 5.5,
                        ticks: {
                            display: false,
                            stepSize: 1
                        },
                        grid: {
                            display: false
                        },
                        title: {
                            display: false,
                            text: 'ระดับอารมณ์'
                        }
                    },
                    /* Keep the x-axis with its title visible */
                    x: {
                        title: {
                            display: true,
                            text: 'วัน'
                        },
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: { legend: { display: false } },
                maintainAspectRatio: false
            },
            plugins: [emojiPlugin]
        });
        // highlight active button
        Object.values(rangeButtons).forEach(btn => btn.classList.remove('button-primary'));
        rangeButtons[rangeKey].classList.add('button-primary');
    }

    // Range button events
    Object.keys(rangeButtons).forEach(key => {
        rangeButtons[key].addEventListener('click', () => {
            initChart(key);
        });
    });

    // Load moods and initialize chart
    loadMoods();
});
