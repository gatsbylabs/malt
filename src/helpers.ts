/**
 * find the next unused name
 * @param rawName
 * @param usedNames
 */
export function findUnusedName(rawName: string, usedNames: Set<string>) {
  let newName = rawName;
  let i = 0;
  while (usedNames.has(newName)) {
    newName = rawName + i;
    i++;
  }
  usedNames.add(newName);
  return newName;
}
