import json
import sys
from datetime import datetime, timezone


def healthcheck():
    return {
        "status": "ok",
        "service": "python-renderer",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def main():
    if "--healthcheck" in sys.argv:
        print(json.dumps(healthcheck()))
        return

    raw = sys.stdin.read().strip()

    if not raw:
        print(json.dumps(error_response("No input payload received.")))
        return

    try:
        request = json.loads(raw)
    except json.JSONDecodeError:
        print(json.dumps(error_response("Invalid JSON input.")))
        return

    command = request.get("command")
    payload = request.get("payload", {})

    if command == "render-research-answer":
        print(json.dumps(render_research_answer(payload)))
        return

    print(json.dumps(error_response(f"Unsupported command: {command}")))


def render_research_answer(payload):
    context = payload.get("context", {}) or {}
    answer = payload.get("answer", {}) or {}
    sources = payload.get("sources", []) or []
    safety = payload.get("safety", {}) or {}

    sections = []

    sections.append(
        {
            "id": "summary",
            "title": "Summary",
            "content": answer.get("summary", ""),
        }
    )
    sections.append(
        {
            "id": "condition-overview",
            "title": "Condition Overview",
            "content": answer.get("conditionOverview", ""),
        }
    )
    sections.append(
        {
            "id": "research-insights",
            "title": "Research Insights",
            "items": [
                {
                    "heading": item.get("heading", ""),
                    "summary": item.get("summary", ""),
                    "sourceIds": item.get("sourceIds", []),
                }
                for item in answer.get("researchInsights", [])
            ],
        }
    )
    sections.append(
        {
            "id": "clinical-trials",
            "title": "Clinical Trials",
            "items": [
                {
                    "title": item.get("title", ""),
                    "status": item.get("status", ""),
                    "summary": item.get("summary", ""),
                    "location": item.get("location"),
                    "contact": item.get("contact"),
                    "sourceIds": item.get("sourceIds", []),
                }
                for item in answer.get("clinicalTrials", [])
            ],
        }
    )
    sections.append(
        {
            "id": "next-steps",
            "title": "Recommended Next Steps",
            "items": answer.get("recommendedNextSteps", []),
        }
    )

    return {
        "status": "ok",
        "renderedAt": datetime.now(timezone.utc).isoformat(),
        "rendering": {
            "format": "research-answer-v1",
            "patientContext": {
                "patientName": context.get("patientName", ""),
                "disease": context.get("disease", ""),
                "location": context.get("location", ""),
                "intent": context.get("intent", ""),
            },
            "headline": build_headline(context, answer),
            "sections": sections,
            "sourceCards": build_source_cards(sources),
            "safety": safety,
            "markdown": build_markdown(answer, sources, safety),
        },
    }


def build_headline(context, answer):
    disease = context.get("disease") or "the selected condition"
    overview = answer.get("conditionOverview", "")
    if overview:
        return f"Research-backed update for {disease}"
    return f"Research summary for {disease}"


def build_source_cards(sources):
    cards = []
    for source in sources[:8]:
        cards.append(
            {
                "id": source.get("id", ""),
                "title": source.get("title", ""),
                "platform": source.get("platform", ""),
                "year": source.get("year"),
                "authors": source.get("authors", []),
                "url": source.get("url", ""),
                "snippet": source.get("snippet", ""),
            }
        )
    return cards


def build_markdown(answer, sources, safety):
    lines = []

    if answer.get("summary"):
        lines.append("## Summary")
        lines.append(answer["summary"])
        lines.append("")

    if answer.get("conditionOverview"):
        lines.append("## Condition Overview")
        lines.append(answer["conditionOverview"])
        lines.append("")

    insights = answer.get("researchInsights", [])
    if insights:
        lines.append("## Research Insights")
        for item in insights:
            heading = item.get("heading", "Insight")
            summary = item.get("summary", "")
            lines.append(f"- **{heading}**: {summary}")
        lines.append("")

    trials = answer.get("clinicalTrials", [])
    if trials:
        lines.append("## Clinical Trials")
        for item in trials:
            title = item.get("title", "Trial")
            status = item.get("status", "UNKNOWN")
            summary = item.get("summary", "")
            lines.append(f"- **{title}** ({status}): {summary}")
        lines.append("")

    next_steps = answer.get("recommendedNextSteps", [])
    if next_steps:
        lines.append("## Recommended Next Steps")
        for step in next_steps:
            lines.append(f"- {step}")
        lines.append("")

    if sources:
        lines.append("## Sources")
        for source in sources[:8]:
            title = source.get("title", "Untitled source")
            platform = source.get("platform", "Unknown")
            year = source.get("year")
            url = source.get("url", "")
            year_part = f" ({year})" if year else ""
            url_part = f" - {url}" if url else ""
            lines.append(f"- {title} [{platform}]{year_part}{url_part}")
        lines.append("")

    if safety.get("medicalAdviceBoundary"):
        lines.append("## Safety")
        lines.append(safety["medicalAdviceBoundary"])
        if safety.get("escalation"):
          lines.append(safety["escalation"])

    return "\n".join(lines).strip()


def error_response(message):
    return {
        "status": "error",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    main()
