import type { ShaderNode } from '../core/models';
import { uid } from '../core/utils';

export class ShaderStackEngine {
  private stack: ShaderNode[] = [];

  setStack(nodes: ShaderNode[]): ShaderNode[] {
    this.stack = [...nodes];
    return this.stack;
  }

  addNode(node: Omit<ShaderNode, 'id'>): ShaderNode[] {
    this.stack = [...this.stack, { ...node, id: uid('shader') }];
    return this.stack;
  }

  toggleNode(id: string): ShaderNode[] {
    this.stack = this.stack.map((n) => (n.id === id ? { ...n, enabled: !n.enabled } : n));
    return this.stack;
  }

  updateUniform(id: string, key: string, value: number): ShaderNode[] {
    this.stack = this.stack.map((n) => (n.id === id ? { ...n, uniforms: { ...n.uniforms, [key]: value } } : n));
    return this.stack;
  }

  removeNode(id: string): ShaderNode[] {
    this.stack = this.stack.filter((n) => n.id !== id);
    return this.stack;
  }

  reorder(fromIndex: number, toIndex: number): ShaderNode[] {
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= this.stack.length || toIndex >= this.stack.length) return this.stack;
    const copy = [...this.stack];
    const [item] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, item);
    this.stack = copy;
    return this.stack;
  }

  getStack(): ShaderNode[] {
    return this.stack;
  }

  toUniformMap(): Record<string, number> {
    return this.stack.reduce<Record<string, number>>((acc, node) => {
      if (!node.enabled) return acc;
      for (const [k, v] of Object.entries(node.uniforms)) acc[`${node.primitive}.${k}`] = v;
      return acc;
    }, {});
  }
}
