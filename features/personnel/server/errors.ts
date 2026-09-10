export class PersonnelError extends Error {
  constructor(message: string, public status = 400, public issues?: { row: number; field: string; message: string }[]) {
    super(message);
  }
}
