import type { ApiMessageKey } from './messages.js';

export * from './messages.js';

// `message` is always a translation key (messages.ts) — the front-end
// translates it with `t()`. `''` only on success without a message (respObj default).
export type ApiResponse<T = undefined> = {
  success: boolean;
  data?: T;
  message?: string;
};

export const respObj = <T>(params: { data?: T; message?: ApiMessageKey }): ApiResponse<T> => {
  return { success: true, data: params.data, message: params.message ?? '' };
};

export const badRespObj = (params: { message: ApiMessageKey }): ApiResponse<never> => {
  return { success: false, message: params.message };
};

export const returnData = <T>(data: T): { data: T } => {
  return { data };
};

export const returnMessage = (message: ApiMessageKey): { message: ApiMessageKey } => {
  return { message };
};
