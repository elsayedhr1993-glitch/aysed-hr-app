export const formatKWD = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 3,
        maximumFractionDigits: 3
    }).format(amount) + ' د.ك';
};
