// utils/getDateRange.ts
export const getDateRange = (): string[] => {
    const result: string[] = [];
    const today = new Date();

    for (let i = -15; i <= 15; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        result.push(date.toISOString().split("T")[0]); // format: YYYY-MM-DD
    }

    return result;
};
