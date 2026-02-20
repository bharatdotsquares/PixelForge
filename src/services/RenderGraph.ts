import type { ShaderNode } from '../core/models';

export interface RenderPassDescriptor {
  id: string;
  input: 'source' | 'pingA' | 'pingB';
  output: 'pingA' | 'pingB' | 'screen';
  node: ShaderNode;
}

export class RenderGraph {
  build(shaderStack: ShaderNode[]): RenderPassDescriptor[] {
    let input: 'source' | 'pingA' | 'pingB' = 'source';
    let output: 'pingA' | 'pingB' = 'pingA';

    const passes = shaderStack
      .filter((node) => node.enabled)
      .map((node) => {
        const pass: RenderPassDescriptor = {
          id: `${node.id}_pass`,
          input,
          output,
          node
        };
        input = output;
        output = output === 'pingA' ? 'pingB' : 'pingA';
        return pass;
      });

    if (!passes.length) return [];

    return passes.map((pass, index) => (index === passes.length - 1 ? { ...pass, output: 'screen' } : pass));
  }
}
