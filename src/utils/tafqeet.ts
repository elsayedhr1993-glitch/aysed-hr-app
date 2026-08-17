export function tafqeet(num: number): string {
    // نتعامل مع الرقم الصحيح فقط (الدنانير)
    const intPart = Math.floor(num);
    const fractionPart = Math.round((num - intPart) * 1000); // الفلوس بـ 3 خانات

    if (intPart === 0 && fractionPart === 0) return 'صفر';

    const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر'];
    const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
    const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

    function convertHundreds(n: number): string {
        let str = '';
        const h = Math.floor(n / 100);
        const r = n % 100;
        
        if (h > 0) str += hundreds[h];
        
        if (r > 0) {
            if (str !== '') str += ' و';
            if (r <= 12) {
                str += ones[r];
            } else if (r < 20) {
                const o = r % 10;
                str += (o === 1 ? 'أحد' : o === 2 ? 'اثنا' : ones[o]) + ' عشر';
            } else {
                const t = Math.floor(r / 10);
                const o = r % 10;
                if (o > 0) {
                    str += ones[o] + ' و' + tens[t];
                } else {
                    str += tens[t];
                }
            }
        }
        return str;
    }

    let dinarsText = '';
    const t = Math.floor(intPart / 1000);
    const rem = intPart % 1000;

    if (t > 0) {
        if (t === 1) dinarsText += 'ألف';
        else if (t === 2) dinarsText += 'ألفان';
        else if (t >= 3 && t <= 10) dinarsText += convertHundreds(t) + ' آلاف';
        else dinarsText += convertHundreds(t) + ' ألفاً';
    }

    if (rem > 0) {
        if (dinarsText !== '') dinarsText += ' و';
        dinarsText += convertHundreds(rem);
    }

    let result = '';
    if (intPart > 0) {
        result += dinarsText + ' دينار كويتي';
    }

    if (fractionPart > 0) {
        if (result !== '') result += ' و ';
        result += convertHundreds(fractionPart) + ' فلس';
    }

    return result + ' لا غير';
}
