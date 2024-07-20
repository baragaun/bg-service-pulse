import {
  E2eTestSuite, E2eTestSuiteResult,
  HttpRequestConfig,
  Service,
  ServiceConfig,
  VerifyStatusResult
} from '@/definitions'
import { ServiceType } from '@/enums';
import fetchJson from '@/services/helpers/fetchJson';
import runE2eTestSuite from '@/services/helpers/e2eTesting/runE2eTestSuite';
import verifyStatusHelper from '@/services/helpers/verifyStatus';

export class GenericService implements Service {
  public type = ServiceType.generic;
  protected readonly config: ServiceConfig;

  public constructor(serviceConfig: ServiceConfig) {
    this.config = serviceConfig;
  }

  public name(): string {
    return this.config.name;
  }

  public enabled(): boolean {
    return this.config.enabled;
  }

  protected async status(request: HttpRequestConfig): Promise<any> {
    if (!this.config) {
      console.error('GenericService.status: no config');
      return;
    }

    const { data } = await fetchJson(request);

    return {
      service: this.config.name,
      url: request.url,
      status: data,
    };
  }

  public statuses(): Promise<any[]> {
    const promises = this.config.status.requests.map((request) => this.status(request));
    return Promise.all(promises);
  }

  public async verifyStatuses(): Promise<VerifyStatusResult[]> {
    const statuses = await this.statuses();
    return statuses.map((status) => {
      const requestConfig = this.config.status.requests.find((r) => r.url === status.url);

      if (!requestConfig) {
        console.error('GenericService.verifyStatuses: failed to find requestConfig.');
        return verifyStatusHelper(
          this.config.name,
          status,
          this.config.status,
          { url: status.url },
        )
      }

      return verifyStatusHelper(
        this.config.name,
        status,
        this.config.status,
        requestConfig,
      )
    });
  }

  public async runE2ETests(): Promise<E2eTestSuiteResult | undefined> {
    const e2eTestSuite: E2eTestSuite | undefined = this.config?.e2eTests;
    if (!e2eTestSuite) {
      return;
    }
    return runE2eTestSuite(e2eTestSuite);
  }
}