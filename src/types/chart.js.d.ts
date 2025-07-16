declare module 'chart.js' {
  export class Chart {
    constructor(ctx: CanvasRenderingContext2D | HTMLCanvasElement, config: any);
    update(): void;
    destroy(): void;
    
    static register(...items: any[]): void;
  }
  
  export const registerables: any[];
}