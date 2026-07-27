FROM python:3.12-slim AS base
RUN pip install uv
WORKDIR /app

FROM base AS deps
COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

FROM base AS runner
RUN addgroup --system --gid 1001 forgeone && adduser --system --uid 1001 --gid 1001 forgeone
WORKDIR /app
COPY --from=deps /app/.venv ./.venv
COPY src/ ./src/
USER forgeone
EXPOSE 8000
ENV PATH="/app/.venv/bin:$PATH"
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
