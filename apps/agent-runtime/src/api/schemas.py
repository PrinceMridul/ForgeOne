"""Pydantic schemas."""
from pydantic import BaseModel, Field

class TaskSubmission(BaseModel):
    project_id: str = Field(..., description="Project ID")
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field("", description="Task description")
    priority: int = Field(0, ge=0, le=10)

class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str
    agent_type: str | None = None
    progress: float | None = None

class AgentStatusResponse(BaseModel):
    agent_type: str
    status: str
    current_task_id: str | None = None
    tasks_completed: int = 0
