// libs/ui-features/src/sankey/sankey.types.ts

export type SankeyView = 'payment-type' | 'state' | 'demographic';

export interface SankeyNode {
  id: string;
  label: string;
  color?: string;
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}
