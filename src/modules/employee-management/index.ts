import type { FastifyInstance } from "fastify";
import { employeeRoutes } from "./employee.routes";

export async function registerEmployeeManagementModule(
  app: FastifyInstance,
): Promise<void> {
  await app.register(employeeRoutes);
}

export { employeeRoutes } from "./employee.routes";
export { EmployeeRepository } from "./employee.repository";
export {
  EMPLOYEE_PERMISSIONS,
  type Employee,
  type EmployeePermission,
  type EmployeeStatus,
} from "./employee.types";
