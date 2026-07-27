"""Base agent class."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

class AgentType(str, Enum):
    ORCHESTRATOR = "ORCHESTRATOR"
    PRODUCT_MANAGER = "PRODUCT_MANAGER"
    ARCHITECT = "ARCHITECT"
    DEVELOPER = "DEVELOPER"
    REVIEWER = "REVIEWER"
    TESTER = "TESTER"
    SECURITY = "SECURITY"
    DEVOPS = "DEVOPS"

class AgentStatus(str, Enum):
    IDLE = "IDLE"
    PLANNING = "PLANNING"
    EXECUTING = "EXECUTING"
    WAITING = "WAITING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

@dataclass
class AgentContext:
    task_id: str
    project_id: str
    instruction: str
    parent_run_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentResult:
    success: bool
    output: str
    artifacts: list[str] = field(default_factory=list)
    tokens_used: int = 0
    cost_usd: float = 0.0
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

class BaseAgent(ABC):
    def __init__(self) -> None:
        self._status = AgentStatus.IDLE

    @property
    @abstractmethod
    def agent_type(self) -> AgentType: ...

    @property
    @abstractmethod
    def system_prompt(self) -> str: ...

    @property
    def status(self) -> AgentStatus:
        return self._status

    @abstractmethod
    async def execute(self, context: AgentContext) -> AgentResult: ...

    async def initialize(self) -> None: pass
    async def cleanup(self) -> None: pass

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} type={self.agent_type.value} status={self.status.value}>"
