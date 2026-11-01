// Seed of TenantScopedRepo (AD-010): a filter without `Tenant` is a compile-time
// TYPE error, not a runtime check.
export const tenantScoped = <F extends { Tenant: string }>(filter: F): F => filter;
