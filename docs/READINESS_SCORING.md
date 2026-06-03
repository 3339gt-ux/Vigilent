# Readiness Scoring

Vigilen readiness scoring is intentionally simple and transparent.

## Point Values

| Status | Points |
| --- | ---: |
| Green | 100 |
| Amber | 50 |
| Red | 0 |
| Grey | Excluded |

## Overall Score

Overall readiness is the rounded average of all assessed requirement scores:

```text
overall_score = round(sum(scored_requirement_points) / count(scored_requirements))
```

Grey requirements are excluded from both the numerator and denominator.

## Category Scores

Category readiness uses the same average formula, filtered to one requirement category:

```text
category_score = round(sum(category_requirement_points) / count(scored_category_requirements))
```

## Risk Scores

Risk readiness uses the same average formula, filtered to one risk level:

```text
risk_score = round(sum(risk_requirement_points) / count(scored_risk_requirements))
```

## Score Change Reasons

The engine records explicit reasons for each requirement score.

Examples:

- Missing linked evidence sets a requirement to Red.
- Expired evidence sets a requirement to Red.
- Evidence expiring within 30 days sets a requirement to Amber unless a Red reason exists.
- An overdue review sets a requirement to Red.
- A review due within 30 days sets a requirement to Amber unless a Red reason exists.
- An overdue open action sets a requirement to Red.
- Any other open action sets a requirement to Amber unless a Red reason exists.

## Limitations

The first version calculates current readiness only. The dashboard includes a trend panel with a current score and placeholder previous score until stored readiness snapshots are added.

The score is an internal operational readiness indicator. It is not a certification, audit guarantee, or legal/safety determination.
