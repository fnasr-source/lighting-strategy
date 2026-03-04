export interface InvoiceOptionalAddOn {
    id: string;
    description: string;
    amount: number;
    defaultSelected?: boolean;
    selectable?: boolean;
}

const toNumber = (value: unknown): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export function normalizeInvoiceOptionalAddOns(rawOptionalAddOns: unknown): InvoiceOptionalAddOn[] {
    if (!Array.isArray(rawOptionalAddOns)) return [];

    const usedIds = new Set<string>();

    return rawOptionalAddOns.flatMap((item, index) => {
        if (!item || typeof item !== 'object') return [];

        const record = item as Record<string, unknown>;
        const description = toText(record.description) || toText(record.label) || toText(record.name);
        const amount = toNumber(record.amount);
        if (!description || amount <= 0) return [];

        const baseId = toText(record.id) || `optional-addon-${index + 1}`;
        let uniqueId = baseId;
        let duplicateCounter = 2;
        while (usedIds.has(uniqueId)) {
            uniqueId = `${baseId}-${duplicateCounter}`;
            duplicateCounter += 1;
        }
        usedIds.add(uniqueId);

        return [{
            id: uniqueId,
            description,
            amount,
            defaultSelected: record.defaultSelected === true,
            selectable: record.selectable !== false,
        }];
    });
}

export function normalizeSelectedOptionalAddOnIds(rawSelectedIds: unknown): string[] {
    if (!Array.isArray(rawSelectedIds)) return [];

    const uniqueIds = new Set<string>();
    for (const id of rawSelectedIds) {
        const normalized = toText(id);
        if (normalized) uniqueIds.add(normalized);
    }
    return Array.from(uniqueIds);
}

export function resolveInvoicePayableAmount(
    invoice: { totalDue?: unknown; optionalAddOns?: unknown },
    rawSelectedIds?: unknown,
) {
    const baseAmount = Math.max(0, toNumber(invoice.totalDue));
    const optionalAddOns = normalizeInvoiceOptionalAddOns(invoice.optionalAddOns);
    const selectableAddOns = optionalAddOns.filter((addOn) => addOn.selectable !== false);

    const hasExplicitSelection = Array.isArray(rawSelectedIds);
    const explicitSelection = normalizeSelectedOptionalAddOnIds(rawSelectedIds);
    const defaultSelection = selectableAddOns
        .filter((addOn) => addOn.defaultSelected)
        .map((addOn) => addOn.id);

    const selectedIdsSet = new Set(hasExplicitSelection ? explicitSelection : defaultSelection);
    const selectedOptionalAddOns = selectableAddOns.filter((addOn) => selectedIdsSet.has(addOn.id));
    const optionalAmount = selectedOptionalAddOns.reduce((sum, addOn) => sum + addOn.amount, 0);

    return {
        baseAmount,
        optionalAddOns,
        selectedOptionalAddOns,
        selectedOptionalAddOnIds: selectedOptionalAddOns.map((addOn) => addOn.id),
        optionalAmount,
        totalAmount: baseAmount + optionalAmount,
    };
}
