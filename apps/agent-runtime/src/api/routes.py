"""FastAPI routes for agent control."""
from fastapi import APIRouter
from src.api.schemas import TaskSubmission, TaskResponse, AgentStatusResponse

router = APIRouter(prefix="/api/v1", tags=["agents"])

@router.post("/tasks", response_model=TaskResponse)
async def submit_task(task: TaskSubmission) -> TaskResponse:
    return TaskResponse(task_id="placeholder", status="PENDING", message=f"Task '{task.title}' submitted")

@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_status(task_id: str) -> TaskResponse:
    return TaskResponse(task_id=task_id, status="PENDING", message="Not yet implemented")

@router.get("/agents/status", response_model=list[AgentStatusResponse])
async def get_agent_statuses() -> list[AgentStatusResponse]:
    return []

@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str) -> dict[str, str]:
    return {"task_id": task_id, "status": "CANCELLED"}
