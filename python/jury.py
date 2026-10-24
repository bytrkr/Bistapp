"""
Bistapp MT16 - Jüri Heyeti ve Veto Kuralları Motoru (jury.py)
------------------------------------------------------------
Münazara sonrasında toplanan ajan oylarını değerlendirir.
Önceden tanımlı veya kullanıcı tarafından eklenen veto kurallarını
(patron satışı, aşırı borç/iflas riski, VBTS tedbiri vb.) denetleyip
nihai karar üstünde mutlak veto ya da ceza uygular.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional

_CUSTOM_RULES: List[Dict[str, Any]] = []


def add_custom_rule(rule_dict: Dict[str, Any]) -> bool:
    """
    Jüri karar mekanizmasına özel bir veto kuralı ekler.
    Örnek rule_dict:
    {
        "name": "PATRON_SATISI_VETO",
        "condition_field": "insider_selling_detected",
        "action": "VETO_BUY",
        "penalty": -50,
        "description": "Şirket ortakları borsada hisse satışı yapıyorsa AL sinyali veto edilir."
    }
    """
    if not isinstance(rule_dict, dict) or "name" not in rule_dict:
        return False
    _CUSTOM_RULES.append(rule_dict)
    return True


def get_custom_rules() -> List[Dict[str, Any]]:
    return list(_CUSTOM_RULES)


def evaluate_jury(votes: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Ajan oylarını ve bağlamı inceleyip jüri veto ve onay kararını üretir.
    """
    ctx = context or {}
    vote_list = votes if isinstance(votes, list) else list(votes.values()) if isinstance(votes, dict) else []

    buy_votes = 0
    sell_votes = 0
    hold_votes = 0
    total_score = 0.0
    veto_triggers = []

    for v in vote_list:
        sig = str(v.get("signal", "")).upper()
        conf = float(v.get("confidence", 50.0))
        total_score += conf

        if "AL" in sig or "BUY" in sig:
            buy_votes += 1
        elif "SAT" in sig or "SELL" in sig:
            sell_votes += 1
        else:
            hold_votes += 1

    total_voters = max(1, len(vote_list))
    avg_confidence = round(total_score / total_voters, 1)

    # 1. Dahili Jüri Veto Kuralları
    # Kural A: VBTS Tedbiri (Kredili işlem / brüt takas)
    vbts_level = int(ctx.get("vbts_level", 0))
    if vbts_level >= 2:
        veto_triggers.append({
            "rule": "VBTS_YUKSEK_TEDBIR",
            "reason": f"Hissede Seviye {vbts_level} VBTS tedbiri aktif. Kaldıraçlı alım yapılamaz.",
            "impact": "CEZA_UYGULANDI",
            "penalty": -20,
        })

    # Kural B: Aşırı Borçluluk (Net Borç / FAVÖK > 5.0)
    net_debt_ebitda = float(ctx.get("net_debt_ebitda", 0.0))
    if net_debt_ebitda > 5.0:
        veto_triggers.append({
            "rule": "ASIRI_BORC_RISKI",
            "reason": f"Net Borç/FAVÖK ({net_debt_ebitda:.1f}x > 5.0x) finansal risk oluşturuyor.",
            "impact": "VETO",
            "penalty": -35,
        })

    # Kural C: Patron / Ortak Satışı
    if ctx.get("insider_selling_detected", False):
        veto_triggers.append({
            "rule": "ORTAK_PAY_SATISI",
            "reason": "KAP bildiriminde hakim ortakların pay satışı yaptığı tespit edildi.",
            "impact": "VETO",
            "penalty": -40,
        })

    # 2. Özel Eklenen Kuralların Denetimi
    for rule in _CUSTOM_RULES:
        field = rule.get("condition_field")
        if field and ctx.get(field):
            veto_triggers.append({
                "rule": rule.get("name", "OZEL_KURAL"),
                "reason": rule.get("description", "Kullanıcı özel kuralı tetiklendi."),
                "impact": rule.get("action", "CEZA"),
                "penalty": rule.get("penalty", -20),
            })

    # 3. Nihai Jüri Karar Hesabı
    has_hard_veto = any(v.get("impact") == "VETO" for v in veto_triggers)
    total_penalties = sum(v.get("penalty", 0) for v in veto_triggers)

    adjusted_confidence = max(10.0, min(95.0, avg_confidence + total_penalties))

    if has_hard_veto:
        verdict = "VETO_SAT" if buy_votes > 0 else "SAT"
        verdict_summary = "Jüri Heyeti kritik risk veya ortak satışı nedeniyle AL yönlü kararı VETO etti."
    elif buy_votes > sell_votes and adjusted_confidence >= 60.0:
        verdict = "ONAY_AL"
        verdict_summary = "Ajan çoğunluğu ve jüri risk filtreleri alım yönünde mutabık."
    elif sell_votes > buy_votes:
        verdict = "ONAY_SAT"
        verdict_summary = "Ajanlar ve jüri satış baskısı yönünde oybirliğine vardı."
    else:
        verdict = "PAS_BEKLE"
        verdict_summary = "Farklı görüşler dengede; risk/getiri oranı nötr."

    return {
        "verdict": verdict,
        "is_vetoed": has_hard_veto,
        "buy_votes": buy_votes,
        "sell_votes": sell_votes,
        "hold_votes": hold_votes,
        "average_confidence": avg_confidence,
        "adjusted_confidence": adjusted_confidence,
        "veto_triggers": veto_triggers,
        "summary": verdict_summary,
    }
