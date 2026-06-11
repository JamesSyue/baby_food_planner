type InventoryCodeSource = {
  code: string;
  category: string;
};

const INVENTORY_CODE_PATTERN = /^([A-Z])(\d+)$/;

export function getInventoryCodePrefix(category: string) {
  const normalizedCategory = String(category || "").trim();

  if (normalizedCategory.includes("蔬菜")) {
    return "V";
  }

  if (normalizedCategory.includes("澱粉")) {
    return "S";
  }

  if (normalizedCategory.includes("水果")) {
    return "F";
  }

  if (normalizedCategory.includes("蛋白")) {
    return "P";
  }

  return "M";
}

function formatInventoryCode(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(3, "0")}`;
}

function parseInventoryCode(code: string) {
  const match = String(code || "").trim().toUpperCase().match(INVENTORY_CODE_PATTERN);

  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    sequence: Number(match[2]),
  };
}

export function assignInventoryCodes<T extends InventoryCodeSource>(items: T[]) {
  const reservedSequences = new Map<string, Set<number>>();
  const assignedCodes = new Map<number, string>();

  items.forEach((item, index) => {
    const prefix = getInventoryCodePrefix(item.category);
    const parsed = parseInventoryCode(item.code);

    if (!parsed || parsed.prefix !== prefix || !Number.isFinite(parsed.sequence) || parsed.sequence <= 0) {
      return;
    }

    const usedSequences = reservedSequences.get(prefix) ?? new Set<number>();

    if (usedSequences.has(parsed.sequence)) {
      return;
    }

    usedSequences.add(parsed.sequence);
    reservedSequences.set(prefix, usedSequences);
    assignedCodes.set(index, formatInventoryCode(prefix, parsed.sequence));
  });

  return items.map((item, index) => {
    const existingCode = assignedCodes.get(index);

    if (existingCode) {
      return {
        ...item,
        code: existingCode,
      };
    }

    const prefix = getInventoryCodePrefix(item.category);
    const usedSequences = reservedSequences.get(prefix) ?? new Set<number>();
    let nextSequence = 1;

    while (usedSequences.has(nextSequence)) {
      nextSequence += 1;
    }

    usedSequences.add(nextSequence);
    reservedSequences.set(prefix, usedSequences);

    return {
      ...item,
      code: formatInventoryCode(prefix, nextSequence),
    };
  });
}