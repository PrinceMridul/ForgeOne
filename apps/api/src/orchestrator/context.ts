import type { AgentType } from '@forgeone/types';
import type { GeneratedArtifact, GraphArtifact, ExecutionEvent } from './types';

export class ArtifactGraph {
  private readonly artifacts: Map<string, GraphArtifact> = new Map();
  private readonly typeToArtifacts: Map<string, string[]> = new Map();
  private readonly filenameVersions: Map<string, number> = new Map();

  public addArtifact(params: {
    id?: string;
    type: string;
    producerAgent: AgentType;
    filename: string;
    mimeType: string;
    content: string;
    dependencies?: string[];
    runId: string;
    inRepository?: boolean;
  }): GraphArtifact {
    const currentVersion = (this.filenameVersions.get(params.filename) ?? 0) + 1;
    this.filenameVersions.set(params.filename, currentVersion);

    const id = params.id ?? crypto.randomUUID();
    const sizeBytes = Buffer.byteLength(params.content, 'utf-8');

    const artifact: GraphArtifact = {
      id,
      type: params.type,
      producerAgent: params.producerAgent,
      agentType: params.producerAgent,
      createdAt: new Date().toISOString(),
      version: currentVersion,
      dependencies: params.dependencies ?? [],
      consumers: [],
      downloadUrl: `/api/v1/runs/${params.runId}/artifacts/${encodeURIComponent(params.filename)}/download`,
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes,
      content: params.content,
      runId: params.runId,
      storageKey: `artifacts/${params.runId}/${params.filename}`,
      inRepository: params.inRepository ?? false,
    };

    Object.freeze(artifact);
    this.artifacts.set(id, artifact);

    const existingList = this.typeToArtifacts.get(params.type) ?? [];
    existingList.push(id);
    this.typeToArtifacts.set(params.type, existingList);

    return artifact;
  }

  public getArtifact(id: string): GraphArtifact | undefined {
    return this.artifacts.get(id);
  }

  public getArtifacts(): GraphArtifact[] {
    return Array.from(this.artifacts.values());
  }

  public getArtifactsByType(type: string): GraphArtifact[] {
    const ids = this.typeToArtifacts.get(type) ?? [];
    return ids.map((id) => this.artifacts.get(id)!).filter((a): a is GraphArtifact => Boolean(a));
  }

  public getLatestArtifactByFilename(filename: string): GraphArtifact | undefined {
    const matching = this.getArtifacts().filter((a) => a.filename === filename);
    if (matching.length === 0) return undefined;
    return matching.reduce((prev, current) => (current.version > prev.version ? current : prev));
  }

  public consumeArtifact(id: string, consumerAgent: AgentType): GraphArtifact | undefined {
    const artifact = this.artifacts.get(id);
    if (!artifact) return undefined;

    if (!artifact.consumers.includes(consumerAgent)) {
      const updatedArtifact: GraphArtifact = {
        ...artifact,
        consumers: [...artifact.consumers, consumerAgent],
      };
      Object.freeze(updatedArtifact);
      this.artifacts.set(id, updatedArtifact);
      return updatedArtifact;
    }

    return artifact;
  }

  public hasArtifactTypes(requiredTypes: string[]): boolean {
    return requiredTypes.every((type) => {
      const list = this.typeToArtifacts.get(type);
      return Boolean(list && list.length > 0);
    });
  }
}

export class SharedContext {
  public readonly runId: string;
  public readonly projectId: string;
  public readonly title: string;
  public readonly description: string;
  public readonly artifactGraph: ArtifactGraph;
  private readonly memory: Map<string, unknown> = new Map();
  private readonly events: ExecutionEvent[] = [];

  constructor(runId: string, projectId: string, title: string, description: string) {
    this.runId = runId;
    this.projectId = projectId;
    this.title = title;
    this.description = description;
    this.artifactGraph = new ArtifactGraph();
  }

  public set<T>(key: string, value: T): void {
    this.memory.set(key, value);
  }

  public get<T>(key: string): T | undefined {
    return this.memory.get(key) as T | undefined;
  }

  public addArtifact(artifact: GeneratedArtifact): void {
    this.artifactGraph.addArtifact({
      id: artifact.id,
      type: artifact.type || 'DOCUMENT',
      producerAgent: artifact.producerAgent,
      filename: artifact.filename,
      mimeType: artifact.mimeType,
      content: artifact.content,
      dependencies: artifact.dependencies,
      runId: this.runId,
    });
  }

  public getArtifacts(): GeneratedArtifact[] {
    return this.artifactGraph.getArtifacts();
  }

  public getArtifactByName(filename: string): GeneratedArtifact | undefined {
    return this.artifactGraph.getLatestArtifactByFilename(filename);
  }

  public addEvent(event: ExecutionEvent): void {
    this.events.push(event);
  }

  public getEvents(): ExecutionEvent[] {
    return [...this.events];
  }
}
