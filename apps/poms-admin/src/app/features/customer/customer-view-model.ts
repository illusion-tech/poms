import { CustomerAliasType, CustomerStatus, type CustomerDetailView, type CustomerListView } from '@poms/admin-data-access';
import type { CustomerFormValue } from './customer-form-dialog';

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
    [CustomerStatus.Active]: '启用',
    [CustomerStatus.Inactive]: '停用',
    [CustomerStatus.Merged]: '已合并'
};

export const CUSTOMER_ALIAS_TYPE_OPTIONS = [
    { label: '通用别名', value: CustomerAliasType.Alias },
    { label: '法定名称', value: CustomerAliasType.LegalName },
    { label: '简称', value: CustomerAliasType.ShortName },
    { label: '历史输入', value: CustomerAliasType.LegacyInput },
    { label: '导入名称', value: CustomerAliasType.ImportName }
];

export function customerStatusLabel(status: CustomerStatus): string {
    return CUSTOMER_STATUS_LABELS[status] ?? status;
}

export function customerStatusSeverity(status: CustomerStatus): 'success' | 'secondary' | 'warn' {
    if (status === CustomerStatus.Active) {
        return 'success';
    }

    if (status === CustomerStatus.Inactive) {
        return 'secondary';
    }

    return 'warn';
}

export function displayText(value: string | null | undefined, fallback: string): string {
    return value?.trim() ? value : fallback;
}

export function optionalText(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

export function toCustomerFormValue(customer: CustomerListView | CustomerDetailView): CustomerFormValue {
    return {
        displayName: customer.displayName,
        legalName: customer.legalName ?? '',
        shortName: customer.shortName ?? '',
        sourceChannel: customer.sourceChannel ?? '',
        remark: customer.remark ?? '',
        status: customer.status === CustomerStatus.Inactive ? CustomerStatus.Inactive : CustomerStatus.Active
    };
}

export function customerSearchText(customer: CustomerListView): string {
    return [customer.customerNo, customer.displayName, customer.legalName, customer.shortName, customer.ownerName, customer.ownerOrgName, customerStatusLabel(customer.status)].join(' ').trim().toLowerCase();
}
