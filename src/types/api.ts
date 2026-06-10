export interface ApiErrorShape {
  message: string;
  code?: string;
  details?: unknown;
}

export interface SelectOption {
  value: string;
  label: string;
}
