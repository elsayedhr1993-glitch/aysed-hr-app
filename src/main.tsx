// أضف هذا الجزء في ملف main.tsx لضمان احترافية الخطوط والأرقام
const injectGlobalStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
    :root {
        --odoo-purple: #71639e;
        --odoo-green: #008784;
    }
    body {
        font-family: 'Tajawal', 'Inter', sans-serif !important;
        background-color: #f8f9fa !important;
    }
    /* تنسيق الأرقام الكويتية والمالية لتكون واضحة */
    .o_stat_value, .salary-amount {
        font-family: 'Inter', sans-serif !important;
        font-weight: 700;
        color: #2c3e50;
    }
  `;
  document.head.appendChild(style);
};

injectGlobalStyles(); // تشغيل الألوان والخطوط فوراً
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
