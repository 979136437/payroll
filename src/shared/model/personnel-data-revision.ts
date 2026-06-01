let personnelDataRevision = 0

export function getPersonnelDataRevision() {
  return personnelDataRevision
}

export function markPersonnelDataChanged() {
  personnelDataRevision += 1
  return personnelDataRevision
}

export function resetPersonnelDataRevision() {
  personnelDataRevision = 0
}
