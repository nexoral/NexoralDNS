
/**
 * Service class to check the health of the application.
 * 
 * @export
 * @class HealthService
 */
export default class HealthService {
  static async checkHealth(): Promise<any> {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}