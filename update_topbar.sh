sed -i '/import {/s/$/, Bug/' src/components/OdooTopBar.tsx
sed -i 's/const OdooTopBar: React.FC<OdooTopBarProps> = ({/const isDebug = window.location.search.includes("debug=1");\nexport const OdooTopBar: React.FC<OdooTopBarProps> = ({/g' src/components/OdooTopBar.tsx
