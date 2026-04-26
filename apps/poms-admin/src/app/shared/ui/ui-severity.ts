export const UI_TAG_SEVERITY_VALUES = ['success', 'secondary', 'info', 'warn', 'danger', 'contrast'] as const;
export type UiTagSeverityValue = (typeof UI_TAG_SEVERITY_VALUES)[number];
export type UiTagSeverity = UiTagSeverityValue | undefined;

export const UI_MESSAGE_SEVERITY_VALUES = ['success', 'info', 'warn', 'error', 'secondary', 'contrast'] as const;
export type UiMessageSeverity = (typeof UI_MESSAGE_SEVERITY_VALUES)[number];

export const UI_TOAST_SEVERITY_VALUES = UI_MESSAGE_SEVERITY_VALUES;
export type UiToastSeverity = (typeof UI_TOAST_SEVERITY_VALUES)[number];

export const UI_BUTTON_SEVERITY_VALUES = ['primary', 'secondary', 'success', 'info', 'warn', 'danger', 'contrast', 'help'] as const;
export type UiButtonSeverity = (typeof UI_BUTTON_SEVERITY_VALUES)[number];
