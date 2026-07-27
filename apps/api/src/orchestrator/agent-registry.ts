import type { AgentType } from '@forgeone/types';
import type { IAgent } from './agent-interface';
import { ProductManagerAgent } from './agents/product-manager';
import { ArchitectAgent } from './agents/architect';
import { DeveloperAgent } from './agents/developer';
import { ReviewerAgent } from './agents/reviewer';
import { TesterAgent } from './agents/tester';
import { SecurityAgent } from './agents/security';
import { DevOpsAgent } from './agents/devops';
import { DocumentationAgent } from './agents/documentation';

export class AgentRegistry {
  private readonly agents: Map<AgentType, IAgent> = new Map();

  constructor() {
    this.register(new ProductManagerAgent());
    this.register(new ArchitectAgent());
    this.register(new DeveloperAgent());
    this.register(new ReviewerAgent());
    this.register(new TesterAgent());
    this.register(new SecurityAgent());
    this.register(new DevOpsAgent());
    this.register(new DocumentationAgent());
  }

  public register(agent: IAgent): void {
    this.agents.set(agent.agentType, agent);
  }

  public getAgent(agentType: AgentType): IAgent | undefined {
    return this.agents.get(agentType);
  }

  public getAllAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }
}
