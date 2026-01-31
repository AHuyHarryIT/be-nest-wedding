export interface SelectionItem<TExtra = unknown> {
  value: number | string;
  label: string;
  extra?: TExtra;
}

export interface SelectionResponse<TExtra = unknown> {
  items: SelectionItem<TExtra>[];
  meta: {
    page: number;
    limit: number;
    hasNext: boolean;
  };
}
