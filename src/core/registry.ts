/**
 * 通用插件式注册表：解析器、声部引擎等均可按 id 注册与查询。
 */
export class Registry<T extends { id: string }> {
  private readonly order: string[] = [];
  private readonly map = new Map<string, T>();

  register(item: T): void {
    if (!this.map.has(item.id)) this.order.push(item.id);
    this.map.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.map.get(id);
  }

  /** 注册顺序（稳定，便于 UI 下拉） */
  all(): readonly T[] {
    return this.order.map((id) => this.map.get(id)!);
  }
}
