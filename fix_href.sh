sed -i 's/window\.location\.href = "\/?debug=1";/setTimeout(() => { window.location.href = "\/?debug=1"; }, 1500);/g' src/apps/SettingsApp.tsx
