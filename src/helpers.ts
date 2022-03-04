export function findUnusedName(rawName: string, usedNames: Set<string>) {
  let newName = rawName;
  for (let i = 0; usedNames.has(newName); i++) {
    newName = rawName + i;
  }
  return newName;
}
