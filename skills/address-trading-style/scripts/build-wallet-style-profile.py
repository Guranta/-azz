#!/usr/bin/env python3
"""Build fixed-address profile bundles for website-side MiniMax input.

This script is internal tooling for the fixed tracked-address capability layer.
It assumes input normalized from AVE data and website-side aggregation.
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median


def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def coefficient_of_variation(values: list[float]) -> float:
    if not values:
        return 0.0
    avg = sum(values) / len(values)
    if avg == 0:
        return 0.0
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return math.sqrt(variance) / avg


def holding_label(hold_minutes_values: list[float]) -> str:
    if not hold_minutes_values:
        return "unknown"
    med = median(hold_minutes_values)
    if med <= 60:
        return "sniper"
    if med <= 360:
        return "scalper"
    if med <= 2880:
        return "swing-trader"
    return "holder"


def launchpad_bias(launchpad_counts: Counter, trade_count: int) -> str:
    if trade_count == 0:
        return "unknown"
    fourmeme_share = launchpad_counts.get("fourmeme", 0) / trade_count
    flap_share = launchpad_counts.get("flap", 0) / trade_count
    if fourmeme_share >= 0.6:
        return "fourmeme"
    if flap_share >= 0.6:
        return "flap"
    return "mixed"


def confidence_label(
    trade_count: int,
    has_narrative_bundle: bool,
    has_whale_state: bool,
    has_smartmoney_state: bool,
) -> str:
    if (
        trade_count >= 10
        and has_narrative_bundle
        and has_whale_state
        and has_smartmoney_state
    ):
        return "high"
    if trade_count >= 5 and has_narrative_bundle:
        return "medium"
    return "low"


def normalize_tags(values: list[str]) -> list[str]:
    return [str(value).lower() for value in values if str(value).strip()]


def tag_score_map(trades: list[dict]) -> dict[str, float]:
    raw_scores: defaultdict[str, float] = defaultdict(float)
    for trade in trades:
        roi = trade.get("roiPct")
        roi_bonus = max(float(roi), 0.0) / 50.0 if roi is not None else 0.0
        for tag in normalize_tags(trade.get("narrativeTags", [])):
            raw_scores[tag] += 1.0 + roi_bonus
    if not raw_scores:
        return {}
    top_score = max(raw_scores.values())
    return {
        tag: round((score / top_score) * 100.0, 2)
        for tag, score in sorted(
            raw_scores.items(), key=lambda item: item[1], reverse=True
        )
    }


def whale_signal(tracked_address_hit: bool, holder_rank: int | None) -> str:
    if not tracked_address_hit:
        return "low"
    if holder_rank is not None and holder_rank <= 30:
        return "high"
    return "medium"


def smartmoney_signal(tracked_address_hit: bool) -> str:
    return "high" if tracked_address_hit else "low"


def map_signal_adjustment(kind: str, signal: str) -> float:
    if kind == "whale":
        return 8.0 if signal == "high" else 4.0 if signal == "medium" else 0.0
    if kind == "smartmoney":
        return 10.0 if signal == "high" else 0.0
    return 0.0


def build_profile(payload: dict) -> dict:
    tracked_address = payload.get("tracked_address", {})
    token_context = payload.get("token_context", {})
    top100_context = payload.get("top100_context", {})
    smartmoney_context = payload.get("smartmoney_context", {})
    recent_history = payload.get("recent_history", {})
    trades = recent_history.get("trades", [])
    trade_count = len(trades)

    hold_minutes_values = [
        float(trade["holdMinutes"])
        for trade in trades
        if trade.get("holdMinutes") is not None
    ]
    amount_values = [
        float(trade["amountUsd"]) for trade in trades if trade.get("amountUsd") is not None
    ]
    launchpad_counts = Counter(
        str(trade.get("launchpad", "unknown")).lower() for trade in trades
    )

    tags = tag_score_map(trades)
    favorite_narratives = list(tags.keys())[:5]
    token_bundle = token_context.get("narrativeBundle", {})
    token_raw_tags = normalize_tags(token_bundle.get("rawTags", []))

    if token_raw_tags:
        affinity_values = [tags.get(tag, 35.0) for tag in token_raw_tags]
        narrative_affinity_score = round(sum(affinity_values) / len(affinity_values), 2)
    else:
        narrative_affinity_score = 35.0

    candidate_launchpad = str(token_context.get("launchpad", "unknown")).lower()
    if candidate_launchpad in {"fourmeme", "flap"} and trade_count:
        launchpad_match_score = round(
            (launchpad_counts.get(candidate_launchpad, 0) / trade_count) * 100.0, 2
        )
    else:
        launchpad_match_score = 50.0

    quick_flip_ratio = (
        sum(1 for value in hold_minutes_values if value <= 120) / len(hold_minutes_values)
        if hold_minutes_values
        else 0.0
    )
    sizing_volatility_ratio = min(coefficient_of_variation(amount_values), 1.0)
    launchpad_ratio = (
        (launchpad_counts.get("fourmeme", 0) + launchpad_counts.get("flap", 0))
        / trade_count
        if trade_count
        else 0.0
    )

    risk_appetite_score = round(
        clamp(
            30.0
            + (launchpad_ratio * 30.0)
            + (quick_flip_ratio * 30.0)
            + (sizing_volatility_ratio * 10.0)
        ),
        2,
    )

    timing_risk_fit = round(
        clamp((quick_flip_ratio * 50.0) + (100.0 - abs(risk_appetite_score - 60.0)) * 0.5),
        2,
    )

    base_fit_score = round(
        (narrative_affinity_score * 0.50)
        + (launchpad_match_score * 0.25)
        + (timing_risk_fit * 0.25),
        2,
    )

    top100_hit = bool(top100_context.get("trackedAddressHit", False))
    holder_rank_raw = top100_context.get("holderRank")
    holder_rank = int(holder_rank_raw) if holder_rank_raw is not None else None
    whale = whale_signal(top100_hit, holder_rank)

    smartmoney_hit = bool(smartmoney_context.get("trackedAddressHit", False))
    smartmoney = smartmoney_signal(smartmoney_hit)

    whale_adj = map_signal_adjustment("whale", whale)
    smartmoney_adj = map_signal_adjustment("smartmoney", smartmoney)
    buy_likelihood_score = round(
        clamp((base_fit_score * 0.70) + (whale_adj * 0.15) + (smartmoney_adj * 0.15)),
        2,
    )

    style = holding_label(hold_minutes_values)
    activity_label = (
        "high-frequency"
        if trade_count >= 20
        else "active"
        if trade_count >= 8
        else "low-frequency"
    )
    style_labels = [
        f"{launchpad_bias(launchpad_counts, trade_count)}-launchpad",
        style,
        activity_label,
        "aggressive"
        if risk_appetite_score >= 65
        else "balanced"
        if risk_appetite_score >= 35
        else "cautious",
    ]

    has_narrative_bundle = bool(token_bundle)
    has_whale_state = "trackedAddressHit" in top100_context
    has_smartmoney_state = "trackedAddressHit" in smartmoney_context
    confidence = confidence_label(
        trade_count, has_narrative_bundle, has_whale_state, has_smartmoney_state
    )

    address_name = tracked_address.get("addressName", "Unknown tracked address")
    profile_summary = (
        f"{address_name} is {style_labels[0]}, {style_labels[1]}, and {style_labels[-1]}. "
        f"History-narrative fit is {narrative_affinity_score:.0f}/100 with {trade_count} recent records."
    )

    evidence = [
        "Wallet history shows repeated narrative behavior in recent transactions.",
        "Current token narrative bundle was matched against wallet tag preferences.",
        (
            "Tracked address is in token top100 holders."
            if top100_hit
            else "Tracked address is not in token top100 holders."
        ),
        (
            "Tracked address is in smartmoney intersection set."
            if smartmoney_hit
            else "Tracked address is not in smartmoney intersection set."
        ),
    ]

    fixed_profile_bundle = {
        "addressId": tracked_address.get("id"),
        "address": tracked_address.get("address"),
        "addressName": address_name,
        "logoKey": tracked_address.get("logoKey"),
        "logoMode": tracked_address.get("logoMode"),
        "profileSummary": profile_summary,
        "styleLabels": style_labels,
        "narrativeFit": {
            "favoriteNarratives": favorite_narratives,
            "tokenNarrativeBundle": token_bundle,
            "narrativeAffinityScore": narrative_affinity_score,
        },
        "marketSignals": {
            "top100HolderHit": top100_hit,
            "holderRank": holder_rank,
            "whaleSignal": whale,
            "smartmoneyHit": smartmoney_hit,
            "smartmoneySignal": smartmoney,
        },
        "scores": {
            "riskAppetiteScore": risk_appetite_score,
            "baseFitScore": base_fit_score,
            "buyLikelihoodScore": buy_likelihood_score,
        },
        "confidence": confidence,
        "evidence": evidence,
    }

    minimax_input = {
        "task": "fixed_address_token_affinity_explanation",
        "chain": payload.get("chain", "bsc"),
        "tokenContext": token_context,
        "fixedAddressProfiles": [fixed_profile_bundle],
    }

    return {
        "fixedAddressProfile": fixed_profile_bundle,
        "minimaxInput": minimax_input,
    }


def load_input(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build fixed-address profile bundle for website-side MiniMax input."
    )
    parser.add_argument("input_path", help="Path to normalized fixed-address input JSON")
    parser.add_argument("--output", help="Optional path to save output JSON")
    args = parser.parse_args()

    payload = load_input(Path(args.input_path))
    result = build_profile(payload)
    output = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
