import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import logger from '../../../config/logger';
import ApiError from '../../../utils/ApiError';

export interface CourierRequestOptions extends AxiosRequestConfig {
  providerName: string;
  retries?: number;
}

export class CourierHttpClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000, // 10 second timeout for all courier APIs
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Executes a request with automatic retries, error normalization, and logging.
   */
  public async request<T = any>(options: CourierRequestOptions): Promise<T> {
    const maxRetries = options.retries ?? 2;
    let attempts = 0;
    let lastError: any = null;

    const method = options.method || 'GET';
    const endpoint = options.url || '/';

    while (attempts <= maxRetries) {
      attempts++;
      const startTime = Date.now();

      try {
        const response: AxiosResponse<T> = await this.client.request(options);
        const duration = Date.now() - startTime;

        logger.debug(
          `[Courier: ${options.providerName}] ${method} ${endpoint} - ${response.status} (${duration}ms)`,
        );

        return response.data;
      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        const status = error.response?.status;
        const errorMessage = error.response?.data?.message || error.message;

        logger.warn(
          `[Courier: ${options.providerName}] ${method} ${endpoint} - Failed attempt ${attempts}/${
            maxRetries + 1
          } (${duration}ms) - ${status || 'Network Error'}: ${errorMessage}`,
        );

        // Don't retry on client errors (4xx) except rate limits (429)
        if (status && status >= 400 && status < 500 && status !== 429) {
          throw this.normalizeError(options.providerName, error);
        }

        if (attempts <= maxRetries) {
          // Exponential backoff: 500ms, 1000ms, etc.
          const delay = 500 * Math.pow(2, attempts - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw this.normalizeError(options.providerName, lastError);
  }

  private normalizeError(providerName: string, error: any): ApiError {
    const status = error.response?.status;
    const providerMessage =
      error.response?.data?.message || error.response?.data?.error || error.message;

    if (!status) {
      return new ApiError(
        503,
        `${providerName} integration error: Service unavailable or network timeout`,
      );
    }

    if (status === 401 || status === 403) {
      logger.error(`[Courier: ${providerName}] Authentication failed. Check API keys.`);
      return new ApiError(502, `${providerName} integration error: Authentication failed`);
    }

    if (status === 429) {
      return new ApiError(429, `${providerName} integration error: Rate limit exceeded`);
    }

    return new ApiError(
      status >= 500 ? 502 : 400,
      `${providerName} integration error: ${providerMessage}`,
    );
  }
}
