export interface Command {
  execute(): void;
  undo(): void;
  label: string;
}

export class CommandSystem {
  private history: Command[] = [];
  private future: Command[] = [];

  constructor(private maxDepth = 100) {}

  run(command: Command): void {
    command.execute();
    this.history.push(command);
    if (this.history.length > this.maxDepth) this.history.shift();
    this.future = [];
  }

  undo(): string | null {
    const command = this.history.pop();
    if (!command) return null;
    command.undo();
    this.future.push(command);
    return command.label;
  }

  redo(): string | null {
    const command = this.future.pop();
    if (!command) return null;
    command.execute();
    this.history.push(command);
    return command.label;
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }
}
