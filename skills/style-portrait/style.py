#!/usr/bin/env python3
"""style.py — измеримый слой профиля стиля.

corpus  — собрать тексты автора (tg-экспорт / файлы / папки), отбросив чужое.
metrics — посчитать признаки стиля: геометрия, лексика, служебные слова,
          дискурсивные маркеры, модальность, пунктуация, разметка, морфология.
check   — сравнить черновик с профилем и показать отклонения.

Морфология (части речи, времена, лицо, леммы) считается, если стоят
`razdel` и `pymorphy3`; без них остальное считается как обычно.
"""
import argparse
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

try:
    import pymorphy3
    from razdel import sentenize
    from razdel import tokenize as rz_tokenize
    MORPH = pymorphy3.MorphAnalyzer()
except Exception:                                    # pragma: no cover
    MORPH = None

SCHEMA_VERSION = 1

EMOJI = re.compile("[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF]")
LATIN_WORD = re.compile(r"\b[A-Za-z][A-Za-z0-9.\-]{2,}\b")
WORD = re.compile(r"[А-Яа-яЁёA-Za-z][А-Яа-яЁёA-Za-z\-]*")
SENT_FALLBACK = re.compile(r"(?<=[.!?…])\s+|\n+")
URL = re.compile(r"https?://\S+")

GROUPS = {
    "pronouns_1sg": "я, меня, мне, мной, мною, мой, моя, моё, мои, моего, моей, моих, моим",
    "pronouns_1pl": "мы, нас, нам, нами, наш, наша, наше, наши, нашего, нашей, наших, нашим",
    "pronouns_2pl": "вы, вас, вам, вами, ваш, ваша, ваше, ваши, вашего, вашей, ваших, вашим",
    "pronouns_2sg": "ты, тебя, тебе, тобой, твой, твоя, твоё, твои, твоего, твоей, твоих",
    "particles": "же, ведь, вот, ну, уж, ли, разве, неужели, лишь, даже, именно, просто, "
               "всё-таки, все-таки, типа, мол, дескать, ага",
    "discourse_markers": "короче, в общем, то есть, при этом, кстати, впрочем, итак, "
                            "значит, например, поэтому, однако, зато, наконец, во-первых, "
                            "во-вторых, таким образом, следовательно, кроме того, "
                            "тем не менее, с другой стороны",
    "hedges": "кажется, вроде, наверное, возможно, похоже, вероятно, пожалуй, обычно, "
             "в целом, местами, скорее всего, как будто, может быть, судя по, "
             "по ощущениям, в основном",
    "boosters": "точно, очевидно, безусловно, абсолютно, категорически, конечно, "
                 "разумеется, реально, действительно, крайне, безумно, невероятно, "
                 "максимально, совершенно",
    "obligation": "нужно, надо, стоит, должен, должна, должно, должны, обязан, "
                       "необходимо, придётся, придется, следует",
    "officialese": "является, являются, осуществление, осуществляется, представляет собой, "
                  "в рамках, в связи с, в целях, необходимо отметить, следует отметить, "
                  "данный, данная, в данном случае, наличие, обеспечивает, "
                  "в настоящее время, в случае если",
}
GROUP_PATTERNS = {
    name: re.compile(r"(?<![\w-])(" + "|".join(
        re.escape(w.strip()) for w in sorted(phrases.split(","), key=len, reverse=True)
        if w.strip()
    ) + r")(?![\w-])", re.I)
    for name, phrases in GROUPS.items()
}


# ---------------------------------------------------------------- корпус

def tg_text(msg):
    t = msg.get("text")
    if isinstance(t, str):
        return t
    if isinstance(t, list):
        return "".join(x if isinstance(x, str) else x.get("text", "") for x in t)
    return ""


def from_telegram(path, keep_forwards=False, min_chars=0):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if "chats" in data:
        data = data["chats"]["list"][0]
        print(f"[i] взят первый чат: {data.get('name')}", file=sys.stderr)
    msgs = data.get("messages", [])
    items, fwd, empty = [], 0, 0
    for m in msgs:
        if m.get("type") != "message":
            continue
        if m.get("forwarded_from") and not keep_forwards:
            fwd += 1
            continue
        txt = tg_text(m).strip()
        if not txt or len(txt) < min_chars:
            empty += 1
            continue
        items.append((str(m.get("id")), (m.get("date") or "")[:10], txt))
    print(f"[i] {data.get('name')}: всего {len(msgs)}, свои с текстом {len(items)}, "
          f"пересылов отброшено {fwd}, пустых/коротких {empty}", file=sys.stderr)
    return items


def from_files(paths, min_chars=0):
    items = []
    for p in paths:
        p = Path(p)
        files = (sorted(p.rglob("*.md")) + sorted(p.rglob("*.txt"))) if p.is_dir() else [p]
        for f in files:
            txt = f.read_text(encoding="utf-8").strip()
            chunks = [txt]
            single_file = len(paths) == 1 and len(files) == 1
            # '### ' считается разметкой корпуса, только если стоит в начале строки:
            # так markdown-подзаголовок или случайное совпадение внутри поста не
            # выключает разбор слитного файла.
            has_headers = bool(re.search(r"^### ", txt, flags=re.M))
            if single_file and not has_headers:
                maybe = split_flat(txt)
                if len(maybe) > 1:
                    print(f"[i] {f.name}: слитный файл разложен на {len(maybe)} постов",
                          file=sys.stderr)
                elif not maybe and txt:
                    print(f"[!] {f.name}: в файле только разделители, текста постов "
                          "не нашлось — файл пропущен", file=sys.stderr)
                chunks = maybe
            # Предупреждение не зависит от того, почему разбить не удалось: файл
            # большой и остался одним куском — пользователь должен об этом знать.
            if single_file and not has_headers and len(chunks) == 1 and len(txt) > 20000:
                print(f"[!] {f.name}: разделителей не нашлось, файл пойдёт как один текст: "
                      "диапазоны автора не построятся", file=sys.stderr)
                print("    раздели посты строкой '---' или пустой строкой дважды, "
                      "либо разложи по файлам в папку", file=sys.stderr)
            for k, chunk in enumerate(chunks, 1):
                if not chunk or len(chunk) < min_chars:
                    continue
                name = f.stem if len(chunks) == 1 else f"{f.stem}-{k}"
                items.append((name, "", chunk))
    print(f"[i] собрано текстов: {len(items)}", file=sys.stderr)
    return items


def cmd_corpus(args):
    items = (from_telegram(args.telegram, args.keep_forwards, args.min_chars)
             if args.telegram else from_files(args.paths, args.min_chars))
    if not items:
        sys.exit("пустой корпус: нечего анализировать")
    Path(args.out).write_text(
        "\n\n".join(f"### {i} · {d}\n{t}" for i, d, t in items), encoding="utf-8")
    chars = sum(len(t) for _, _, t in items)
    print(f"[i] {args.out}: {len(items)} текстов, {chars} знаков", file=sys.stderr)
    if chars < 20000:
        print("[!] корпус меньше 20к знаков: портрет будет шатким, скажи об этом в профиле",
              file=sys.stderr)


# --------------------------------------------------------------- признаки

FLAT_RULE = re.compile(r"^[ \t]*(?:-{3,}|\*{3,}|={3,}|_{3,})[ \t]*$", flags=re.M)
FLAT_BLANKS = re.compile(r"\n[ \t]*\n[ \t]*\n+")
FRONTMATTER = re.compile(r"\A---[ \t]*\n.*?\n---[ \t]*\n?", flags=re.S)


def strip_frontmatter(raw):
    """Убрать YAML-фронтматтер в начале файла (---...---): это метаданные заметки
    (title, tags), а не пост, и в разбор попадать не должен."""
    return FRONTMATTER.sub("", raw, count=1) if raw.startswith("---") else raw


def split_flat(raw):
    """Разложить слитный файл на посты.

    Сначала по строкам-разделителям (`---`, `***`, `===`), потом по двум и более
    пустым строкам. Одиночная пустая строка разделителем быть не может: внутри
    поста она разделяет абзацы. Фронтматтер в начале файла отбрасывается до
    разбиения, иначе его закрывающая '---' сама сходит за разделитель постов.
    """
    raw = strip_frontmatter(raw)
    parts = FLAT_RULE.split(raw) if FLAT_RULE.search(raw) else FLAT_BLANKS.split(raw)
    return [p.strip() for p in parts if p.strip()]


def split_corpus(raw):
    parts = re.split(r"^### .*$", raw, flags=re.M)
    out = [p.strip() for p in parts if p.strip()]
    return out or ([raw.strip()] if raw.strip() else [])


def sentences(text):
    """Перенос строки — граница предложения: в постах и списках точки часто нет."""
    out = []
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if MORPH:
            out += [s.text for s in sentenize(line) if s.text.strip()]
        else:
            out += [s for s in SENT_FALLBACK.split(line) if s.strip()]
    return out


def words(text):
    return WORD.findall(text)


def per1000(count, total_words):
    return round(1000 * count / total_words, 2) if total_words else 0.0


def analyze(texts, with_morph=True):
    body = "\n\n".join(texts)
    clean = URL.sub(" ", body)                 # ссылки не искажают лексику
    toks = [w.lower() for w in words(clean)]
    n = len(toks)
    sents = [s for t in texts for s in sentences(t)]
    slen = [len(words(s)) for s in sents] or [0]
    paras = [p for t in texts for p in t.split("\n\n") if p.strip()]
    plen = [len(words(p)) for p in paras] or [0]
    tlen = [len(t) for t in texts]

    mean_s = statistics.mean(slen)
    std_s = statistics.pstdev(slen) if len(slen) > 1 else 0.0

    res = {
        "meta": {
            "schema_version": SCHEMA_VERSION,
            "texts": len(texts),
            "chars": sum(tlen),
            "words": n,
            "sentences": len(sents),
            "morphology": bool(MORPH),
        },
        "geometry": {
            "text_chars_median": int(statistics.median(tlen)),
            "text_chars_mean": int(statistics.mean(tlen)),
            "sentence_words_mean": round(mean_s, 1),
            "sentence_words_median": statistics.median(slen),
            "sentence_words_sd": round(std_s, 1),
            "burstiness": round(std_s / mean_s, 2) if mean_s else 0.0,
            "share_sentences_le7": round(sum(1 for x in slen if x <= 7) / len(slen), 2),
            "share_sentences_8_24": round(
                sum(1 for x in slen if 8 <= x <= 24) / len(slen), 2),
            "share_sentences_ge25": round(sum(1 for x in slen if x >= 25) / len(slen), 2),
            "paragraph_words_mean": round(statistics.mean(plen), 1),
            "paragraph_sentences_mean": round(len(sents) / len(paras), 1) if paras else 0,
        },
        "lexicon": {
            "ttr_raw": round(len(set(toks)) / n, 3) if n else 0,
            "mattr_500": mattr(toks, 500),
            "hapax_share": round(
                sum(1 for _, c in Counter(toks).items() if c == 1) / max(1, len(set(toks))), 3),
            "word_length_mean": round(statistics.mean(len(t) for t in toks), 2) if n else 0,
            "latin_per_1000": per1000(len(LATIN_WORD.findall(clean)), n),
            "numbers_per_1000": per1000(len(re.findall(r"\b\d[\d.,%]*", clean)), n),
        },
        "markers_per_1000": {
            name: per1000(len(pat.findall(clean)), n) for name, pat in GROUP_PATTERNS.items()
        },
        "punctuation_per_1000": {
            "em_dash": per1000(body.count("—"), n),
            "en_dash": per1000(len(re.findall(r"(?<=\s)–(?=\s)", body)), n),
            "hyphen_as_dash": per1000(len(re.findall(r"(?<=\s)-(?=\s)", body)), n),
            "ellipsis": per1000(len(re.findall(r"\.\.\.|…", body)), n),
            "parenthetical": per1000(len(re.findall(r"\([^)]{5,}\)", body)), n),
            "question": per1000(body.count("?"), n),
            "exclamation": per1000(body.count("!"), n),
            "colon": per1000(body.count(":"), n),
            "semicolon": per1000(body.count(";"), n),
            "quotes_guillemets": per1000(body.count("«"), n),
            "quotes_straight": per1000(body.count('"'), n),
            "emoji": per1000(len(EMOJI.findall(body)), n),
            "caps_words": per1000(len(re.findall(r"\b[А-ЯЁA-Z]{4,}\b", body)), n),
        },
        "formatting_per_text": {
            "bullet_items": round(len(re.findall(r"\n\s*[-•*]\s", body)) / len(texts), 2),
            "numbered_items": round(len(re.findall(r"\n\s*\d+[.)]\s", body)) / len(texts), 2),
            "markdown_headings": round(len(re.findall(r"\n#{1,6}\s", body)) / len(texts), 2),
            "links": round(len(URL.findall(body)) / len(texts), 2),
            "bold_italic": round(len(re.findall(r"\*\*[^*]+\*\*|__[^_]+__", body)) / len(texts), 2),
            "first_line_no_period": round(
                sum(1 for t in texts if t.split("\n")[0].strip()
                    and not t.split("\n")[0].strip().endswith(".")) / len(texts), 2),
            "first_line_chars": int(
                statistics.mean(len(t.split("\n")[0]) for t in texts)),
        },
    }
    if MORPH and with_morph:
        res["morphology"] = morphology(clean)
    elif MORPH:
        res.pop("morphology", None)
    else:
        res["morphology"] = {"computed": False,
                             "how_to_enable": "pip3 install razdel pymorphy3 pymorphy3-dicts-ru"}
    return res


def mattr(toks, window):
    """Moving-average TTR: усредняет TTR по скользящим окнам фиксированной длины,
    поэтому на текстах не короче окна устойчив к длине корпуса в отличие от сырого TTR.

    На тексте короче окна усреднять не по чему: функция отдаёт сырой TTR по всем
    токенам — то есть ровно то, от чего должна была защищать. `bands()` считает
    признаки по одному тексту, и типичный пост в 100-400 слов всегда попадает в эту
    ветку, так что `mattr_500` в диапазонах на коротких текстах наполовину прокси
    длины текста, а не только лексического разнообразия. Сравнивать это значение
    по диапазону между текстами разной длины стоит осторожно.
    """
    if len(toks) < window:
        return round(len(set(toks)) / len(toks), 3) if toks else 0
    vals = []
    for i in range(0, len(toks) - window + 1, max(1, window // 5)):
        chunk = toks[i:i + window]
        vals.append(len(set(chunk)) / window)
    return round(statistics.mean(vals), 3)


def morphology(text):
    pos, tense, person, lemmas = Counter(), Counter(), Counter(), []
    total = 0
    for tok in rz_tokenize(text):
        w = tok.text
        if not WORD.fullmatch(w):
            continue
        p = MORPH.parse(w)[0]
        total += 1
        lemmas.append(p.normal_form)
        if p.tag.POS:
            pos[str(p.tag.POS)] += 1
        if p.tag.tense:
            tense[str(p.tag.tense)] += 1
        if p.tag.person:
            person[str(p.tag.person)] += 1
    share = lambda c: {k: round(v / max(1, sum(c.values())), 3) for k, v in c.most_common()}
    return {
        "computed": True,
        "pos_shares": share(pos),
        "tense_shares": share(tense),
        "person_shares": share(person),
        "ttr_lemmas": round(len(set(lemmas)) / max(1, len(lemmas)), 3),
        "verbs_per_noun": round(
            pos.get("VERB", 0) / max(1, pos.get("NOUN", 1)), 2),
    }


# ---------------------------------------------------------------- вывод

def flatten(d, prefix=""):
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict):
            out.update(flatten(v, key + " / "))
        else:
            out[key] = v
    return out


BAND_SECTIONS = ("geometry", "lexicon",
                 "markers_per_1000", "punctuation_per_1000")


def bands(texts, min_words=80, min_texts=8):
    """Разброс признака по текстам автора: p10/p50/p90.

    Нужен, чтобы `check` ругался на то, что выходит за собственный диапазон автора,
    а не на любое отличие от среднего по корпусу.

    Возвращает (диапазоны, диагностика). Диагностика нужна, чтобы вызывающий мог
    объяснить пользователю, почему диапазонов нет.
    """
    per_text = [analyze([t], with_morph=False) for t in texts
                if len(words(t)) >= min_words]
    diag = {"total": len(texts), "used": len(per_text), "need": min_texts}
    if len(per_text) < min_texts:
        return {}, diag
    out = {}
    for section in BAND_SECTIONS:
        for key in per_text[0].get(section, {}):
            vals = sorted(r[section][key] for r in per_text
                          if isinstance(r[section].get(key), (int, float)))
            if not vals:
                continue
            q = lambda f, vals=vals: vals[min(len(vals) - 1, int(f * (len(vals) - 1)))]
            out.setdefault(section, {})[key] = {
                "p10": round(q(0.10), 3), "median": round(q(0.5), 3), "p90": round(q(0.90), 3)}
    out["_texts_used"] = len(per_text)
    return out, diag


def cmd_metrics(args):
    texts = split_corpus(Path(args.corpus).read_text(encoding="utf-8"))
    if not texts:
        sys.exit("пустой корпус")
    res = analyze(texts)
    if not args.no_bands:
        res["bands"], diag = bands(texts)
        if not res["bands"]:
            print(f"[!] диапазоны не построены: текстов в корпусе {diag['total']}, "
                  f"из них длиной 80+ слов {diag['used']}, нужно {diag['need']}",
                  file=sys.stderr)
            print("    без диапазонов check сравнивает со средним, а не с разбросом автора: "
                  "он будет ругаться на нормальные колебания", file=sys.stderr)
            print("    разложи корпус на посты: папка с файлами или строки '### ' "
                  "перед каждым постом", file=sys.stderr)
    if args.ngrams:
        res["top_ngrams"] = top_ngrams(texts, args.ngram_size, args.ngrams)
    if args.openers:
        res["top_openers"] = top_openers(texts, args.openers)
    if args.json:
        Path(args.json).write_text(
            json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[i] метрики записаны: {args.json}", file=sys.stderr)
    flat = flatten(res)
    width = max(len(k) for k in flat)
    for k, v in flat.items():
        print(f"{k.ljust(width)}  {v}")


def top_ngrams(texts, size, limit):
    body = URL.sub(" ", "\n".join(texts)).lower()
    toks = re.findall(r"[а-яёa-z]+", body)
    grams = Counter(" ".join(toks[i:i + size]) for i in range(len(toks) - size + 1))
    return [{"phrase": g, "count": c} for g, c in grams.most_common(limit) if c > 1]


def top_openers(texts, limit):
    heads = Counter(" ".join(t.split("\n")[0].split()[:3]).lower() for t in texts if t.strip())
    return [{"opener": h, "count": c} for h, c in heads.most_common(limit) if c > 1]


# ---------------------------------------------------------------- check

CHECK_KEYS = [
    ("geometry", "sentence_words_median", 0.25),
    ("geometry", "sentence_words_mean", 0.25),
    ("geometry", "burstiness", 0.30),
    ("geometry", "share_sentences_le7", 0.30),
    ("geometry", "share_sentences_ge25", 0.50),
    ("geometry", "paragraph_words_mean", 0.35),
    ("lexicon", "mattr_500", 0.15),
    ("lexicon", "word_length_mean", 0.15),
    ("lexicon", "latin_per_1000", 0.50),
    ("lexicon", "numbers_per_1000", 0.50),
]
CHECK_GROUPS = [
    ("markers_per_1000", 0.60),
    ("punctuation_per_1000", 0.60),
]


def cmd_check(args):
    profile = json.loads(Path(args.profile).read_text(encoding="utf-8"))
    draft = Path(args.draft).read_text(encoding="utf-8").strip()
    if not draft:
        sys.exit("черновик пуст")
    got = analyze([draft])
    dwords = got["meta"]["words"]
    rows, thin, bad = [], 0, 0

    band_all = profile.get("bands", {})

    def compare(section, key, tol, per_thousand):
        nonlocal bad, thin
        try:
            want, have = profile[section][key], got[section][key]
        except KeyError:
            return
        if not isinstance(want, (int, float)) or not isinstance(have, (int, float)):
            return
        band = band_all.get(section, {}).get(key)
        if band:
            lo, hi = band["p10"], band["p90"]
            if per_thousand and hi * dwords / 1000 < args.min_expected:
                if have > 0 and have > 2 * max(hi, want):
                    rows.append((10 ** 6, False, key + " — чего в профиле нет",
                                 f"{lo}–{hi}", have, "лишнее"))
                    bad += 1
                else:
                    thin += 1
                return
            ok = lo <= have <= hi
            if not ok:
                bad += 1
                edge = lo if have < lo else hi
                delta = (have - edge) / abs(edge) if edge else 1
            else:
                delta = 0
            rows.append((abs(delta), ok, key, f"{lo}–{hi}", have,
                         "в диапазоне" if ok else f"{delta * 100:+.0f}% за край"))
            return
        if per_thousand and want * dwords / 1000 < args.min_expected:
            if have > 0 and (want == 0 or have > 2 * want):
                # признака в профиле почти нет, а в черновике он есть: это и есть чужое
                rows.append((10 ** 6, False, key + " — чего в профиле нет", want, have, "лишнее"))
                bad += 1
            else:
                thin += 1      # в черновике такой длины признак и не должен встретиться
            return
        if want == 0 and have == 0:
            return
        base = want if want else 1e-9
        delta = (have - base) / abs(base)
        ok = abs(delta) <= tol
        if not ok:
            bad += 1
        rows.append((abs(delta), ok, key, want, have, f"{delta * 100:+.0f}%"))

    for section, key, tol in CHECK_KEYS:
        compare(section, key, tol, per_thousand=("1000" in section or "1000" in key))
    for section, tol in CHECK_GROUPS:
        for key in profile.get(section, {}):
            compare(section, key, tol, per_thousand=True)

    rows.sort(key=lambda r: (r[1], -r[0]))       # сначала отклонения, крупные сверху
    width = max((len(r[2]) for r in rows), default=10) + 3
    print(f"черновик: {dwords} слов, {got['meta']['sentences']} предложений\n")
    print(f"{'признак'.ljust(width)}{'профиль':>10}{'черновик':>11}   отклонение")
    for _, ok, key, want, have, delta in rows:
        mark = "ok " if ok else "!! "
        print(f"{(mark + key).ljust(width)}{want:>10}{have:>11}   {delta}")
    print(f"\nвне допуска: {bad} из {len(rows)}")
    if thin:
        print(f"пропущено как статистически незначимое на такой длине: {thin} "
              f"(порог --min-expected {args.min_expected})")
    if dwords < 120:
        print("[!] черновик короткий: смотри только грубые расхождения")
    sys.exit(1 if bad and args.strict else 0)


def build_parser():
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    c = sub.add_parser("corpus", help="собрать корпус текстов автора")
    c.add_argument("paths", nargs="*", help="файлы или каталоги с .md/.txt")
    c.add_argument("--telegram", help="result.json из Telegram Desktop")
    c.add_argument("--keep-forwards", action="store_true", help="не отбрасывать пересылы")
    c.add_argument("--min-chars", type=int, default=0)
    c.add_argument("-o", "--out", required=True)
    c.set_defaults(func=cmd_corpus)

    m = sub.add_parser("metrics", help="измеримый слой профиля")
    m.add_argument("corpus")
    m.add_argument("--json", metavar="FILE", help="записать метрики в json (слой A профиля)")
    m.add_argument("--ngrams", type=int, default=0, metavar="N")
    m.add_argument("--ngram-size", type=int, default=3)
    m.add_argument("--openers", type=int, default=0, metavar="N")
    m.add_argument("--no-bands", action="store_true",
                   help="не считать разброс признаков по текстам")
    m.set_defaults(func=cmd_metrics)

    k = sub.add_parser("check", help="сверить черновик с профилем")
    k.add_argument("profile", help="<who>-metrics.json")
    k.add_argument("draft", help="файл с черновиком")
    k.add_argument("--strict", action="store_true", help="ненулевой код возврата при отклонениях")
    k.add_argument("--min-expected", type=float, default=1.5, metavar="N",
                   help="не сверять признак, если по профилю его ждём в черновике реже N раз")
    k.set_defaults(func=cmd_check)

    return ap


def main():
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
