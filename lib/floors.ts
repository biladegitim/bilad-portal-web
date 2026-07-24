const floorOrderAliases: Record<string, number> = {
  bodrum: -1,
  "bodrum kat": -1,
  zemin: 0,
  "zemin kat": 0,
  giris: 0,
  "giris kat": 0,
  giriş: 0,
  "giriş kat": 0,
  "1": 1,
  "1. kat": 1,
  "1 kat": 1,
  "birinci kat": 1,
  "2": 2,
  "2. kat": 2,
  "2 kat": 2,
  "ikinci kat": 2,
  "3": 3,
  "3. kat": 3,
  "3 kat": 3,
  "ucuncu kat": 3,
  "üçüncü kat": 3,
};

function normalizeFloorName(floor: string) {
  return floor
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function getFloorOrder(floor: string) {
  const normalized = normalizeFloorName(floor);
  const directOrder = floorOrderAliases[normalized];

  if (directOrder !== undefined) return directOrder;

  const numberedFloor = normalized.match(/^(\d+)(?:\.|\s)?\s*kat$/);

  if (numberedFloor) return Number(numberedFloor[1]);

  if (normalized.includes("bodrum")) return -1;
  if (normalized.includes("zemin") || normalized.includes("giris")) return 0;

  return 100;
}

export function sortFloors(floors: string[], unassignedFloor?: string) {
  return [...floors].sort((first, second) => {
    const firstUnassigned = unassignedFloor && first === unassignedFloor;
    const secondUnassigned = unassignedFloor && second === unassignedFloor;

    if (firstUnassigned && !secondUnassigned) return 1;
    if (!firstUnassigned && secondUnassigned) return -1;

    const firstOrder = getFloorOrder(first);
    const secondOrder = getFloorOrder(second);

    if (firstOrder !== secondOrder) return firstOrder - secondOrder;

    return first.localeCompare(second, "tr-TR", { numeric: true });
  });
}
