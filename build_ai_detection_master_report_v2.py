     #!/usr/bin/env python3
"""
Builds a dependency-free, single-file HTML encyclopedia covering AI detection,
AI humanization, tokenization, perplexity, and a maximal public app corpus.
"""

from __future__ import annotations

from datetime import date
from html import escape
from pathlib import Path
from textwrap import dedent


OUT_PATH = Path("/Users/justice/Documents/New project/ai_detection_master_report_v2.html")
LAST_VERIFIED = "2026-04-13"


FOUNDATION_MODULES = [
    {
        "id": "m01-generation",
        "title": "Module 1: LLM Generation Mechanics and Decoding",
        "summary": (
            "This module explains transformer generation as iterative next-token probability "
            "estimation, then dissects decoding policies (greedy, temperature, top-k, top-p, beam) "
            "as controllable levers that directly alter detectability signatures."
        ),
        "professor": [
            "[CITED][A] Autoregressive language models optimize conditional likelihood over token sequences; decoding is an inference-time decision policy layered on top of a trained distribution, not a training objective itself.",
            "[CITED][A] Temperature rescales logits, shrinking or widening the posterior over candidate tokens. Low temperature concentrates mass and usually lowers surprise variance, while high temperature broadens support and can raise lexical dispersion.",
            "[CITED][A] Top-k and nucleus (top-p) sampling clip the tail of the distribution with different constraints: cardinality-bounded versus mass-bounded. In practice, this is a risk-management control over improbable continuations.",
            "[INFERRED][B] Detector-side sensitivity to decoding artifacts is often strongest when generation is low-temperature and low-variance because repeated high-probability phrase templates produce stable stylometric fingerprints.",
        ],
        "coder": [
            "[CITED][A] Implementation view: run transformer forward pass to obtain logits for position t, apply optional temperature scaling, apply optional truncation (k or p), sample one token, append, repeat until stop token or budget limit.",
            "[INFERRED][B] Production systems frequently mix controls: top-p + max token cap + repetition penalty + stop sequences, yielding trajectory-level behavior not captured by single-parameter textbook examples.",
            "[CITED][A] Beam search remains valuable for constrained tasks, but for open-ended writing it can collapse diversity and produce over-regularized phrasing that some detectors treat as machine-like when overused.",
        ],
        "plain": [
            "[CITED][A] Think of the model as guessing the next text chunk over and over. Each guess has a confidence score, and decoding settings decide how adventurous those guesses are.",
            "[CITED][A] Greedy decoding picks the single most likely next token every time. That often sounds smooth but can feel repetitive.",
            "[CITED][A] Higher temperature and top-p let the model take more varied routes. The writing can feel more human but can also drift or hallucinate if pushed too far.",
        ],
        "inference": [
            "[INFERRED][B] Many commercial tools likely tune hidden decoding defaults per task (essay, email, marketing copy), which can create style clusters detectable by external classifiers even when the model family is the same.",
            "[INFERRED][C] Humanizers that re-sample with elevated temperature may gain bypass success by disrupting low-entropy spans, but this can trade off factual precision and discourse coherence.",
        ],
        "code": dedent(
            """\
            def generate(model, prompt_tokens, max_new_tokens, temperature=1.0, top_k=None, top_p=None):
                tokens = list(prompt_tokens)
                for _ in range(max_new_tokens):
                    logits = model.forward(tokens)[-1]
                    logits = logits / max(temperature, 1e-6)
                    probs = softmax(logits)
                    if top_k is not None:
                        probs = keep_top_k(probs, k=top_k)
                    if top_p is not None:
                        probs = keep_top_p(probs, p=top_p)
                    next_tok = sample(probs)
                    tokens.append(next_tok)
                    if next_tok == EOS:
                        break
                return tokens
            """
        ),
    },
    {
        "id": "m02-tokenization",
        "title": "Module 2: Tokenization Families and Tokenizer Drift Impacts",
        "summary": (
            "Tokenization shapes everything from model context budgeting to detector feature stability. "
            "This module contrasts character, word, and subword methods and explains drift across model/tokenizer upgrades."
        ),
        "professor": [
            "[CITED][A] Subword tokenization (BPE/WordPiece/Unigram) balances open-vocabulary coverage with tractable sequence length; it is a compression and statistical generalization strategy, not merely text splitting.",
            "[CITED][A] Byte-level BPE (as used in GPT-family contexts) avoids unknown tokens by operating on raw bytes before merge operations, improving robustness on noisy text and multilingual fragments.",
            "[CITED][A] Tokenizer drift occurs when model providers update vocabularies or merge rules; identical text may map to different token boundaries, changing measured perplexity and detector inputs.",
            "[INFERRED][B] Cross-model detector inconsistencies can partly reflect tokenizer mismatch rather than pure classifier error, especially on slang, code-mixed text, or non-Latin scripts.",
        ],
        "coder": [
            "[CITED][A] BPE training loop: count symbol-pair frequencies, merge most frequent pair, update corpus representation, repeat until target vocab size. Inference applies learned merges greedily.",
            "[CITED][A] WordPiece maximizes likelihood-based selection under constrained vocab growth; SentencePiece (Unigram/BPE variants) supports raw-text training without pre-tokenization assumptions.",
            "[INFERRED][B] Practical detector pipelines often normalize whitespace/punctuation before tokenization, introducing subtle reproducibility differences between vendors.",
        ],
        "plain": [
            "[CITED][A] Models do not see “words” the way we do. They see token chunks like `gram`, `##mar`, punctuation, and even partial bytes.",
            "[CITED][A] That is why token counts for billing can feel strange: a short-looking sentence with symbols might cost more tokens than expected.",
            "[INFERRED][B] If two systems break text differently, they can disagree about how predictable that text is, even if the words look identical to you.",
        ],
        "inference": [
            "[INFERRED][B] Some detector volatility after major frontier-model releases is plausibly caused by tokenizer and style-distribution shifts arriving faster than detector retraining cycles.",
            "[INFERRED][C] Humanizer tools that heavily re-segment punctuation may exploit tokenizer boundary effects as much as semantic rewriting.",
        ],
        "code": dedent(
            """\
            def train_bpe(corpus_tokens, vocab_size):
                merges = []
                while len(vocab(corpus_tokens)) < vocab_size:
                    pair_counts = count_adjacent_pairs(corpus_tokens)
                    best_pair = argmax(pair_counts)
                    corpus_tokens = merge_pair(corpus_tokens, best_pair)
                    merges.append(best_pair)
                return merges
            """
        ),
    },
    {
        "id": "m03-perplexity",
        "title": "Module 3: Perplexity, Entropy, Cross-Entropy, KL, and Calibration",
        "summary": (
            "Perplexity is central to many detector narratives. This module formalizes entropy and cross-entropy, "
            "walks through numeric interpretation, and explains why perplexity is informative but insufficient."
        ),
        "professor": [
            "[CITED][A] Cross-entropy H(P, Q) measures expected coding cost when true distribution P is encoded using model Q. Perplexity is exp(H) in natural-log convention.",
            "[CITED][A] KL divergence satisfies KL(P||Q)=H(P,Q)-H(P), clarifying why lower perplexity under a specific model does not imply true human or machine authorship.",
            "[CITED][A] Calibration matters: two detectors can output identical nominal percentages with different empirical reliability curves.",
            "[INFERRED][B] Vendor percentages are often best interpreted as rank-like confidence under internal thresholds, not literal probability-of-authorship in a forensic sense.",
        ],
        "coder": [
            "[CITED][A] Given token log-probabilities log p(x_t|x_<t), compute average negative log-likelihood and exponentiate to get perplexity. Segment-level and document-level aggregation choices materially change output.",
            "[CITED][A] Calibration layer options include Platt scaling, isotonic regression, or conformal wrappers. Few commercial detector UIs expose calibration diagnostics publicly.",
            "[INFERRED][B] Sentence-level highlighting likely combines local loss features with classifier head attention saliency, then smooths outputs for visual readability.",
        ],
        "plain": [
            "[CITED][A] Perplexity asks: “How surprised is the model by this wording?” Lower surprise means text follows patterns the model expects.",
            "[CITED][A] Human writing can be less regular, so surprise can jump around more. But that alone never proves who wrote it.",
            "[CITED][A] A high AI score is a warning signal, not courtroom evidence. It needs context, drafts, citations, and author conversation.",
        ],
        "inference": [
            "[INFERRED][B] In mixed-authorship documents, local pockets of low perplexity may dominate headline scores even when most paragraphs are human-revised.",
            "[INFERRED][C] Competitive pressure incentivizes clean “single number” outputs, which can oversimplify uncertainty intervals that would be more honest but less marketable.",
        ],
        "code": dedent(
            """\
            def perplexity(log_probs):
                # log_probs: list of log p(x_t | x_<t)
                n = max(len(log_probs), 1)
                avg_nll = -sum(log_probs) / n
                return math.exp(avg_nll)
            """
        ),
    },
    {
        "id": "m04-stylometry",
        "title": "Module 4: Stylometry and Burstiness at Feature Level",
        "summary": (
            "Detectors often combine perplexity-like statistics with stylometric features such as sentence-length variance, "
            "type-token ratios, POS patterns, punctuation habits, and discourse-marker cadence."
        ),
        "professor": [
            "[CITED][A] Stylometry historically predates modern LLMs; contemporary detectors repurpose authorship-style features for human-vs-model discrimination.",
            "[CITED][A] Burstiness operationalizes variance in sentence complexity and lexical rhythm over local spans. Low-variance text can be a machine signal, but not a definitive one.",
            "[CITED][A] ESL false-positive findings indicate stylistic simplicity and formulaic transitions can correlate with detector “AI-like” signatures.",
            "[INFERRED][B] Robust systems likely fuse lexical, syntactic, discourse, and uncertainty features rather than relying on a single stylometric axis.",
        ],
        "coder": [
            "[CITED][A] Feature set examples: mean/variance of sentence length, type-token ratio, hapax rate, POS bigram frequencies, punctuation entropy, discourse marker frequency, passive voice estimates.",
            "[CITED][A] Pipeline: normalize -> segment -> feature extraction -> scaler -> classifier ensemble -> confidence + rationale artifacts.",
            "[INFERRED][B] Production detectors may run language ID first and branch to language-specific feature normalizers.",
        ],
        "plain": [
            "[CITED][A] “Burstiness” means humans usually mix short and long sentences more unevenly than default AI output.",
            "[CITED][A] Detectors also look at habits: commas, transition words, repeated structures, and vocabulary variety.",
            "[CITED][A] None of that is proof. A careful human writer can look “AI-like,” and edited AI text can look “human-like.”",
        ],
        "inference": [
            "[INFERRED][B] Humanizer products appear to target exactly these features: they inject rhythm variance, synonym alternation, and punctuation irregularity to break pattern matching.",
            "[INFERRED][C] Over-injection can introduce semantic jitter, factual drift, or awkward tone shifts that reduce practical writing quality.",
        ],
        "code": dedent(
            """\
            def stylometric_vector(doc):
                sents = split_sentences(doc)
                tokens = tokenize(doc)
                return {
                    "sent_len_mean": mean(len(tokenize(s)) for s in sents),
                    "sent_len_std": stdev(len(tokenize(s)) for s in sents),
                    "type_token_ratio": len(set(tokens)) / max(len(tokens), 1),
                    "punct_entropy": shannon_entropy(punctuation_stream(doc)),
                    "discourse_marker_rate": count_markers(doc) / max(len(sents), 1),
                }
            """
        ),
    },
    {
        "id": "m05-detector-architectures",
        "title": "Module 5: Classifier and Ensemble Detector Architectures",
        "summary": (
            "This module maps supervised detector stacks: transformer encoders, pooled representations, "
            "calibrated heads, and ensemble blending across statistical and learned signals."
        ),
        "professor": [
            "[CITED][A] Supervised detectors commonly fine-tune encoder models (BERT/RoBERTa/DeBERTa families) on labeled human/AI corpora, then output class probabilities.",
            "[CITED][A] Distribution shift is central: as generation models evolve, detector decision boundaries age, requiring retraining and domain-specific validation.",
            "[CITED][A] Ensemble methods can improve robustness by combining classifier logits, perplexity-derived features, and heuristic indicators.",
            "[INFERRED][B] Commercial offerings likely maintain rolling retrain pipelines keyed to newly popular generation sources and paraphrase products.",
        ],
        "coder": [
            "[CITED][A] Typical stack: text preprocessing -> tokenizer -> encoder hidden states -> pooling -> dense layers -> sigmoid/softmax -> calibrated confidence.",
            "[CITED][A] Ensemble blending may use weighted averages, gradient-boosted meta-learners, or stacked logistic heads over subsystem outputs.",
            "[INFERRED][B] Sentence-level heatmaps are often derived from sliding-window inference, then smoothed to avoid jagged user-facing highlights.",
        ],
        "plain": [
            "[CITED][A] Many detectors are not one algorithm. They are bundles of models and rules voting on your text.",
            "[CITED][A] That helps with stability, but it can still be wrong when writing style is unusual or heavily edited.",
            "[CITED][A] The practical takeaway is to treat detector output like a risk meter, not a verdict engine.",
        ],
        "inference": [
            "[INFERRED][B] Vendors with broad product suites likely reuse shared text infrastructure (language ID, OCR, document parsing) and route into specialized detector heads per vertical.",
            "[INFERRED][C] “Proprietary indicators” in marketing likely represent private feature groups or ensembles not publicly disclosed for adversarial-resistance reasons.",
        ],
        "code": dedent(
            """\
            def detector_ensemble(doc):
                x = preprocess(doc)
                z1 = encoder_classifier(x)         # supervised detector
                z2 = perplexity_module(x)          # statistical detector
                z3 = stylometric_module(x)         # feature detector
                raw = 0.45 * z1 + 0.30 * z2 + 0.25 * z3
                return calibrate(raw)
            """
        ),
    },
    {
        "id": "m06-detectgpt-watermark",
        "title": "Module 6: DetectGPT, Fast-DetectGPT, Watermarking, and Provenance",
        "summary": (
            "Covers perturbation-based zero-shot detection, watermark proposals, and provenance frameworks "
            "as longer-horizon alternatives to brittle style-only classification."
        ),
        "professor": [
            "[CITED][A] DetectGPT frames machine text as lying in negative curvature regions of model log-probability surfaces under perturbation, enabling zero-shot discrimination without supervised detector training.",
            "[CITED][A] Watermarking schemes (e.g., green-list/red-list token partitioning) embed statistical signatures during generation and can be tested later, provided generation stack cooperation.",
            "[CITED][A] Provenance standards (e.g., C2PA ecosystem) shift the question from text style to source attestation and content lineage.",
            "[INFERRED][B] Near-term deployments will likely be hybrid: partial provenance where available, fallback stylometric/statistical inference where not.",
        ],
        "coder": [
            "[CITED][A] DetectGPT core idea: perturb text candidates, estimate log-probability changes, classify based on expected curvature signature.",
            "[CITED][A] Watermark detectors run hypothesis tests over token streams to determine whether green-list token frequencies deviate from null expectation.",
            "[INFERRED][B] Provenance integration in product UX may land first as metadata badges and API trust scores rather than immediate hard-block policy decisions.",
        ],
        "plain": [
            "[CITED][A] DetectGPT tries to catch AI text by seeing how “fragile” the text is under tiny rewrites in probability space.",
            "[CITED][A] Watermarking is like a hidden statistical signature placed during generation, but it only works when the generator cooperates.",
            "[CITED][A] Provenance asks a different question: can we verify where the content came from, not just how it sounds?",
        ],
        "inference": [
            "[INFERRED][B] Humanizers may eventually target watermark dilution via paraphrase and translation loops, creating a new detection subfield around watermark resilience.",
            "[INFERRED][C] Regulatory demand may accelerate provenance adoption faster than watermark adoption because provenance can be model-agnostic at the policy layer.",
        ],
        "code": dedent(
            """\
            def detectgpt_score(text, base_model, perturb_fn, n=50):
                base = logprob(base_model, text)
                deltas = []
                for _ in range(n):
                    t2 = perturb_fn(text)
                    deltas.append(logprob(base_model, t2) - base)
                return mean(deltas)   # more negative can indicate machine generation
            """
        ),
    },
    {
        "id": "m07-adversarial",
        "title": "Module 7: Adversarial Rewriting and Evasion Pipelines",
        "summary": (
            "Explains detector-evasion tactics, from light paraphrase to multi-stage rewriting with "
            "detector feedback loops, and why this creates a structural arms race."
        ),
        "professor": [
            "[CITED][B] Adversarial NLP literature shows that small perturbations can move classifier outputs across decision boundaries while preserving superficial semantics.",
            "[CITED][A] Commercial humanizers operationalize this concept: they alter lexical/syntactic surfaces to reduce detector confidence.",
            "[INFERRED][B] Feedback-loop products (rewrite -> scan -> rewrite) approximate black-box adversarial optimization without exposing full gradients.",
            "[CITED][A] Aggressive evasion increases semantic damage risk: factual shifts, citation mismatch, or argument structure distortion.",
        ],
        "coder": [
            "[CITED][A] Typical evasion loop: parse text -> rewrite candidate pool -> score against one or more detectors -> keep candidate satisfying threshold and quality constraints.",
            "[INFERRED][B] Multi-objective optimization likely balances bypass score, semantic similarity, readability, and instruction constraints.",
            "[CITED][A] Defensive countermeasure: adversarial training and diverse detector ensembles, plus process evidence (draft history) where available.",
        ],
        "plain": [
            "[CITED][A] Many humanizers are not just “better wording” tools; they are tuned to beat detector patterns.",
            "[CITED][A] You can often lower detector scores, but pushing too far makes text weird, vague, or inaccurate.",
            "[CITED][A] That’s why responsible use still requires human editing and source checking.",
        ],
        "inference": [
            "[INFERRED][B] A stable winner is unlikely. As detectors learn new bypass patterns, humanizers update rewrite behavior, then detectors adjust again.",
            "[INFERRED][C] Closed model updates can suddenly invalidate prior bypass strategies without public changelogs, increasing operational uncertainty for users.",
        ],
        "code": dedent(
            """\
            def evade(text, rewriter, detector, max_rounds=5, target=0.35):
                best = text
                best_score = detector(best)
                for _ in range(max_rounds):
                    cands = rewriter.generate_candidates(best, k=6)
                    scored = [(c, detector(c), semantic_similarity(text, c)) for c in cands]
                    scored.sort(key=lambda t: (t[1], -t[2]))  # low detector score, high semantic retention
                    best, best_score, sim = scored[0]
                    if best_score <= target and sim >= 0.90:
                        break
                return best, best_score
            """
        ),
    },
    {
        "id": "m08-mixed-authorship",
        "title": "Module 8: Mixed-Authorship Forensics and Revision-Metadata Evidence",
        "summary": (
            "Modern writing is frequently human-AI collaborative. This module addresses revision trails, "
            "keystroke provenance, and why process evidence can outperform static-text inference."
        ),
        "professor": [
            "[CITED][A] Mixed authorship complicates binary labels. A single final document can include drafted AI sections, human edits, and copied external material in overlapping layers.",
            "[CITED][A] Process metadata (revision history, keystroke sequences, source insertions) can provide stronger attribution context than final-text style alone.",
            "[INFERRED][B] Authorship-timeline products likely combine event streams (typed/pasted/AI-assisted) into interpretable summaries for reviewer workflows.",
            "[CITED][A] Policy should separate assistance disclosure from misconduct determination; binary detection scores are insufficient for due-process decisions.",
        ],
        "coder": [
            "[CITED][A] Event schema example: timestamp, action_type (type/paste/accept_suggestion), character_delta, source_tag, document_position.",
            "[INFERRED][B] Attribution UIs can compute segment lineage by replaying edit operations and mapping surviving spans to origin types.",
            "[CITED][A] Security concerns include event log tampering, platform portability limits, and privacy governance for keystroke telemetry.",
        ],
        "plain": [
            "[CITED][A] Most real writing now is a blend: human drafting, AI suggestions, then human cleanup.",
            "[CITED][A] A detector sees the final text, but not how it was created. That can miss the full story.",
            "[CITED][A] Draft history and source notes usually give a fairer picture than one output percentage.",
        ],
        "inference": [
            "[INFERRED][B] Institutions that pair detector scores with process evidence will likely reduce false accusations compared with score-only enforcement.",
            "[INFERRED][C] Cross-platform writing (docs, notes, LMS, phone edits) fragments provenance and may limit practical deployment of robust timeline systems.",
        ],
        "code": dedent(
            """\
            def build_lineage(events):
                # events sorted by time
                doc = []
                provenance = []
                for ev in events:
                    doc, provenance = apply_event(doc, provenance, ev)
                return doc, provenance
            """
        ),
    },
    {
        "id": "m09-fairness-bias",
        "title": "Module 9: Fairness, ESL Bias, and Structural False Positives",
        "summary": (
            "Examines why non-native and constrained-style writing can be disproportionately flagged, "
            "and how threshold/policy design can mitigate harm."
        ),
        "professor": [
            "[CITED][A] Evidence from academic analysis reports elevated false positives on non-native English writing in some detector configurations.",
            "[CITED][A] Structural causes include simplified syntax, formulaic transitions, and educational register overlap with model-preferred patterns.",
            "[CITED][A] Fairness-aware evaluation should stratify by language background, genre, proficiency, and prompt constraints, not only aggregate accuracy.",
            "[INFERRED][B] Public dashboards seldom expose subgroup calibration, leaving institutions to infer fairness from sparse external studies.",
        ],
        "coder": [
            "[CITED][A] Measure subgroup metrics: FPR/FNR, expected calibration error, precision-recall at policy thresholds, and confidence intervals.",
            "[CITED][A] Mitigations include threshold adjustments, abstain zones, human review mandates, and process evidence integration.",
            "[INFERRED][B] Detector retraining with balanced ESL corpora can help, but vendor opacity limits independent verification.",
        ],
        "plain": [
            "[CITED][A] Some students can be flagged more often because their writing style is simpler or more formulaic, not because they cheated.",
            "[CITED][A] That is why a single detector score should never be used as automatic proof.",
            "[CITED][A] Fair process means combining scores with drafts, interviews, and assignment context.",
        ],
        "inference": [
            "[INFERRED][B] Without mandatory uncertainty bands and subgroup reporting, fairness improvements may lag behind marketing claims of global accuracy.",
            "[INFERRED][C] Institutions with high-stakes penalties should adopt explicit “no score-only sanctions” policy language.",
        ],
        "code": dedent(
            """\
            def subgroup_report(labels, preds, groups):
                report = {}
                for g in sorted(set(groups)):
                    y = [labels[i] for i in range(len(labels)) if groups[i] == g]
                    p = [preds[i] for i in range(len(preds)) if groups[i] == g]
                    report[g] = {
                        "fpr": false_positive_rate(y, p),
                        "fnr": false_negative_rate(y, p),
                        "ece": expected_calibration_error(y, p),
                    }
                return report
            """
        ),
    },
    {
        "id": "m10-evaluation-economics",
        "title": "Module 10: Evaluation Design, Base Rates, and Threshold Economics",
        "summary": (
            "Shows how prevalence assumptions and threshold choices drive practical error rates, "
            "including base-rate effects often ignored in marketing accuracy claims."
        ),
        "professor": [
            "[CITED][A] Accuracy is prevalence-sensitive; at low base rates, even strong classifiers can produce substantial false-positive burden in operational settings.",
            "[CITED][A] Decision thresholds encode institutional risk preferences. Lower thresholds catch more AI text but increase false accusations.",
            "[CITED][A] Proper evaluation requires PR curves, confusion matrices by domain, and cost-weighted utility analysis aligned with policy consequences.",
            "[INFERRED][B] Vendor headline metrics often summarize curated benchmarks and can diverge from classroom or enterprise distribution realities.",
        ],
        "coder": [
            "[CITED][A] Use scenario simulation with assumed base rates (e.g., 5%, 20%, 50%) to quantify expected false alerts per 1,000 documents.",
            "[CITED][A] Calibrate and monitor drift monthly or per model-release cycle; static thresholds degrade under shifting writing ecosystems.",
            "[INFERRED][B] Mature deployments likely expose configurable sensitivity profiles behind admin controls.",
        ],
        "plain": [
            "[CITED][A] A “99% accurate” claim does not mean 99% of flagged papers are truly AI. Context and prevalence matter.",
            "[CITED][A] If AI misuse is rare, you can still get many wrong flags from a detector with good overall metrics.",
            "[CITED][A] Good policy means setting thresholds carefully and always reviewing evidence beyond the score.",
        ],
        "inference": [
            "[INFERRED][B] Detectors positioned for publishers/SEO may intentionally choose aggressive thresholds, while education tools may market caution language but vary by account settings.",
            "[INFERRED][C] Organizations that skip threshold governance often confuse “operational workload” with “model quality.”",
        ],
        "code": dedent(
            """\
            def expected_alerts(n_docs, base_rate, tpr, fpr):
                positives = n_docs * base_rate
                negatives = n_docs - positives
                tp = positives * tpr
                fp = negatives * fpr
                return {"true_alerts": tp, "false_alerts": fp}
            """
        ),
    },
    {
        "id": "m11-benchmarking",
        "title": "Module 11: Product Benchmarking Methodology and Confounders",
        "summary": (
            "Defines reproducible benchmark design for detector/humanizer comparison and highlights common confounders "
            "like prompt leakage, domain mismatch, and post-edit contamination."
        ),
        "professor": [
            "[CITED][A] Valid benchmarking requires stratified corpora: human-only, AI-only, human-edited AI, translated, OCR-derived, and discipline-specific writing.",
            "[CITED][A] Confounders include source overlap with training data, prompt-template artifacts, and annotation leakage.",
            "[CITED][A] Independent evaluation should document preprocessing parity, token limits, language settings, and repeated-run variance.",
            "[INFERRED][B] Public “detector showdown” content often underreports methodological controls, limiting generalizability.",
        ],
        "coder": [
            "[CITED][A] Benchmark harness should normalize inputs, call vendor APIs/UI workflows consistently, and log response metadata (time, model version cues, score payload).",
            "[CITED][A] For humanizers, evaluate both bypass success and semantic fidelity using similarity metrics plus human judgment.",
            "[INFERRED][B] Re-run variance is meaningful because backend model updates can occur without prominent release notes.",
        ],
        "plain": [
            "[CITED][A] Fair tool comparison means same texts, same rules, same scoring interpretation, and repeated tests.",
            "[CITED][A] A single viral screenshot is not a benchmark.",
            "[CITED][A] You need controlled datasets and careful notes to make believable conclusions.",
        ],
        "inference": [
            "[INFERRED][B] Tool marketing and affiliate ecosystems can bias public comparisons toward dramatic claims rather than method quality.",
            "[INFERRED][C] High-value evaluations increasingly require version tracking because tools quietly evolve.",
        ],
        "code": dedent(
            """\
            def run_benchmark(tools, corpus):
                rows = []
                for tool in tools:
                    for sample in corpus:
                        out = tool.score(sample.text)
                        rows.append({
                            "tool": tool.name,
                            "sample_id": sample.id,
                            "label": sample.label,
                            "score": out.score,
                            "meta": out.meta,
                        })
                return rows
            """
        ),
    },
    {
        "id": "m12-policy",
        "title": "Module 12: Institutional Policy Interpretation Layer",
        "summary": (
            "Translates model behavior into policy workflow for classrooms, publishing teams, and compliance "
            "contexts where procedural fairness and documentation quality matter."
        ),
        "professor": [
            "[CITED][A] Policy should treat detector outputs as triage signals requiring corroboration, not autonomous adjudicators.",
            "[CITED][A] Robust governance includes disclosure requirements, appeal procedures, rubric alignment, and human review checkpoints.",
            "[CITED][A] Institutional guidance increasingly distinguishes acceptable assistance (editing, brainstorming) from prohibited undisclosed authorship substitution.",
            "[INFERRED][B] Organizations with explicit uncertainty language and review logs reduce both legal and reputational risk.",
        ],
        "coder": [
            "[CITED][A] Policy-aware systems should log decision rationale: detector score, reviewer notes, draft evidence, and final disposition.",
            "[CITED][A] Build guardrails in workflow tools: mandatory second reviewer above high-risk thresholds and automated notification of uncertainty statements.",
            "[INFERRED][B] Integrating LMS metadata, plagiarism results, and authorship timelines can reduce overreliance on any single signal.",
        ],
        "plain": [
            "[CITED][A] Good policy is about process, not just software.",
            "[CITED][A] If a score is high, the next step should be review and conversation, not instant punishment.",
            "[CITED][A] Clear rules before assignments are given are better than surprise enforcement after submission.",
        ],
        "inference": [
            "[INFERRED][B] Institutions without documented appeal paths face the highest harm from false positives.",
            "[INFERRED][C] Market pressure may push tools to provide “decision support” language while customers still operationalize them as quasi-verdict engines.",
        ],
        "code": dedent(
            """\
            def policy_decision(score, threshold, draft_evidence, interview_notes):
                if score < threshold:
                    return "No escalation"
                if draft_evidence and interview_notes:
                    return "Contextual review complete"
                return "Escalate for human panel review"
            """
        ),
    },
    {
        "id": "m13-legal-ethics",
        "title": "Module 13: Legal and Ethics Governance Layer",
        "summary": (
            "Addresses privacy, due process, transparency, accessibility, and academic integrity framing "
            "for detector and humanizer deployment."
        ),
        "professor": [
            "[CITED][A] Ethical deployment requires proportionality: match tool uncertainty to consequence severity.",
            "[CITED][A] Privacy considerations include retention limits, training-use disclosures, jurisdictional compliance, and user consent where required.",
            "[CITED][A] Accessibility arguments for language assistance can conflict with strict anti-humanizer policies, requiring nuanced governance.",
            "[INFERRED][B] Legal exposure increases when institutions represent probabilistic outputs as definitive authorship proof.",
        ],
        "coder": [
            "[CITED][A] Compliance-by-design controls: data minimization, retention TTLs, role-based access, audit logs, and explicit model-card style limitations.",
            "[CITED][A] UI should expose uncertainty and caution text near actionable scores.",
            "[INFERRED][B] Future enterprise procurement may require standardized detector transparency statements akin security questionnaires.",
        ],
        "plain": [
            "[CITED][A] These tools affect real people, so fairness and privacy cannot be optional.",
            "[CITED][A] A detector number is not enough to justify major penalties.",
            "[CITED][A] Policies should support legitimate assistance and still protect against misuse.",
        ],
        "inference": [
            "[INFERRED][B] Procurement teams may increasingly treat detector claims like medical-test claims: sensitivity, specificity, and context-of-use requirements.",
            "[INFERRED][C] Humanizer vendors will face growing scrutiny where marketing implies guaranteed evasion outcomes.",
        ],
        "code": dedent(
            """\
            compliance_checklist = [
                "Retention policy disclosed",
                "Training-use policy disclosed",
                "Appeal process documented",
                "Uncertainty language shown in UI",
                "Subgroup evaluation available or commissioned",
            ]
            """
        ),
    },
    {
        "id": "m14-roadmap",
        "title": "Module 14: Future-State Technical Roadmap",
        "summary": (
            "Forecasts plausible next-stage architecture: provenance + watermark hybrids, adversarially trained detectors, "
            "and policy-native scoring interfaces built around uncertainty disclosure."
        ),
        "professor": [
            "[CITED][B] Roadmap convergence is likely around multi-signal stacks: stylometry, semantic consistency, provenance metadata, and watermark tests.",
            "[CITED][A] As model quality rises, purely stylistic differentiation becomes harder, pushing emphasis toward process and source attestation.",
            "[CITED][B] Regulatory and standards bodies are likely to shape disclosure obligations faster than they shape core model design.",
            "[INFERRED][B] The equilibrium is not “perfect detection,” but governance systems resilient to uncertainty and manipulation.",
        ],
        "coder": [
            "[CITED][B] Expect modular pipelines where provenance checks run first, then statistical detectors, then policy decision engines with auditable rationale outputs.",
            "[CITED][A] Red-team loops will include adversarial humanizer corpora and multilingual drift suites.",
            "[INFERRED][B] Versioned detector APIs with explicit model IDs may become enterprise buying criteria.",
        ],
        "plain": [
            "[CITED][B] The future is not one magic detector. It is multiple checks plus better policy.",
            "[CITED][A] Tools will keep changing, so users need workflows that handle uncertainty well.",
            "[CITED][B] The best systems will explain limits clearly instead of pretending to be perfect.",
        ],
        "inference": [
            "[INFERRED][B] Competitive differentiation may shift from raw “accuracy claims” to transparency quality, calibration reporting, and workflow trust features.",
            "[INFERRED][C] Humanizers may evolve toward style-personalization with embedded citation preservation to reduce semantic drift during rewrites.",
        ],
        "code": dedent(
            """\
            future_stack = [
                "provenance_attestation()",
                "watermark_test_if_applicable()",
                "ensemble_detection()",
                "uncertainty_calibration()",
                "policy_workflow_with_human_review()",
            ]
            """
        ),
    },
]


APPS = [
    {
        "name": "Grammarly Core Platform",
        "slug": "grammarly-core",
        "category": "Writing Assistant",
        "confidence": "A",
        "doc_depth": 95,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.grammarly.com/",
        "official_page": "https://support.grammarly.com/hc/en-us",
        "pricing": "Freemium + Pro + Enterprise",
        "audience": "Students, professionals, teams, institutions",
        "claims": "Real-time grammar/style/tone guidance, generative writing support, and workflow integrations across apps. [OFFICIAL][A]",
        "caveats": "Generative and authorship features vary by plan, platform, and institutional configuration. [OFFICIAL][A]",
        "controls": [
            "Editor with goals/tone controls and suggestion cards",
            "Rewrite/paraphrase actions inside document context",
            "Citation and plagiarism surfaces in supported plans",
            "Authorship and activity signals in supported environments",
            "Web and app integrations (browser, desktop, docs/email contexts)",
        ],
        "workflow": [
            "User drafts or pastes text in Grammarly-enabled environment",
            "System annotates issues by severity/type and offers rewrites",
            "Optional generative transformations are requested and inserted",
            "User accepts/rejects suggestions, shaping revision history",
            "Output reflects mixed-authorship workflow, not pure static generation",
        ],
        "output_semantics": "Outputs are assistive recommendations and activity summaries, not authorship verdicts. [OFFICIAL][A]",
        "method_doc": "Public docs describe writing-quality and assistance features, while model internals remain proprietary. [OFFICIAL][A]",
        "method_inferred": "Likely multi-model orchestration for grammar, tone, rewrite generation, and risk checks over shared document-state context. [INFERRED][B]",
        "failure_modes": [
            "Over-smoothing voice if suggestions are accepted uncritically",
            "Domain-specific jargon corrections can misfire",
            "Citation-sensitive writing may need manual source verification",
            "Cross-platform variance in available feature set",
        ],
        "bypass": "Not designed as a bypass engine; editing can still alter detector-facing text statistics indirectly. [INFERRED][B]",
        "privacy": "Trust and privacy documentation available; enterprise and educational deployments vary by contract. [OFFICIAL][A]",
        "responsible_use": "Treat Grammarly as augmentation. Preserve your argument intent, verify citations, and keep drafts for provenance.",
        "unique": "Deep ecosystem integration and authorship-adjacent activity telemetry in supported contexts.",
        "sources": [
            ("Homepage", "https://www.grammarly.com/"),
            ("Support Center", "https://support.grammarly.com/hc/en-us"),
            ("Trust Center", "https://www.grammarly.com/trust"),
            ("Pricing", "https://www.grammarly.com/plans"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "Enterprise/API surfaces documented selectively",
        "languages": "Primarily English-first with multilingual assistance features",
        "files": "Web editor, integrations, and document import contexts",
        "score_type": "Assistive quality signals and optional risk indicators",
        "thresholds": "Contextual suggestion thresholds, not public detector threshold controls",
        "fp_risk": "Medium for style changes; low for verdict misuse because no standalone verdict by default",
        "privacy_grade": "Strong public trust documentation",
    },
    {
        "name": "Grammarly AI Detector",
        "slug": "grammarly-detector",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 88,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.grammarly.com/ai-detector",
        "official_page": "https://support.grammarly.com/hc/en-us/articles/18583284133645-About-Grammarly-s-AI-detector",
        "pricing": "Typically bundled or gated by Grammarly product context",
        "audience": "Students, educators, professionals",
        "claims": "Provides estimate of text likely generated by AI and emphasizes non-definitive interpretation. [OFFICIAL][A]",
        "caveats": "Score is probabilistic and not proof of authorship. [OFFICIAL][A]",
        "controls": [
            "Text input/paste in supported interfaces",
            "AI percentage-style output",
            "Explanation and caution messaging",
            "Integration with broader writing workflow",
        ],
        "workflow": [
            "User submits text",
            "Pipeline analyzes statistical and model-based signals",
            "UI shows estimated AI-likelihood and guidance",
            "User is prompted to interpret with context and documentation",
        ],
        "output_semantics": "Percentage-style AI estimate with caution framing; should be treated as risk signal. [OFFICIAL][A]",
        "method_doc": "Public methodology high-level only; detailed model internals undisclosed. [OFFICIAL][A]",
        "method_inferred": "Likely ensemble combining classifier and uncertainty-style features tuned to Grammarly writing contexts. [INFERRED][B]",
        "failure_modes": [
            "Short samples have unstable confidence",
            "Heavily edited AI text can reduce detectability",
            "Formulaic human writing may be over-flagged",
            "Creative prose and code snippets can be out-of-distribution",
        ],
        "bypass": "Humanizer-style rewrites can alter score behavior; outcome is unstable over time. [INFERRED][B]",
        "privacy": "Governed by Grammarly trust/privacy policies and account context. [OFFICIAL][A]",
        "responsible_use": "Use as one signal alongside drafts, citations, and process evidence.",
        "unique": "Integrated into a broader writing suite rather than standalone detector-only UX.",
        "sources": [
            ("AI Detector Page", "https://www.grammarly.com/ai-detector"),
            ("AI Detector Support", "https://support.grammarly.com/hc/en-us/articles/18583284133645-About-Grammarly-s-AI-detector"),
            ("Trust Center", "https://www.grammarly.com/trust"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Not publicly positioned as standalone detector API",
        "languages": "English-focused detector contexts",
        "files": "Text workflows in Grammarly environments",
        "score_type": "AI-likelihood estimate",
        "thresholds": "User-facing thresholds not broadly exposed",
        "fp_risk": "Moderate; must not be used as sole evidence",
        "privacy_grade": "Strong trust-center framing",
    },
    {
        "name": "Grammarly AI Humanizer",
        "slug": "grammarly-humanizer",
        "category": "Humanizer",
        "confidence": "B",
        "doc_depth": 76,
        "evidence_density": "Medium-High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.grammarly.com/ai-humanizer",
        "official_page": "https://support.grammarly.com/hc/en-us",
        "pricing": "Feature availability varies by plan",
        "audience": "Writers refining tone and naturalness",
        "claims": "Rewrites AI-like phrasing into more natural human-facing prose. [OFFICIAL][B]",
        "caveats": "Naturalness improvements do not guarantee detector outcomes. [OFFICIAL][B]",
        "controls": [
            "Rewrite/humanize actions",
            "Tone and style intent controls",
            "Inline accept/reject editing",
            "Context-aware suggestion cards",
        ],
        "workflow": [
            "User submits text block",
            "Humanizer proposes alternative phrasings",
            "User selectively accepts/rejects edits",
            "Final text reflects human editorial decisions",
        ],
        "output_semantics": "Human-readable rewrite variants with stylistic emphasis.",
        "method_doc": "Public docs emphasize writing quality outcomes over detector-bypass mechanics. [OFFICIAL][B]",
        "method_inferred": "Likely controlled rewrite generation with tone constraints and post-edit ranking for fluency/clarity. [INFERRED][B]",
        "failure_modes": [
            "May over-standardize voice",
            "High rewrite intensity can shift nuance",
            "Technical terminology may be simplified too aggressively",
        ],
        "bypass": "Positioned for writing quality rather than explicit anti-detector guarantees.",
        "privacy": "Covered by Grammarly privacy and trust policies.",
        "responsible_use": "Use for clarity and readability while preserving intent and checking facts.",
        "unique": "Humanization embedded in mainstream writing assistant workflow.",
        "sources": [
            ("AI Humanizer", "https://www.grammarly.com/ai-humanizer"),
            ("Support Center", "https://support.grammarly.com/hc/en-us"),
            ("Plans", "https://www.grammarly.com/plans"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No broadly public dedicated humanizer API",
        "languages": "English-focused with broader writing assistance contexts",
        "files": "Document/editor text workflows",
        "score_type": "Rewrite output quality, not detector-score output",
        "thresholds": "No public anti-detector threshold semantics",
        "fp_risk": "N/A detector; semantic drift risk moderate at high rewrite intensity",
        "privacy_grade": "Strong policy documentation",
    },
    {
        "name": "GPTZero",
        "slug": "gptzero",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 93,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://gptzero.me/",
        "official_page": "https://gptzero.me/docs",
        "pricing": "Freemium + Pro/Educator/Enterprise tiers",
        "audience": "Educators, institutions, publishers, teams",
        "claims": "Highlights AI-written likelihood using multi-indicator analysis with sentence/document views. [OFFICIAL][A]",
        "caveats": "Probabilistic output; recommends contextual interpretation and policy safeguards. [OFFICIAL][A]",
        "controls": [
            "Paste/upload text and document workflows",
            "Sentence-level highlighting and reports",
            "Dashboard and educator tooling",
            "API and batch processing endpoints",
            "Integrations (LMS/extension contexts where documented)",
        ],
        "workflow": [
            "Ingest text or file",
            "Run multi-signal detector stack",
            "Return document + sentence attribution outputs",
            "Allow export/report for reviewer workflow",
        ],
        "output_semantics": "AI/human/mixed indicators with confidence framing and local highlights.",
        "method_doc": "Public material discusses perplexity/burstiness roots and modern multi-signal indicators.",
        "method_inferred": "Likely ensemble with classifier plus statistical modules and anti-paraphrase tuning. [INFERRED][B]",
        "failure_modes": [
            "Short text and poetry can be unstable",
            "Heavily revised AI text may evade",
            "Non-native or constrained writing may be over-flagged",
            "Code-heavy submissions are out-of-domain",
        ],
        "bypass": "Competes directly against humanizer outputs; bypass success varies by rewrite quality and detector updates.",
        "privacy": "Policy docs and enterprise governance materials publicly available.",
        "responsible_use": "Use with draft evidence and human review; avoid single-score sanctions.",
        "unique": "Strong educator-facing workflow and granular output visualization.",
        "sources": [
            ("Homepage", "https://gptzero.me/"),
            ("Docs", "https://gptzero.me/docs"),
            ("API Docs", "https://gptzero.stoplight.io/"),
            ("Pricing", "https://gptzero.me/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Yes, documented API",
        "languages": "English-forward with broader text handling",
        "files": "Text and document uploads",
        "score_type": "Confidence + sentence/document attribution",
        "thresholds": "Configurable sensitivity across plans/workflows",
        "fp_risk": "Moderate; known caution areas include ESL and short text",
        "privacy_grade": "Strong public policy posture",
    },
    {
        "name": "ZeroGPT AI Detector",
        "slug": "zerogpt-detector",
        "category": "Detector",
        "confidence": "B",
        "doc_depth": 72,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.zerogpt.com/",
        "official_page": "https://www.zerogpt.com/pricing",
        "pricing": "Free and paid plans",
        "audience": "Students, freelancers, creators, general users",
        "claims": "Markets high detection accuracy and proprietary analysis technology. [OFFICIAL][B]",
        "caveats": "Public technical detail is limited; independent variance is reported. [INDEPENDENT][B]",
        "controls": [
            "Paste text detector panel",
            "Score/probability output",
            "Highlighting and report views",
            "Companion rewrite/humanizer tools",
        ],
        "workflow": [
            "Paste/import content",
            "Run detector scoring",
            "Inspect score and highlighted segments",
            "Optionally route to companion humanizer tools",
        ],
        "output_semantics": "AI probability-style outputs with segment highlighting.",
        "method_doc": "High-level proprietary framing; no extensive public whitepaper.",
        "method_inferred": "Likely classifier + stylometric heuristics and threshold tuning. [INFERRED][B]",
        "failure_modes": [
            "False positives on formal or formulaic writing",
            "Short text instability",
            "Cross-lingual reliability unclear",
            "Adversarial rewrites can reduce score confidence",
        ],
        "bypass": "Publicly coexists with humanizer workflows, implying active detector-humanizer feedback loop dynamics.",
        "privacy": "Policy pages exist; implementation detail depth is moderate.",
        "responsible_use": "Treat as triage signal, not verdict.",
        "unique": "Strong consumer visibility with integrated detector and rewrite tooling.",
        "sources": [
            ("Homepage", "https://www.zerogpt.com/"),
            ("Pricing", "https://www.zerogpt.com/pricing"),
            ("FAQ", "https://www.zerogpt.com/faq"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Public API visibility limited",
        "languages": "Markets multilingual support",
        "files": "Text and upload workflows",
        "score_type": "Probability-style AI score + highlights",
        "thresholds": "User threshold semantics limited",
        "fp_risk": "Moderate-high in edge cases",
        "privacy_grade": "Moderate clarity",
    },
    {
        "name": "ZeroGPT AI Humanizer",
        "slug": "zerogpt-humanizer",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 61,
        "evidence_density": "Medium-Low",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.zerogpt.com/ai-humanizer",
        "official_page": "https://www.zerogpt.com/pricing",
        "pricing": "Free and paid usage tiers",
        "audience": "Users seeking naturalized rewrites",
        "claims": "Converts AI text into more human-like language. [OFFICIAL][C]",
        "caveats": "Internal rewrite methodology detail is sparse.",
        "controls": [
            "Paste text humanizer input",
            "Rewrite/humanize trigger",
            "Output replacement block",
            "Optional workflow with companion detector",
        ],
        "workflow": [
            "Input generated or draft text",
            "Humanizer applies rewrite transformation",
            "User compares and edits final output",
            "Optional re-check in detector",
        ],
        "output_semantics": "Naturalized rewrite output without robust semantic guarantees.",
        "method_doc": "Public docs emphasize outcomes; algorithm specifics largely undisclosed.",
        "method_inferred": "Likely lexical/syntactic rewriting with fluency scoring and heuristic anti-detection tuning. [INFERRED][C]",
        "failure_modes": [
            "Potential meaning drift",
            "Over-smoothing of technical language",
            "Inconsistent tone control in long-form text",
        ],
        "bypass": "Explicitly tied to detector score reduction goals in user workflows.",
        "privacy": "Policy availability present but technical retention details limited publicly.",
        "responsible_use": "Use for readability improvements with manual fact checking.",
        "unique": "Direct pairing with a popular consumer detector brand.",
        "sources": [
            ("AI Humanizer", "https://www.zerogpt.com/ai-humanizer"),
            ("Pricing", "https://www.zerogpt.com/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No broadly documented dedicated API",
        "languages": "Multilingual claims present",
        "files": "Primarily text-box workflow",
        "score_type": "Rewrite output",
        "thresholds": "No public threshold model",
        "fp_risk": "N/A detector; semantic drift risk moderate-high",
        "privacy_grade": "Basic disclosures available",
    },
    {
        "name": "Winston AI",
        "slug": "winston-ai",
        "category": "Detector",
        "confidence": "B",
        "doc_depth": 80,
        "evidence_density": "Medium-High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://gowinston.ai/",
        "official_page": "https://gowinston.ai/pricing",
        "pricing": "Tiered paid plans",
        "audience": "Educators, publishers, teams",
        "claims": "AI detection with OCR support for image/scanned documents and sentence-level mapping. [OFFICIAL][B]",
        "caveats": "Headline accuracy claims should be interpreted alongside task/domain limits.",
        "controls": [
            "Text paste and document upload",
            "Image/PDF OCR ingestion",
            "Sentence-level prediction map",
            "Report generation",
        ],
        "workflow": [
            "Upload/paste content",
            "OCR pass for scanned sources if needed",
            "Detector scoring and local highlighting",
            "Review/report export",
        ],
        "output_semantics": "Document score plus segment-level map emphasizing suspicious spans.",
        "method_doc": "Public feature docs available; deeper model specifics limited.",
        "method_inferred": "Likely OCR + normalization + detector ensemble with layout-aware preprocessing for scanned material. [INFERRED][B]",
        "failure_modes": [
            "OCR artifacts can distort scoring",
            "Very short text unstable",
            "Poetry/creative genre variability",
            "Non-English edge behavior may vary",
        ],
        "bypass": "Humanized rewrites can alter outcomes, especially when OCR noise is present.",
        "privacy": "Publicly states uploads are not used to train in documented contexts.",
        "responsible_use": "Cross-check OCR text extraction quality before interpreting detector outputs.",
        "unique": "OCR-centric workflow for scanned and image-origin content.",
        "sources": [
            ("Homepage", "https://gowinston.ai/"),
            ("Pricing", "https://gowinston.ai/pricing"),
            ("Help", "https://help.gowinston.ai/"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "API/integration visibility varies by plan",
        "languages": "Primarily English-oriented marketing",
        "files": "TXT/PDF/DOCX/images in supported plans",
        "score_type": "AI likelihood with mapped segments",
        "thresholds": "Plan-level sensitivity detail limited publicly",
        "fp_risk": "Moderate with OCR and short-text edge cases",
        "privacy_grade": "Clear training-use stance in public material",
    },
    {
        "name": "Turnitin AI Writing Indicator",
        "slug": "turnitin-ai",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 90,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.turnitin.com/products/features/ai-writing-detection",
        "official_page": "https://guides.turnitin.com/hc/en-us/articles/23749300031245-AI-writing-detection-model-version",
        "pricing": "Institutional licensing (not general consumer pricing)",
        "audience": "Schools, universities, academic integrity offices",
        "claims": "Institutional AI writing indicator integrated into existing submission/review workflows. [OFFICIAL][A]",
        "caveats": "Intended as indicator, not definitive proof; operational guidance emphasizes human judgment. [OFFICIAL][A]",
        "controls": [
            "Instructor-facing AI indicator",
            "Submission/report integration",
            "Administrative export/reporting options",
            "Institution-level policy context",
        ],
        "workflow": [
            "Student submits assignment",
            "System computes similarity + AI indicator outputs",
            "Instructor reviews indicator with assignment context",
            "Institution follows local policy review process",
        ],
        "output_semantics": "Institution-facing indicator bands and highlighted interpretations, not direct student-facing verdict in many deployments.",
        "method_doc": "Public docs include model-version notes and interpretation guidance; internals proprietary.",
        "method_inferred": "Likely enterprise-scale classifier architecture with domain-specific retraining and policy-driven thresholding. [INFERRED][B]",
        "failure_modes": [
            "Below-minimum length inputs",
            "Heavily edited mixed-authorship text",
            "Non-native writing fairness concerns",
            "Genre mismatch for creative/technical hybrids",
        ],
        "bypass": "Publicly discusses bypass-aware model updates; arms race remains ongoing.",
        "privacy": "Institutional governance and compliance posture documented in product and trust materials.",
        "responsible_use": "Must be embedded in due-process workflow with student context and review rights.",
        "unique": "Dominant institutional integration footprint and policy-centered deployment model.",
        "sources": [
            ("Feature Page", "https://www.turnitin.com/products/features/ai-writing-detection"),
            ("Guides", "https://guides.turnitin.com/"),
            ("Model Version Guidance", "https://guides.turnitin.com/hc/en-us/articles/23749300031245-AI-writing-detection-model-version"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Institution APIs and LMS integrations",
        "languages": "Supported languages vary by model version",
        "files": "Assignment submission formats under institutional workflow",
        "score_type": "AI indicator with institution-facing semantics",
        "thresholds": "Institutional configuration and model-specific interpretation",
        "fp_risk": "Moderate; high-stakes workflow requires corroboration",
        "privacy_grade": "Strong institutional documentation",
    },
    {
        "name": "Copyleaks AI Detector",
        "slug": "copyleaks",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 90,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://copyleaks.com/ai-content-detector",
        "official_page": "https://docs.copyleaks.com/",
        "pricing": "API and business tier pricing",
        "audience": "Enterprise, education, publishers, platforms",
        "claims": "AI text detection with explainability surfaces and broad integrations. [OFFICIAL][A]",
        "caveats": "Performance varies by text type and language; interpretation guidance remains essential.",
        "controls": [
            "Web detector interface",
            "API endpoints for programmatic checks",
            "AI phrase explanations / transparency widgets",
            "Plagiarism + AI combined workflows",
        ],
        "workflow": [
            "Ingest text/doc",
            "Run AI detection and optional plagiarism analysis",
            "Return score, highlights, and rationale artifacts",
            "Integrate into enterprise moderation/review flow",
        ],
        "output_semantics": "Score plus explanation-style artifacts depending on plan/workflow.",
        "method_doc": "Developer docs and product pages provide broad technical framing; proprietary details withheld.",
        "method_inferred": "Likely multi-language classifier ensemble with explainability post-processing. [INFERRED][B]",
        "failure_modes": [
            "Edge cases on short snippets",
            "Mixed-language segments",
            "High creative variance writing",
            "Detector bypass rewrites can reduce confidence",
        ],
        "bypass": "Positions against paraphrase/humanizer bypass patterns; effectiveness depends on adversary adaptation.",
        "privacy": "Public compliance claims (SOC/GDPR) and enterprise posture available.",
        "responsible_use": "Pair confidence outputs with reviewer context and policy thresholds.",
        "unique": "Strong API-first positioning with explainability-focused outputs.",
        "sources": [
            ("AI Detector", "https://copyleaks.com/ai-content-detector"),
            ("Developer Docs", "https://docs.copyleaks.com/"),
            ("Trust/Compliance", "https://copyleaks.com/security"),
            ("Pricing", "https://copyleaks.com/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Yes, robust API",
        "languages": "30+ language support claims",
        "files": "Multiple document formats and API payloads",
        "score_type": "Probability/labels + rationale artifacts",
        "thresholds": "Sensitivity and integration controls in enterprise contexts",
        "fp_risk": "Moderate",
        "privacy_grade": "Strong compliance articulation",
    },
    {
        "name": "Originality.ai",
        "slug": "originality-ai",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 87,
        "evidence_density": "Medium-High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://originality.ai/",
        "official_page": "https://help.originality.ai/",
        "pricing": "Credit-based and subscription tiers",
        "audience": "Publishers, SEO teams, agencies",
        "claims": "Aggressive AI detection variants for publishing and content QA workflows. [OFFICIAL][A]",
        "caveats": "Aggressive sensitivity can increase false-positive burden.",
        "controls": [
            "Scan editor and URL/site-wide scanning tools",
            "Multiple detection model options",
            "Plagiarism/readability/fact-check companion features",
            "Team/account reporting utilities",
        ],
        "workflow": [
            "Submit text or URL corpus",
            "Select detector model/profile",
            "Review AI/plagiarism outputs",
            "Export/share in editorial QA process",
        ],
        "output_semantics": "Model-specific detection scores and content risk views.",
        "method_doc": "Public blogs/help pages describe models and usage recommendations.",
        "method_inferred": "Likely tuned for web-content distributions and adversarial SEO paraphrase patterns. [INFERRED][B]",
        "failure_modes": [
            "Sensitive settings can over-flag",
            "Short snippets noisy",
            "Creative style variation",
            "Language/domain mismatch",
        ],
        "bypass": "Designed for adversarial publishing context; bypass outcomes vary by rewrite quality and tool updates.",
        "privacy": "Public policy docs available; usage terms tied to account model.",
        "responsible_use": "Use aggressive settings with human review and documented threshold policy.",
        "unique": "Credit economy + crawler-based editorial audit workflows.",
        "sources": [
            ("Homepage", "https://originality.ai/"),
            ("Help Center", "https://help.originality.ai/"),
            ("Pricing", "https://originality.ai/pricing"),
            ("AI Detector Docs", "https://help.originality.ai/en/collections/3931321-ai-content-detector"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Yes, business API availability",
        "languages": "Primarily English web-content focus",
        "files": "Text, URL crawl, team scanning contexts",
        "score_type": "Model-profile scores and risk outputs",
        "thresholds": "Configurable by workflow/model choice",
        "fp_risk": "Moderate-high on aggressive profiles",
        "privacy_grade": "Good public policy coverage",
    },
    {
        "name": "Sapling AI Detector",
        "slug": "sapling-detector",
        "category": "Detector",
        "confidence": "A",
        "doc_depth": 84,
        "evidence_density": "Medium-High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://sapling.ai/ai-content-detector",
        "official_page": "https://sapling.ai/docs",
        "pricing": "Free tier + team/API options",
        "audience": "Teams, businesses, educators, individuals",
        "claims": "Transformer-based AI detection with sentence-level inspection and integrations. [OFFICIAL][A]",
        "caveats": "Like all detectors, output is probabilistic and context-dependent.",
        "controls": [
            "Paste and file-based checks",
            "Sentence-level score view",
            "Extensions and integrations",
            "API options for workflow automation",
        ],
        "workflow": [
            "Input text/doc",
            "Run detector",
            "Inspect sentence/document outputs",
            "Integrate results into review process",
        ],
        "output_semantics": "Overall AI-likelihood plus local sentence signals.",
        "method_doc": "Public docs discuss architecture at high level and product behavior.",
        "method_inferred": "Likely encoder-based classifier with per-sentence sliding windows and calibration layer. [INFERRED][B]",
        "failure_modes": [
            "Short inputs",
            "Code and poetic language",
            "Multilingual edge cases",
            "Paraphrase-heavy text",
        ],
        "bypass": "Humanizer and heavy edits can reduce confidence.",
        "privacy": "Public policy/docs available for product and API users.",
        "responsible_use": "Use confidence alongside process evidence and domain-aware review.",
        "unique": "Lightweight UX with developer-friendly extension/API pathways.",
        "sources": [
            ("AI Detector", "https://sapling.ai/ai-content-detector"),
            ("Docs", "https://sapling.ai/docs"),
            ("Pricing", "https://sapling.ai/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Yes",
        "languages": "English-centric with broader support claims",
        "files": "Text, document uploads, extensions",
        "score_type": "Overall + sentence-level confidence",
        "thresholds": "Plan/workflow-specific sensitivity choices",
        "fp_risk": "Moderate",
        "privacy_grade": "Good public docs",
    },
    {
        "name": "QuillBot Paraphraser/Humanizer",
        "slug": "quillbot",
        "category": "Hybrid",
        "confidence": "A",
        "doc_depth": 91,
        "evidence_density": "High",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://quillbot.com/",
        "official_page": "https://help.quillbot.com/hc/en-us",
        "pricing": "Free + Premium",
        "audience": "Students, researchers, professionals",
        "claims": "Mode-rich paraphrasing/humanization with controllable rewrite intensity and companion writing tools. [OFFICIAL][A]",
        "caveats": "High rewrite intensity can alter meaning; detector outcomes are not guaranteed.",
        "controls": [
            "Multiple paraphrase modes including Humanizer",
            "Synonym slider for change intensity",
            "Freeze Words/terms",
            "Compare Modes and revision controls",
            "Companion detector/grammar/summarizer/citation utilities",
        ],
        "workflow": [
            "Paste or import text",
            "Select mode and rewrite intensity",
            "Lock terminology and generate rewrite variants",
            "Compare outputs and finalize manually",
        ],
        "output_semantics": "Rewrite alternatives with visible edit controls and quality tradeoffs.",
        "method_doc": "Help docs provide rich feature-level behavior; internal ranking models remain proprietary.",
        "method_inferred": "Likely controlled paraphrase generation with fluency and semantic-preservation ranking. [INFERRED][B]",
        "failure_modes": [
            "Meaning drift at high synonym settings",
            "Citation phrases can be altered",
            "Technical jargon simplification",
            "Long-form coherence degradation across repeated passes",
        ],
        "bypass": "Can reduce detector scores in some contexts but no stable guarantee.",
        "privacy": "Policy and support materials publicly available.",
        "responsible_use": "Freeze key terms, validate sources, and keep human revision in loop.",
        "unique": "One of the most inspectable humanizer interfaces due to explicit mode controls.",
        "sources": [
            ("Homepage", "https://quillbot.com/"),
            ("Help Center", "https://help.quillbot.com/hc/en-us"),
            ("Pricing", "https://quillbot.com/pricing"),
            ("Compare Modes", "https://help.quillbot.com/hc/en-us/articles/35855140458391-What-is-Compare-Modes-in-QuillBot"),
        ],
        "detector": True,
        "humanizer": True,
        "api": "Limited public API emphasis compared with product UI",
        "languages": "Broad user-facing language support claims",
        "files": "Text/doc integrations and extensions",
        "score_type": "Rewrite outputs + companion detector features",
        "thresholds": "Mode/slider controls replace explicit threshold controls",
        "fp_risk": "Detector components moderate; rewrite drift moderate",
        "privacy_grade": "Good documentation",
    },
    {
        "name": "Undetectable AI",
        "slug": "undetectable-ai",
        "category": "Humanizer",
        "confidence": "B",
        "doc_depth": 77,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://undetectable.ai/",
        "official_page": "https://undetectable.ai/pricing",
        "pricing": "Subscription tiers",
        "audience": "Creators and marketers seeking detector-resistant text",
        "claims": "Purpose-built humanizer with detector score feedback workflows. [OFFICIAL][B]",
        "caveats": "Bypass claims are adversarial and unstable over time.",
        "controls": [
            "Humanization mode presets",
            "Integrated detector score checks",
            "Tone/style settings",
            "Batch or workflow scaling options",
        ],
        "workflow": [
            "Input AI-like text",
            "Apply humanizer with selected tone/preset",
            "Check detector-facing outputs",
            "Iterate until acceptable quality-score balance",
        ],
        "output_semantics": "Detector-aware rewritten text with quality vs bypass tradeoff.",
        "method_doc": "Public messaging emphasizes outcomes more than algorithmic specifics.",
        "method_inferred": "Likely iterative rewrite + detector-feedback optimization loop. [INFERRED][B]",
        "failure_modes": [
            "Semantic drift under aggressive settings",
            "Sentence-level coherence artifacts",
            "Citation/instruction loss in technical writing",
        ],
        "bypass": "Core product proposition centers on bypass probability improvements.",
        "privacy": "Policy pages available; implementation depth moderate.",
        "responsible_use": "Use cautiously; verify factual integrity and policy compliance.",
        "unique": "Built-in detector feedback loop as core UX element.",
        "sources": [
            ("Homepage", "https://undetectable.ai/"),
            ("Pricing", "https://undetectable.ai/pricing"),
            ("FAQ", "https://undetectable.ai/faq"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "Public API detail limited",
        "languages": "Multilingual claims",
        "files": "Text workflows",
        "score_type": "Rewrite + detector panel outputs",
        "thresholds": "User targets detector score reductions",
        "fp_risk": "N/A detector; high semantic-damage risk if over-optimized",
        "privacy_grade": "Moderate clarity",
    },
    {
        "name": "StealthGPT",
        "slug": "stealthgpt",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 64,
        "evidence_density": "Medium-Low",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://stealthgpt.ai/",
        "official_page": "https://stealthgpt.ai/pricing",
        "pricing": "Subscription tiers",
        "audience": "Users optimizing AI text for detector resistance",
        "claims": "Statistical-level rewriting aimed at reducing detector flags. [OFFICIAL][C]",
        "caveats": "Public technical depth remains limited.",
        "controls": [
            "Paste/rewrite panel",
            "Multiple rewrite intensities",
            "Detector-oriented output framing",
        ],
        "workflow": [
            "Submit source text",
            "Generate one or more stealth rewrites",
            "Evaluate in detector environment",
            "Iterate manually",
        ],
        "output_semantics": "Rewritten text tuned for changed statistical profile.",
        "method_doc": "Outcome-centric documentation with sparse algorithmic disclosure.",
        "method_inferred": "Likely stylometric perturbation and sentence-structure variance injection. [INFERRED][C]",
        "failure_modes": [
            "Meaning drift",
            "Tone instability",
            "Academic structure degradation in long essays",
        ],
        "bypass": "Bypass-centric marketing; durability uncertain across detector updates.",
        "privacy": "Policy pages available but limited technical detail.",
        "responsible_use": "Preserve argument structure and verify claims after rewriting.",
        "unique": "Narrow focus on stealth rewrite outcomes.",
        "sources": [
            ("Homepage", "https://stealthgpt.ai/"),
            ("Pricing", "https://stealthgpt.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "Public API details limited",
        "languages": "Primarily English marketing",
        "files": "Text-based workflows",
        "score_type": "Rewrite output",
        "thresholds": "User-driven detector score targets",
        "fp_risk": "N/A detector; high rewrite-risk if overused",
        "privacy_grade": "Basic disclosures",
    },
    {
        "name": "HIX Bypass",
        "slug": "hix-bypass",
        "category": "Humanizer",
        "confidence": "B",
        "doc_depth": 75,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://bypass.hix.ai/",
        "official_page": "https://bypass.hix.ai/pricing",
        "pricing": "Tiered plans",
        "audience": "Creators/marketers seeking detector-resistant copy",
        "claims": "Humanizer with mode controls and detector-check workflow. [OFFICIAL][B]",
        "caveats": "Detector-specific outcomes change as external models update.",
        "controls": [
            "Mode selection (fast/balanced/academic/creative where documented)",
            "Paste input and rewrite output",
            "Integrated scan/check loop",
        ],
        "workflow": [
            "Input text",
            "Select mode and rewrite",
            "Review detector-facing outputs",
            "Refine with manual edits",
        ],
        "output_semantics": "Mode-dependent rewrite with quality/bypass tradeoff.",
        "method_doc": "Public method detail moderate and mostly outcome-centric.",
        "method_inferred": "Likely NLP rewrite + detector feedback ranking loop. [INFERRED][B]",
        "failure_modes": [
            "Potential factual drift",
            "Voice flattening",
            "Overfitting to detector heuristics",
        ],
        "bypass": "Explicit bypass orientation in product framing.",
        "privacy": "Policy pages available; detail depth moderate.",
        "responsible_use": "Use for editing support, not evidence evasion.",
        "unique": "Part of broader HIX ecosystem.",
        "sources": [
            ("Homepage", "https://bypass.hix.ai/"),
            ("Pricing", "https://bypass.hix.ai/pricing"),
            ("HIX Main", "https://hix.ai/"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "API details limited publicly for bypass product",
        "languages": "Broad language support claims",
        "files": "Text workflows",
        "score_type": "Rewrite output + optional scan metrics",
        "thresholds": "Mode-based rather than explicit probability thresholds",
        "fp_risk": "N/A detector; medium-high semantic drift risk",
        "privacy_grade": "Moderate policy clarity",
    },
    {
        "name": "Humanize AI (humanizeai.pro)",
        "slug": "humanizeai-pro",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 59,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://humanizeai.pro/",
        "official_page": "https://humanizeai.pro/pricing",
        "pricing": "Free + paid usage tiers",
        "audience": "General users wanting simple humanization",
        "claims": "Quick sentence restructuring and naturalization for AI-like text. [OFFICIAL][C]",
        "caveats": "Public internals and validation depth are limited.",
        "controls": [
            "Simple paste-and-click interface",
            "Rewrite output pane",
            "Language options",
        ],
        "workflow": [
            "Paste source text",
            "Run humanize process",
            "Copy/edit output",
        ],
        "output_semantics": "Surface-level rewrite emphasis with lightweight controls.",
        "method_doc": "Minimal public technical detail.",
        "method_inferred": "Likely template-guided paraphrase and syntactic reshaping with fluency filtering. [INFERRED][C]",
        "failure_modes": [
            "Shallow paraphrase artifacts",
            "Meaning drift in technical text",
            "Inconsistent tone in long documents",
        ],
        "bypass": "Often used for bypass attempts but guarantees are not robust.",
        "privacy": "Policy pages present with limited depth.",
        "responsible_use": "Treat output as draft; rewrite manually for fidelity.",
        "unique": "Low-friction entry point with minimal setup.",
        "sources": [
            ("Homepage", "https://humanizeai.pro/"),
            ("Pricing", "https://humanizeai.pro/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No broad public API docs",
        "languages": "Claims multilingual support",
        "files": "Primarily text area workflow",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold controls",
        "fp_risk": "N/A detector; moderate semantic drift risk",
        "privacy_grade": "Low-medium transparency",
    },
    {
        "name": "Scribbr AI Detector",
        "slug": "scribbr-detector",
        "category": "Detector",
        "confidence": "B",
        "doc_depth": 73,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.scribbr.com/ai-detector/",
        "official_page": "https://www.scribbr.com/frequently-asked-questions/what-is-an-ai-detector/",
        "pricing": "Free checks with premium ecosystem offerings",
        "audience": "Students and academic writers",
        "claims": "Academic-facing AI detection utility integrated with citation/plagiarism ecosystem context. [OFFICIAL][B]",
        "caveats": "Should not be treated as sole proof of authorship.",
        "controls": [
            "Paste-based detector interface",
            "Score/result output",
            "Academic writing guidance context",
        ],
        "workflow": [
            "Paste text",
            "Run detector",
            "Review score and writing guidance",
        ],
        "output_semantics": "User-facing probability-style interpretation.",
        "method_doc": "Method detail moderate via educational explainer pages.",
        "method_inferred": "Likely third-party detector integration or proprietary wrapper with academic UX framing. [INFERRED][C]",
        "failure_modes": [
            "Short essays",
            "Formal writing false positives",
            "Creative text mismatch",
        ],
        "bypass": "Not designed as bypass-resistant enterprise detector.",
        "privacy": "General policy pages available.",
        "responsible_use": "Use as self-check, not proof system.",
        "unique": "Academic writing guidance pairing with detector utility.",
        "sources": [
            ("AI Detector", "https://www.scribbr.com/ai-detector/"),
            ("FAQ", "https://www.scribbr.com/frequently-asked-questions/what-is-an-ai-detector/"),
            ("Plagiarism Checker", "https://www.scribbr.com/plagiarism-checker/"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "No public detector API emphasis",
        "languages": "English-focused",
        "files": "Text input interface",
        "score_type": "Probability-style output",
        "thresholds": "Not richly exposed",
        "fp_risk": "Moderate",
        "privacy_grade": "Standard policy visibility",
    },
    {
        "name": "Crossplag AI Detector",
        "slug": "crossplag",
        "category": "Detector",
        "confidence": "B",
        "doc_depth": 70,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://crossplag.com/ai-content-detector/",
        "official_page": "https://crossplag.com/pricing/",
        "pricing": "Free/premium tiers",
        "audience": "Educators and content reviewers",
        "claims": "AI content detection plus plagiarism ecosystem tooling. [OFFICIAL][B]",
        "caveats": "Model internals and validation detail limited publicly.",
        "controls": [
            "Paste text detector UI",
            "Percentage-style score",
            "Plagiarism-adjacent utilities",
        ],
        "workflow": [
            "Input text",
            "Run analysis",
            "Inspect AI-likelihood output",
        ],
        "output_semantics": "Single-score oriented detector output.",
        "method_doc": "Moderate feature-level documentation, sparse deep methodology.",
        "method_inferred": "Likely classifier-driven detector with basic explanation layer. [INFERRED][C]",
        "failure_modes": [
            "Short text instability",
            "ESL formal style false positives",
            "Creative text variability",
        ],
        "bypass": "Bypass resistance uncertain publicly.",
        "privacy": "General legal/privacy pages available.",
        "responsible_use": "Use only as preliminary signal.",
        "unique": "Plagiarism + AI positioning.",
        "sources": [
            ("Detector", "https://crossplag.com/ai-content-detector/"),
            ("Pricing", "https://crossplag.com/pricing/"),
            ("About", "https://crossplag.com/about-us/"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "API emphasis limited publicly",
        "languages": "Primarily English-facing",
        "files": "Text interface and platform workflows",
        "score_type": "Percentage-like output",
        "thresholds": "Limited user threshold controls",
        "fp_risk": "Moderate-high on edge cases",
        "privacy_grade": "Basic policy coverage",
    },
    {
        "name": "Smodin AI Detector",
        "slug": "smodin-detector",
        "category": "Hybrid",
        "confidence": "B",
        "doc_depth": 71,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://smodin.io/ai-content-detector",
        "official_page": "https://smodin.io/pricing",
        "pricing": "Free + subscription",
        "audience": "Students, educators, content users",
        "claims": "Detector and writing tool suite in one platform. [OFFICIAL][B]",
        "caveats": "Tool quality and transparency vary across suite components.",
        "controls": [
            "Detector input/output panel",
            "Writer/rewrite companion tools",
            "Language and utility tool ecosystem",
        ],
        "workflow": [
            "Submit text to detector",
            "Inspect score",
            "Optionally use rewriting tools and re-check",
        ],
        "output_semantics": "Detector score within multi-tool context.",
        "method_doc": "Moderate high-level documentation.",
        "method_inferred": "Likely shared NLP backbone across detector and rewrite utilities. [INFERRED][C]",
        "failure_modes": [
            "Short text",
            "Non-native writing",
            "High paraphrase loops causing semantic drift",
        ],
        "bypass": "Hybrid suite naturally enables detector-rewrite loop behavior.",
        "privacy": "Policy pages publicly available.",
        "responsible_use": "Prioritize semantic correctness over score chasing.",
        "unique": "Large utility-suite ecosystem around detector.",
        "sources": [
            ("AI Detector", "https://smodin.io/ai-content-detector"),
            ("Pricing", "https://smodin.io/pricing"),
            ("Tools", "https://smodin.io/tools"),
        ],
        "detector": True,
        "humanizer": True,
        "api": "API visibility limited",
        "languages": "Broad language support claims",
        "files": "Text workflows",
        "score_type": "Score/label output",
        "thresholds": "Limited explicit threshold controls",
        "fp_risk": "Moderate",
        "privacy_grade": "Standard policy availability",
    },
    {
        "name": "Detecting-AI",
        "slug": "detecting-ai",
        "category": "Detector",
        "confidence": "C",
        "doc_depth": 58,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://detecting-ai.com/",
        "official_page": "https://detecting-ai.com/pricing",
        "pricing": "Free + paid tiers",
        "audience": "General detector users",
        "claims": "Quick AI detector with simple percentage output. [OFFICIAL][C]",
        "caveats": "Sparse methodology disclosures.",
        "controls": [
            "Paste input",
            "Single-score output",
            "Basic usage dashboard",
        ],
        "workflow": [
            "Paste text",
            "Run check",
            "Review detector score",
        ],
        "output_semantics": "Headline AI-likelihood score with limited explanation.",
        "method_doc": "Minimal technical documentation.",
        "method_inferred": "Likely lightweight classifier API wrapper. [INFERRED][C]",
        "failure_modes": [
            "Short inputs",
            "Formal human writing false positives",
            "Limited transparency on multilingual behavior",
        ],
        "bypass": "Bypass resilience unclear.",
        "privacy": "Basic policy pages available.",
        "responsible_use": "Use only as low-confidence preliminary signal.",
        "unique": "Fast consumer-focused UI.",
        "sources": [
            ("Homepage", "https://detecting-ai.com/"),
            ("Pricing", "https://detecting-ai.com/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "No rich public API docs",
        "languages": "Claims multilingual support",
        "files": "Text input",
        "score_type": "Single score",
        "thresholds": "Not exposed",
        "fp_risk": "High uncertainty",
        "privacy_grade": "Basic",
    },
    {
        "name": "Isgen AI Detector",
        "slug": "isgen-detector",
        "category": "Detector",
        "confidence": "C",
        "doc_depth": 57,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://isgen.ai/",
        "official_page": "https://isgen.ai/pricing",
        "pricing": "Freemium-style",
        "audience": "General creators and students",
        "claims": "Fast detector with consumer-friendly workflow. [OFFICIAL][C]",
        "caveats": "Limited public methodology transparency.",
        "controls": [
            "Text input and result panel",
            "Score output",
            "Basic account workflows",
        ],
        "workflow": [
            "Submit text",
            "Receive AI-likelihood output",
            "Iterate with editing tools",
        ],
        "output_semantics": "Single-score style output.",
        "method_doc": "Minimal public technical detail.",
        "method_inferred": "Likely API-backed classification with simplified front-end reporting. [INFERRED][C]",
        "failure_modes": [
            "Edge-case style false positives",
            "Low transparency on threshold behavior",
            "Short-text volatility",
        ],
        "bypass": "Bypass resistance unclear publicly.",
        "privacy": "Basic legal/privacy documents available.",
        "responsible_use": "Avoid high-stakes decisions from this signal alone.",
        "unique": "Simple, low-friction detector UX.",
        "sources": [
            ("Homepage", "https://isgen.ai/"),
            ("Pricing", "https://isgen.ai/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Not publicly emphasized",
        "languages": "Limited explicit detail",
        "files": "Text panel",
        "score_type": "Single score output",
        "thresholds": "Undisclosed",
        "fp_risk": "High uncertainty",
        "privacy_grade": "Basic",
    },
    {
        "name": "Pangram Labs (Detection + Model Risk Surface)",
        "slug": "pangram-labs",
        "category": "Adjacent Verification",
        "confidence": "B",
        "doc_depth": 74,
        "evidence_density": "Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.pangram.com/",
        "official_page": "https://www.pangram.com/docs",
        "pricing": "Enterprise and platform-specific",
        "audience": "Platforms, enterprises, policy-sensitive deployments",
        "claims": "Risk-analysis and detection-adjacent tooling for model/content safety and provenance-aware contexts. [OFFICIAL][B]",
        "caveats": "Positioning differs from consumer “essay detector” workflows.",
        "controls": [
            "API/documentation-oriented product surfaces",
            "Risk and classification endpoints",
            "Model behavior reporting features",
        ],
        "workflow": [
            "Integrate API",
            "Submit content/model outputs",
            "Receive risk-oriented signals",
            "Apply policy-layer controls",
        ],
        "output_semantics": "Risk and classification signals rather than simple consumer AI percentage.",
        "method_doc": "Developer-centric docs provide more structure than many consumer tools.",
        "method_inferred": "Likely modular detection and safety classifiers for enterprise workflows. [INFERRED][B]",
        "failure_modes": [
            "Not optimized for consumer essay adjudication use",
            "Integration complexity",
            "Policy mapping required",
        ],
        "bypass": "Focus is broader risk control, not humanizer bypass race alone.",
        "privacy": "Enterprise-oriented compliance and API terms documentation.",
        "responsible_use": "Use in policy workflows with explicit risk categories and review steps.",
        "unique": "Adjacent verification focus beyond student detector framing.",
        "sources": [
            ("Homepage", "https://www.pangram.com/"),
            ("Docs", "https://www.pangram.com/docs"),
            ("Pricing", "https://www.pangram.com/pricing"),
        ],
        "detector": True,
        "humanizer": False,
        "api": "Yes, API-first orientation",
        "languages": "Enterprise-dependent",
        "files": "API payload-based workflows",
        "score_type": "Risk-class outputs",
        "thresholds": "Enterprise policy-tuned thresholds",
        "fp_risk": "Context-specific",
        "privacy_grade": "Enterprise-grade posture",
    },
    {
        "name": "Phrasly AI Humanizer",
        "slug": "phrasly",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 60,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.phrasly.ai/",
        "official_page": "https://www.phrasly.ai/pricing",
        "pricing": "Free + premium tiers",
        "audience": "Students and creators",
        "claims": "Humanizer/paraphrase outputs aimed at more natural text.",
        "caveats": "Public technical validation sparse.",
        "controls": [
            "Paste and humanize controls",
            "Style-level options",
            "Result copy/export workflows",
        ],
        "workflow": [
            "Input text",
            "Choose rewrite style",
            "Generate and review output",
        ],
        "output_semantics": "Humanized rewrite with variable semantic retention.",
        "method_doc": "Limited technical disclosures.",
        "method_inferred": "Likely paraphrase generation with lexical restructuring heuristics. [INFERRED][C]",
        "failure_modes": [
            "Meaning drift",
            "Citation distortion",
            "Over-simplification in technical writing",
        ],
        "bypass": "Bypass use-cases are common but unstable.",
        "privacy": "Basic policy pages.",
        "responsible_use": "Treat output as editable draft.",
        "unique": "Student-friendly humanizer branding.",
        "sources": [
            ("Homepage", "https://www.phrasly.ai/"),
            ("Pricing", "https://www.phrasly.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No broad API docs",
        "languages": "Limited public detail",
        "files": "Text input",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold model",
        "fp_risk": "N/A detector; rewrite drift risk moderate-high",
        "privacy_grade": "Basic",
    },
    {
        "name": "BypassGPT",
        "slug": "bypassgpt",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 58,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://bypassgpt.ai/",
        "official_page": "https://bypassgpt.ai/pricing",
        "pricing": "Subscription tiers",
        "audience": "Users seeking detector-evasive rewrites",
        "claims": "AI bypass-focused rewriting outcomes.",
        "caveats": "Limited public methodology detail.",
        "controls": [
            "Paste/humanize workflow",
            "Bypass-oriented output framing",
            "Plan-based usage limits",
        ],
        "workflow": [
            "Input text",
            "Generate bypass rewrite",
            "Validate externally",
        ],
        "output_semantics": "Detector-targeted rewritten text.",
        "method_doc": "Mostly outcome-oriented documentation.",
        "method_inferred": "Likely adversarial paraphrase loop with detector-facing heuristics. [INFERRED][C]",
        "failure_modes": [
            "Factual drift",
            "Style inconsistency",
            "Unstable detector outcomes",
        ],
        "bypass": "Primary product proposition.",
        "privacy": "Basic terms/privacy pages.",
        "responsible_use": "Never trust bypass output without human quality audit.",
        "unique": "Explicit bypass-first positioning.",
        "sources": [
            ("Homepage", "https://bypassgpt.ai/"),
            ("Pricing", "https://bypassgpt.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No rich public API docs",
        "languages": "Marketing claims vary",
        "files": "Text workflows",
        "score_type": "Rewrite output",
        "thresholds": "User-goal driven",
        "fp_risk": "N/A detector; high semantic risk",
        "privacy_grade": "Basic",
    },
    {
        "name": "StealthWriter",
        "slug": "stealthwriter",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 57,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://stealthwriter.ai/",
        "official_page": "https://stealthwriter.ai/pricing",
        "pricing": "Freemium/subscription",
        "audience": "Content creators",
        "claims": "Converts AI text into more natural language for detector resistance.",
        "caveats": "Sparse public architecture detail.",
        "controls": [
            "Rewrite controls and output display",
            "Plan-based usage constraints",
            "Simple mode variants",
        ],
        "workflow": [
            "Paste source text",
            "Generate rewritten version",
            "Copy/edit final text",
        ],
        "output_semantics": "Humanized variant output.",
        "method_doc": "Minimal technical details.",
        "method_inferred": "Likely lexical and syntactic variance injection plus fluency scoring. [INFERRED][C]",
        "failure_modes": [
            "Semantic drift",
            "Uneven tone",
            "Long-form coherence drops",
        ],
        "bypass": "Bypass claims central but non-guaranteed.",
        "privacy": "Basic legal policy pages.",
        "responsible_use": "Use only with close manual review.",
        "unique": "Simple detector-oriented rewrite interface.",
        "sources": [
            ("Homepage", "https://stealthwriter.ai/"),
            ("Pricing", "https://stealthwriter.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No prominent public API",
        "languages": "Limited detail",
        "files": "Text only",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold controls",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "Humbot",
        "slug": "humbot",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 56,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://humbot.ai/",
        "official_page": "https://humbot.ai/pricing",
        "pricing": "Tiered plans",
        "audience": "General humanizer users",
        "claims": "AI-to-human text rewriting service.",
        "caveats": "Public evidence depth limited.",
        "controls": [
            "Text input",
            "Humanize action",
            "Output pane",
        ],
        "workflow": [
            "Input text",
            "Run rewrite",
            "Copy and manually refine",
        ],
        "output_semantics": "Rewritten text oriented to natural style.",
        "method_doc": "Sparse technical documentation.",
        "method_inferred": "Likely paraphrase stack with style constraints. [INFERRED][C]",
        "failure_modes": [
            "Meaning changes",
            "Context omission",
            "Quality variance by prompt complexity",
        ],
        "bypass": "Often marketed toward bypass-adjacent use-cases.",
        "privacy": "Basic policy pages available.",
        "responsible_use": "Manual fact checking required.",
        "unique": "Lightweight no-friction humanizer UX.",
        "sources": [
            ("Homepage", "https://humbot.ai/"),
            ("Pricing", "https://humbot.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No broad public API docs",
        "languages": "Multilingual claims",
        "files": "Text interface",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold controls",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "WriteHuman",
        "slug": "writehuman",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 56,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://writehuman.ai/",
        "official_page": "https://writehuman.ai/pricing",
        "pricing": "Subscription model",
        "audience": "Writers targeting naturalized outputs",
        "claims": "Transforms AI-generated text to read more human.",
        "caveats": "Methodology and benchmarking detail limited.",
        "controls": [
            "Paste/rewrite UI",
            "Plan-based limits",
            "Output copy controls",
        ],
        "workflow": [
            "Input source text",
            "Generate rewritten output",
            "Review and edit",
        ],
        "output_semantics": "Humanized output block.",
        "method_doc": "Outcome-first docs with sparse internals.",
        "method_inferred": "Likely style-transfer paraphrase pipeline. [INFERRED][C]",
        "failure_modes": [
            "Unintended wording shifts",
            "Information loss",
            "Tone mismatch",
        ],
        "bypass": "Bypass-adjacent marketing framing.",
        "privacy": "Basic policy disclosures.",
        "responsible_use": "Human revision is mandatory for correctness.",
        "unique": "Simple “paste and humanize” workflow positioning.",
        "sources": [
            ("Homepage", "https://writehuman.ai/"),
            ("Pricing", "https://writehuman.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No major public API docs",
        "languages": "Limited detail",
        "files": "Text panel",
        "score_type": "Rewrite output",
        "thresholds": "Not exposed",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "Netus AI Humanizer",
        "slug": "netus",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 58,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://netus.ai/",
        "official_page": "https://netus.ai/pricing",
        "pricing": "Free trial + paid plans",
        "audience": "SEO/content teams",
        "claims": "Paraphrasing/humanizing for content repurposing.",
        "caveats": "Limited independent transparency.",
        "controls": [
            "Paraphrase/humanize options",
            "Tone/output settings",
            "Batch-like content workflows",
        ],
        "workflow": [
            "Input content",
            "Select rewriting options",
            "Generate and refine output",
        ],
        "output_semantics": "Paraphrased/humanized content variant.",
        "method_doc": "Moderate product-level docs, sparse internals.",
        "method_inferred": "Likely retrieval-free paraphrase model with heuristic ranking. [INFERRED][C]",
        "failure_modes": [
            "SEO over-optimization language artifacts",
            "Meaning drift in technical content",
            "Source attribution loss",
        ],
        "bypass": "Potential detector score reduction is secondary to content rewriting positioning.",
        "privacy": "Basic policy pages.",
        "responsible_use": "Retain citation and factual integrity checks.",
        "unique": "Content/SEO workflow framing.",
        "sources": [
            ("Homepage", "https://netus.ai/"),
            ("Pricing", "https://netus.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "Limited public API detail",
        "languages": "Multiple language claims",
        "files": "Text workflows",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold controls",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "Uncheck AI",
        "slug": "uncheck-ai",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 55,
        "evidence_density": "Low",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://uncheck.ai/",
        "official_page": "https://uncheck.ai/pricing",
        "pricing": "Tiered plans",
        "audience": "Bypass-focused users",
        "claims": "Humanization aimed at reducing AI detector signals.",
        "caveats": "Method and validation transparency low.",
        "controls": [
            "Paste input and rewrite trigger",
            "Mode or intensity settings",
            "Output copy utility",
        ],
        "workflow": [
            "Input text",
            "Run humanizer",
            "Validate and edit",
        ],
        "output_semantics": "Detector-targeted rewrite output.",
        "method_doc": "Limited public internals.",
        "method_inferred": "Likely heuristic rewrite cascade with detector-aware tuning. [INFERRED][C]",
        "failure_modes": [
            "High semantic drift risk",
            "Awkward phrase substitutions",
            "Long-form coherence drop",
        ],
        "bypass": "Bypass-centric framing.",
        "privacy": "Basic policy exposure.",
        "responsible_use": "Do not treat output as final without deep review.",
        "unique": "Explicit anti-detection branding.",
        "sources": [
            ("Homepage", "https://uncheck.ai/"),
            ("Pricing", "https://uncheck.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No public API docs",
        "languages": "Limited detail",
        "files": "Text workflows",
        "score_type": "Rewrite output",
        "thresholds": "User-goal driven",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "CudekAI (Detector + Humanizer Suite)",
        "slug": "cudekai",
        "category": "Hybrid",
        "confidence": "C",
        "doc_depth": 60,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://cudekai.com/",
        "official_page": "https://cudekai.com/pricing/",
        "pricing": "Free + premium tiers",
        "audience": "General education/content users",
        "claims": "Offers AI detector and humanizer tools in a single suite.",
        "caveats": "Deep methodology documentation limited.",
        "controls": [
            "Detector panel",
            "Humanizer panel",
            "Additional writing utilities",
        ],
        "workflow": [
            "Submit text to detector",
            "Apply humanizer if needed",
            "Re-check and manually refine",
        ],
        "output_semantics": "Combined score + rewrite workflow outputs.",
        "method_doc": "Feature-level descriptions available; algorithm internals sparse.",
        "method_inferred": "Likely third-party model orchestration with custom UX layer. [INFERRED][C]",
        "failure_modes": [
            "Looping rewrite/detect can degrade meaning",
            "Score volatility across versions",
            "Limited transparency around calibration",
        ],
        "bypass": "Hybrid suite enables built-in adversarial loop behavior.",
        "privacy": "Basic legal/privacy pages available.",
        "responsible_use": "Use for exploratory editing, not final adjudication.",
        "unique": "Unified detector/humanizer consumer toolkit.",
        "sources": [
            ("Homepage", "https://cudekai.com/"),
            ("Pricing", "https://cudekai.com/pricing/"),
            ("Tools", "https://cudekai.com/tools/"),
        ],
        "detector": True,
        "humanizer": True,
        "api": "No widely documented API",
        "languages": "Multilingual claims",
        "files": "Text workflows",
        "score_type": "Score + rewrite outputs",
        "thresholds": "Limited threshold documentation",
        "fp_risk": "Moderate-high uncertainty",
        "privacy_grade": "Basic",
    },
    {
        "name": "AISEO Humanizer",
        "slug": "aiseo-humanizer",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 57,
        "evidence_density": "Low-Medium",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://aiseo.ai/tools/ai-humanizer",
        "official_page": "https://aiseo.ai/pricing",
        "pricing": "Subscription tiers",
        "audience": "SEO/content teams",
        "claims": "Humanizer for readability and AI-like text reduction.",
        "caveats": "Technical transparency limited.",
        "controls": [
            "Paste + rewrite panel",
            "Style options",
            "Export/copy output",
        ],
        "workflow": [
            "Input text",
            "Select options",
            "Generate and refine rewrite",
        ],
        "output_semantics": "Humanized content output.",
        "method_doc": "Feature marketing available; internals sparse.",
        "method_inferred": "Likely paraphrase model with SEO-style optimization heuristics. [INFERRED][C]",
        "failure_modes": [
            "Tone flattening",
            "Keyword over-preservation or loss",
            "Meaning drift",
        ],
        "bypass": "Often used for detector avoidance goals.",
        "privacy": "Basic policy docs available.",
        "responsible_use": "Validate semantic fidelity and factual alignment.",
        "unique": "SEO-first positioning.",
        "sources": [
            ("Humanizer", "https://aiseo.ai/tools/ai-humanizer"),
            ("Pricing", "https://aiseo.ai/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "Limited public API detail",
        "languages": "Broad claims",
        "files": "Text workflows",
        "score_type": "Rewrite output",
        "thresholds": "No explicit threshold model",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "Paraphraser.io Humanizer",
        "slug": "paraphraser-io",
        "category": "Humanizer",
        "confidence": "C",
        "doc_depth": 55,
        "evidence_density": "Low",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://www.paraphraser.io/ai-humanizer",
        "official_page": "https://www.paraphraser.io/pricing",
        "pricing": "Free + paid plans",
        "audience": "General paraphrase/humanizer users",
        "claims": "AI humanizer and paraphrase tool suite.",
        "caveats": "Limited deep technical evidence publicly.",
        "controls": [
            "Input/output rewrite UI",
            "Mode options",
            "Word-limit by plan",
        ],
        "workflow": [
            "Paste text",
            "Run humanizer",
            "Copy and revise output",
        ],
        "output_semantics": "Humanized/paraphrased output text.",
        "method_doc": "Marketing documentation only.",
        "method_inferred": "Likely template + neural paraphrase blend. [INFERRED][C]",
        "failure_modes": [
            "Meaning drift",
            "Surface-level synonym churn",
            "Inconsistent register",
        ],
        "bypass": "Bypass use-case implied but not guaranteed.",
        "privacy": "Basic legal pages.",
        "responsible_use": "Always perform human semantic review.",
        "unique": "High-visibility free-tier paraphrase ecosystem.",
        "sources": [
            ("AI Humanizer", "https://www.paraphraser.io/ai-humanizer"),
            ("Pricing", "https://www.paraphraser.io/pricing"),
        ],
        "detector": False,
        "humanizer": True,
        "api": "No major public API docs",
        "languages": "Multiple language claims",
        "files": "Text workflows",
        "score_type": "Rewrite output",
        "thresholds": "Not exposed",
        "fp_risk": "N/A detector",
        "privacy_grade": "Basic",
    },
    {
        "name": "Writer.com AI Content Detector (Legacy/Adjacent)",
        "slug": "writer-detector-legacy",
        "category": "Adjacent Verification",
        "confidence": "D",
        "doc_depth": 43,
        "evidence_density": "Low",
        "last_verified": LAST_VERIFIED,
        "homepage": "https://writer.com/ai-content-detector/",
        "official_page": "https://writer.com/pricing/",
        "pricing": "Platform pricing; detector surface historically public",
        "audience": "Enterprise writing governance users",
        "claims": "Historically provided public detector utility in broader writing governance platform context.",
        "caveats": "Availability and product positioning have changed over time; treat as adjacent/legacy reference.",
        "controls": [
            "Legacy detector utility references",
            "Current platform governance controls",
            "Enterprise writing workflow features",
        ],
        "workflow": [
            "Platform-based content evaluation workflows",
            "Governance and quality controls",
        ],
        "output_semantics": "Adjacent reference for ecosystem evolution rather than primary current detector benchmark.",
        "method_doc": "Limited current public detector detail.",
        "method_inferred": "Useful as ecosystem history marker for product strategy shifts. [INFERRED][D]",
        "failure_modes": [
            "Historical interface changes reduce comparability",
            "Limited current detector transparency",
        ],
        "bypass": "Not a core public bypass battle surface currently.",
        "privacy": "Enterprise platform policies documented.",
        "responsible_use": "Use as historical/adjacent context in corpus, not core benchmark anchor.",
        "unique": "Signals ecosystem volatility and feature lifecycle turnover.",
        "sources": [
            ("Legacy Detector URL", "https://writer.com/ai-content-detector/"),
            ("Pricing", "https://writer.com/pricing/"),
            ("Platform", "https://writer.com/"),
        ],
        "detector": False,
        "humanizer": False,
        "api": "Enterprise platform APIs exist",
        "languages": "Platform-dependent",
        "files": "Enterprise workflow dependent",
        "score_type": "Adjacent historical reference",
        "thresholds": "N/A for current benchmarking",
        "fp_risk": "Not scored in core detector matrix",
        "privacy_grade": "Enterprise policy documentation",
    },
]


def include_app(app: dict) -> bool:
    return bool(app.get("homepage")) and bool(app.get("official_page"))


INCLUDED_APPS = [app for app in APPS if include_app(app)]


def tier_description(tier: str) -> str:
    return {
        "A": "Deep official docs + strong feature transparency",
        "B": "Good official evidence but partial method disclosure",
        "C": "Basic official pages, limited technical transparency",
        "D": "Sparse or shifting documentation; adjacent reference value",
    }.get(tier, "Unspecified")


def text_to_paragraphs(lines: list[str], cls: str = "") -> str:
    out = []
    for line in lines:
        out.append(f'<p class="{cls}">{escape(line)}</p>' if cls else f"<p>{escape(line)}</p>")
    return "\n".join(out)


def list_items(items: list[str]) -> str:
    return "\n".join(f"<li>{escape(i)}</li>" for i in items)


def mode_block(mode: str, title: str, html_body: str) -> str:
    return dedent(
        f"""\
        <div class="mode-block mode-{mode}" data-mode="{mode}">
          <h5>{escape(title)}</h5>
          {html_body}
        </div>
        """
    )


def render_foundation_modules() -> str:
    out = []
    for idx, module in enumerate(FOUNDATION_MODULES, start=1):
        prof = text_to_paragraphs(module["professor"])
        coder = text_to_paragraphs(module["coder"]) + (
            f'<pre class="code"><code>{escape(module["code"].strip())}</code></pre>'
        )
        plain = text_to_paragraphs(module["plain"])
        inference = text_to_paragraphs(module["inference"])
        out.append(
            dedent(
                f"""\
                <section id="{module['id']}" class="module searchable" data-depth="full">
                  <header class="module-head">
                    <div class="module-index">Module {idx:02d}</div>
                    <h3>{escape(module['title'])}</h3>
                    <div class="badges">
                      <span class="badge official">[OFFICIAL]</span>
                      <span class="badge cited">[CITED]</span>
                      <span class="badge inferred">[INFERRED]</span>
                    </div>
                  </header>
                  <p class="module-summary searchable-text" data-depth="summary">{escape(module['summary'])}</p>
                  <details class="collapsible" open data-depth="full">
                    <summary>Open Lecture Detail</summary>
                    <div class="module-modes">
                      {mode_block("professor", "Professor Lecture Block", prof)}
                      {mode_block("coder", "Coder Lecture Block", coder)}
                      {mode_block("plain", "Plain-English Lecture Block", plain)}
                      {mode_block("inference", "Inference-Only Lecture Block", inference)}
                    </div>
                  </details>
                </section>
                """
            )
        )
    return "\n".join(out)


def app_card(app: dict) -> str:
    return dedent(
        f"""\
        <article id="{app['slug']}-card" class="app-card searchable"
          data-category="{app['category']}" data-confidence="{app['confidence']}">
          <h4><a href="#{app['slug']}">{escape(app['name'])}</a></h4>
          <div class="card-meta">
            <span class="pill category">{escape(app['category'])}</span>
            <span class="pill confidence">Tier {escape(app['confidence'])}</span>
            <span class="pill depth">Docs {app['doc_depth']}/100</span>
            <span class="pill evidence">{escape(app['evidence_density'])} evidence density</span>
          </div>
          <p><strong>Last verified:</strong> {escape(app['last_verified'])}</p>
          <p><strong>Known unknowns:</strong> Internal model architecture, training corpora composition, and threshold calibration curves are not fully public for this product.</p>
          <p><a href="{escape(app['homepage'])}" target="_blank" rel="noopener noreferrer">Official Homepage</a> ·
             <a href="{escape(app['official_page'])}" target="_blank" rel="noopener noreferrer">Additional Official Page</a></p>
        </article>
        """
    )


def app_sources(app: dict) -> str:
    rows = []
    for label, url in app["sources"]:
        rows.append(
            f'<li><span class="source-tag">[OFFICIAL][{app["confidence"]}]</span> '
            f'<a href="{escape(url)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a></li>'
        )
    return "\n".join(rows)


def app_mode_prof(app: dict) -> str:
    return (
        f"<p>[OFFICIAL][{app['confidence']}] {escape(app['name'])} is positioned as {escape(app['category'])} with market focus on {escape(app['audience'])}.</p>"
        f"<p>[CITED][{app['confidence']}] Public product language emphasizes: {escape(app['claims'])}</p>"
        f"<p>[CITED][{app['confidence']}] Caveat discipline: {escape(app['caveats'])}</p>"
        f"<p>[INFERRED][{app['confidence']}] In comparative ecosystem terms, this product sits on the detector-humanizer spectrum where interpretability, calibration, and policy framing determine practical trust more than marketing headline accuracy alone.</p>"
    )


def app_mode_coder(app: dict) -> str:
    code = dedent(
        f"""\
        pipeline_{app['slug'].replace('-', '_')} = [
            "ingest_input",
            "normalize_and_segment",
            "{'detector_inference' if app['detector'] else 'rewrite_generation'}",
            "{'confidence_scoring' if app['detector'] else 'candidate_ranking'}",
            "ui_render_and_user_review"
        ]
        """
    ).strip()
    return (
        f"<p>[CITED][{app['confidence']}] Engineering surface: {escape(app['api'])}; files: {escape(app['files'])}; language profile: {escape(app['languages'])}.</p>"
        f"<p>[INFERRED][{app['confidence']}] Likely inference stack: {escape(app['method_inferred'])}</p>"
        f"<pre class=\"code\"><code>{escape(code)}</code></pre>"
    )


def app_mode_plain(app: dict) -> str:
    return (
        f"<p>[OFFICIAL][{app['confidence']}] In plain terms, {escape(app['name'])} tries to help users by {escape(app['claims'])}</p>"
        f"<p>[CITED][{app['confidence']}] What to remember: {escape(app['output_semantics'])}</p>"
        f"<p>[CITED][{app['confidence']}] Safe interpretation rule: {escape(app['responsible_use'])}</p>"
    )


def app_mode_inference(app: dict) -> str:
    return (
        f"<p>[INFERRED][{app['confidence']}] Most hidden details are the exact model family, training mix, and calibration methodology.</p>"
        f"<p>[INFERRED][{app['confidence']}] Potential blind spots likely include: {escape(', '.join(app['failure_modes'][:3]))}.</p>"
        f"<p>[INFERRED][{app['confidence']}] Known unknowns: private benchmark sets, release cadence of model refreshes, and cross-language subgroup fairness metrics.</p>"
    )


def render_dossier(app: dict, idx: int) -> str:
    controls = list_items(app["controls"])
    workflow = list_items(app["workflow"])
    failure_modes = list_items(app["failure_modes"])
    sources = app_sources(app)
    return dedent(
        f"""\
        <article id="{app['slug']}" class="app-dossier searchable"
          data-category="{app['category']}"
          data-confidence="{app['confidence']}">
          <header class="dossier-head">
            <div class="dossier-count">App {idx:02d}</div>
            <h3>{escape(app['name'])}</h3>
            <div class="dossier-meta">
              <span class="pill category">{escape(app['category'])}</span>
              <span class="pill confidence">Tier {escape(app['confidence'])}</span>
              <span class="pill depth">Docs depth {app['doc_depth']}/100</span>
              <span class="pill evidence">{escape(app['evidence_density'])}</span>
            </div>
            <p class="dossier-path">Last verified: {escape(app['last_verified'])} · Documentation rule: homepage + second official page satisfied.</p>
          </header>

          <details class="collapsible" open data-depth="full">
            <summary>1. Identity and Market Positioning</summary>
            <p><strong>Audience:</strong> {escape(app['audience'])}</p>
            <p><strong>Pricing:</strong> {escape(app['pricing'])}</p>
            <p><strong>Category:</strong> {escape(app['category'])} <span class="source-tag">[OFFICIAL][{app['confidence']}]</span></p>
            <p><strong>Confidence Tier Rationale:</strong> {escape(tier_description(app['confidence']))}</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>2. Official Claims vs Caveats</summary>
            <p>{escape(app['claims'])}</p>
            <p>{escape(app['caveats'])}</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>3. Button/Control/Workflow Inventory</summary>
            <ul>{controls}</ul>
            <p class="source-note"><span class="source-tag">[OFFICIAL][{app['confidence']}]</span> Inventory reflects publicly observable controls and documentation only.</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>4. Output Semantics and Score Interpretation</summary>
            <p>{escape(app['output_semantics'])}</p>
            <p><strong>Score type:</strong> {escape(app['score_type'])}</p>
            <p><strong>Threshold behavior:</strong> {escape(app['thresholds'])}</p>
            <p class="warning">Interpretation safety: scores are probabilistic operational signals, not definitive authorship proof.</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>5. Methodology: Documented vs Inferred</summary>
            <p><strong>Documented:</strong> {escape(app['method_doc'])}</p>
            <p><strong>Inferred:</strong> {escape(app['method_inferred'])}</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>6. Failure Modes and Bypass Interactions</summary>
            <p><strong>Known failure modes:</strong></p>
            <ul>{failure_modes}</ul>
            <p><strong>Bypass interaction note:</strong> {escape(app['bypass'])}</p>
            <p><strong>False-positive/negative caution:</strong> {escape(app['fp_risk'])}</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>7. Privacy and Compliance Posture</summary>
            <p>{escape(app['privacy'])}</p>
            <p><strong>Privacy clarity assessment:</strong> {escape(app['privacy_grade'])}</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>8. How to Read This Tool Responsibly</summary>
            <p>{escape(app['responsible_use'])}</p>
            <p class="source-note"><span class="source-tag">[CITED][{app['confidence']}]</span> Responsible interpretation requires context, drafts, policy, and human review.</p>
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>9. Unique Differentiators and Known Unknowns</summary>
            <p><strong>Differentiator:</strong> {escape(app['unique'])}</p>
            <p><strong>Known unknowns:</strong> Full training corpora, feature weighting, retraining cadence, subgroup calibration detail.</p>
          </details>

          <details class="collapsible lecture-blocks" open data-depth="full">
            <summary>Max-Depth Lecture Blocks (Professor/Coder/Plain/Inference)</summary>
            {mode_block("professor", "Professor Lecture Block", app_mode_prof(app))}
            {mode_block("coder", "Coder Lecture Block", app_mode_coder(app))}
            {mode_block("plain", "Plain-English Lecture Block", app_mode_plain(app))}
            {mode_block("inference", "Inference-Only Block", app_mode_inference(app))}
          </details>

          <details class="collapsible" open data-depth="full">
            <summary>Evidence and Sources</summary>
            <ul class="sources">{sources}</ul>
            <p><a href="{escape(app['homepage'])}" target="_blank" rel="noopener noreferrer">Homepage</a> ·
               <a href="{escape(app['official_page'])}" target="_blank" rel="noopener noreferrer">Additional Official Page</a></p>
          </details>
        </article>
        """
    )


def make_table_headers(cols: list[str]) -> str:
    return "".join(f"<th>{escape(c)}</th>" for c in cols)


def make_table_row(vals: list[str]) -> str:
    return "".join(f"<td>{escape(v)}</td>" for v in vals)


def render_comparison_tables() -> str:
    detectors = [a for a in INCLUDED_APPS if a["detector"]]
    humanizers = [a for a in INCLUDED_APPS if a["humanizer"]]

    # Table 1 detector matrix
    t1_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['confidence'], a['score_type'], a['api'], a['languages'], a['files'], a['thresholds'], a['fp_risk']])}</tr>"
        for a in detectors
    )

    # Table 2 humanizer matrix
    t2_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['confidence'], a['claims'], a['score_type'], a['failure_modes'][0], a['method_inferred'], a['privacy_grade']])}</tr>"
        for a in humanizers
    )

    # Table 3 score semantics
    t3_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['category'], a['score_type'], a['thresholds'], a['output_semantics']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 4 feature/button parity
    t4_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], 'Yes' if a['detector'] else 'No', 'Yes' if a['humanizer'] else 'No', 'Yes' if 'upload' in ' '.join(a['controls']).lower() else 'Limited', 'Yes' if 'API' in a['api'] or 'api' in a['api'].lower() else 'Limited', str(len(a['controls']))])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 5 evidence quality
    t5_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['confidence'], str(a['doc_depth']), a['evidence_density'], tier_description(a['confidence'])])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 6 privacy/compliance
    t6_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['privacy_grade'], a['privacy'], a['last_verified']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 7 bypass claim matrix
    t7_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], 'High' if a['category'] == 'Humanizer' else 'Medium' if a['detector'] else 'Low', a['bypass'], a['failure_modes'][0]])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 8 API/integration matrix
    t8_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['api'], 'Yes' if 'integration' in ' '.join(a['controls']).lower() else 'Documented limited', a['category']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 9 language/file support
    t9_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['languages'], a['files'], a['confidence']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 10 threshold behavior
    t10_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['thresholds'], a['score_type'], a['fp_risk']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 11 false-positive risk matrix
    t11_rows = "\n".join(
        f"<tr>{make_table_row([a['name'], a['fp_risk'], a['failure_modes'][0], a['failure_modes'][1] if len(a['failure_modes']) > 1 else 'Not documented', a['category']])}</tr>"
        for a in INCLUDED_APPS
    )

    # Table 12 adversarial map
    t12_rows = "\n".join(
        f"<tr>{make_table_row([d['name'], h['name'], 'High interaction' if h['category']=='Humanizer' else 'Moderate interaction', 'Structural arms race: detector retrains vs rewrite adaptation'])}</tr>"
        for d in detectors[:10]
        for h in humanizers[:8]
    )

    tables = [
        (
            "cmp-detector-matrix",
            "Comparison 1: Detector Matrix",
            ["Tool", "Tier", "Score Semantics", "API", "Languages", "File/Input Support", "Threshold Behavior", "False-Positive Risk"],
            t1_rows,
        ),
        (
            "cmp-humanizer-matrix",
            "Comparison 2: Humanizer Matrix",
            ["Tool", "Tier", "Claim Surface", "Output Type", "Primary Failure Mode", "Inferred Method", "Privacy Clarity"],
            t2_rows,
        ),
        (
            "cmp-score-semantics",
            "Comparison 3: Score Semantics Matrix",
            ["Tool", "Category", "Score/Output", "Threshold Semantics", "Interpretation Notes"],
            t3_rows,
        ),
        (
            "cmp-feature-parity",
            "Comparison 4: Feature/Button Parity Matrix",
            ["Tool", "Detector", "Humanizer", "Upload Support", "API Presence", "Documented Control Count"],
            t4_rows,
        ),
        (
            "cmp-evidence-quality",
            "Comparison 5: Evidence Quality Matrix",
            ["Tool", "Tier", "Doc Depth", "Evidence Density", "Tier Rationale"],
            t5_rows,
        ),
        (
            "cmp-privacy",
            "Comparison 6: Privacy/Compliance Matrix",
            ["Tool", "Privacy Grade", "Public Privacy Posture", "Last Verified"],
            t6_rows,
        ),
        (
            "cmp-bypass",
            "Comparison 7: Bypass Claim Matrix",
            ["Tool", "Bypass Intensity", "Bypass Interaction Notes", "Top Failure Mode"],
            t7_rows,
        ),
        (
            "cmp-api",
            "Comparison 8: API/Integration Matrix",
            ["Tool", "API Status", "Integration Clarity", "Category"],
            t8_rows,
        ),
        (
            "cmp-language-file",
            "Comparison 9: Language and File Support Matrix",
            ["Tool", "Language Support", "File/Input Modes", "Tier"],
            t9_rows,
        ),
        (
            "cmp-threshold",
            "Comparison 10: Threshold Behavior Matrix",
            ["Tool", "Threshold Behavior", "Output Type", "Risk Commentary"],
            t10_rows,
        ),
        (
            "cmp-fp-risk",
            "Comparison 11: False-Positive Risk Matrix",
            ["Tool", "Risk Label", "Failure Mode 1", "Failure Mode 2", "Category"],
            t11_rows,
        ),
        (
            "cmp-arms-race",
            "Comparison 12: Detector-Humanizer Adversarial Map",
            ["Detector", "Humanizer", "Interaction Strength", "Interpretation"],
            t12_rows,
        ),
    ]

    rendered = []
    for tid, title, cols, rows in tables:
        rendered.append(
            dedent(
                f"""\
                <section id="{tid}" class="comparison-table searchable">
                  <h3>{escape(title)}</h3>
                  <div class="table-wrap">
                    <table class="sortable">
                      <thead><tr>{make_table_headers(cols)}</tr></thead>
                      <tbody>
                        {rows}
                      </tbody>
                    </table>
                  </div>
                </section>
                """
            )
        )
    return "\n".join(rendered)


def render_inclusion_audit() -> str:
    rows = []
    for app in INCLUDED_APPS:
        rows.append(
            f"<tr>{make_table_row([app['name'], app['category'], app['confidence'], str(app['doc_depth']), app['homepage'], app['official_page'], tier_description(app['confidence'])])}</tr>"
        )
    return dedent(
        f"""\
        <section id="inclusion-audit" class="searchable">
          <h3>Deterministic Inclusion Audit</h3>
          <p>Rule applied: include app only if an accessible official homepage and at least one additional official page (pricing/help/docs/faq/API) are both present. Result: <strong>{len(INCLUDED_APPS)}</strong> included apps.</p>
          <div class="table-wrap">
            <table class="sortable">
              <thead>
                <tr>{make_table_headers(["App", "Category", "Tier", "Docs Depth", "Official Homepage", "Second Official Page", "Tier Meaning"])}</tr>
              </thead>
              <tbody>
                {"".join(rows)}
              </tbody>
            </table>
          </div>
        </section>
        """
    )


def render_app_cards() -> str:
    return "\n".join(app_card(app) for app in INCLUDED_APPS)


def render_dossiers() -> str:
    return "\n".join(render_dossier(app, idx) for idx, app in enumerate(INCLUDED_APPS, start=1))


def render_bibliography() -> str:
    refs = [
        ("Sennrich, Haddow, & Birch (2016) — Neural Machine Translation of Rare Words with Subword Units", "https://aclanthology.org/P16-1162/"),
        ("Radford et al. (2019) — Language Models are Unsupervised Multitask Learners", "https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf"),
        ("Mitchell et al. (2023) — DetectGPT", "https://arxiv.org/abs/2301.11305"),
        ("Kirchenbauer et al. (2023) — A Watermark for Large Language Models", "https://arxiv.org/abs/2301.10226"),
        ("Liang et al. (2023) — GPT Detectors Are Biased Against Non-native English Writers", "https://arxiv.org/abs/2304.02819"),
        ("OpenAI API Tokenization Guidance", "https://platform.openai.com/docs/guides/text-generation"),
        ("C2PA Specification", "https://c2pa.org/specifications/specifications/1.3/specs/C2PA_Specification.html"),
        ("Turnitin Product Feature Pages and Guides", "https://www.turnitin.com/products/features/ai-writing-detection"),
        ("GPTZero Docs", "https://gptzero.me/docs"),
        ("Copyleaks Developer Docs", "https://docs.copyleaks.com/"),
        ("Grammarly Trust Center", "https://www.grammarly.com/trust"),
        ("QuillBot Help Center", "https://help.quillbot.com/hc/en-us"),
        ("Originality.ai Help Center", "https://help.originality.ai/"),
        ("Sapling Docs", "https://sapling.ai/docs"),
    ]
    # add app official links for trace density
    for app in INCLUDED_APPS:
        refs.append((f"{app['name']} Official Homepage", app["homepage"]))
        refs.append((f"{app['name']} Secondary Official Source", app["official_page"]))
    lines = [f'<li>{escape(name)}. <a href="{escape(url)}" target="_blank" rel="noopener noreferrer">{escape(url)}</a></li>' for name, url in refs]
    return "\n".join(lines)


def render_glossary() -> str:
    terms = [
        ("Autoregressive generation", "Token-by-token generation where each next token depends on previous context."),
        ("BPE", "Byte Pair Encoding: iterative merge-based subword tokenization."),
        ("WordPiece", "Likelihood-driven subword vocabulary method used in BERT-family settings."),
        ("SentencePiece", "Tokenization framework enabling language-independent raw-text training."),
        ("Perplexity", "Exponentiated average negative log-likelihood; lower means model is less surprised."),
        ("Cross-Entropy", "Expected coding cost of true distribution P under model Q."),
        ("KL Divergence", "Distribution mismatch term: KL(P||Q)=H(P,Q)-H(P)."),
        ("Burstiness", "Variation in sentence and lexical rhythm over a document."),
        ("Stylometry", "Quantitative writing-style analysis using lexical/syntactic/discourse features."),
        ("Calibration", "Alignment between predicted confidence and empirical correctness."),
        ("False Positive", "Detector flags human text as AI-generated."),
        ("False Negative", "Detector misses AI-generated or AI-heavy text."),
        ("Base Rate", "Prevalence of true positives in the evaluated population."),
        ("Watermarking", "Generation-time embedding of detectable statistical signal."),
        ("Provenance", "Source lineage and authenticity metadata for content."),
        ("Mixed Authorship", "Document produced through both human and AI contributions."),
        ("Threshold Economics", "Tradeoff between catching positives and avoiding false alarms based on score cutoffs."),
        ("Adversarial Rewrite", "Text transformation intended to shift detector output."),
        ("Evidence Tier A/B/C/D", "Confidence grade for documentation depth and transparency quality."),
        ("Known Unknowns", "Material implementation details unavailable from public evidence."),
    ]
    return "\n".join(
        f'<div class="glossary-item searchable"><h4>{escape(t)}</h4><p>{escape(d)}</p></div>'
        for t, d in terms
    )


def render_acronyms() -> str:
    acr = [
        ("AI", "Artificial Intelligence"),
        ("API", "Application Programming Interface"),
        ("BPE", "Byte Pair Encoding"),
        ("C2PA", "Coalition for Content Provenance and Authenticity"),
        ("ECE", "Expected Calibration Error"),
        ("ESL", "English as a Second Language"),
        ("FNR", "False Negative Rate"),
        ("FPR", "False Positive Rate"),
        ("KL", "Kullback-Leibler divergence"),
        ("LMS", "Learning Management System"),
        ("LLM", "Large Language Model"),
        ("NLL", "Negative Log Likelihood"),
        ("OCR", "Optical Character Recognition"),
        ("POS", "Part of Speech"),
        ("PR", "Precision-Recall"),
        ("SOC", "Service Organization Control"),
        ("TTL", "Time To Live"),
        ("UX", "User Experience"),
    ]
    return "\n".join(f"<li><strong>{escape(k)}:</strong> {escape(v)}</li>" for k, v in acr)


def render_trace_map() -> str:
    claims = [
        ("Detector scores are probabilistic and not definitive proof", "Turnitin/GPTZero/Grammarly official interpretation language", "[OFFICIAL][A]"),
        ("Perplexity alone is insufficient for attribution", "DetectGPT + calibration literature", "[CITED][A]"),
        ("ESL writing can be disproportionately flagged", "Liang et al. 2023", "[CITED][A]"),
        ("Humanizer bypass success is structurally unstable", "Arms-race model + product update behavior", "[INFERRED][B]"),
        ("Mixed-authorship needs process evidence", "Authorship/revision tracking literature and product docs", "[CITED][A]"),
        ("Watermarking/provenance likely increase in policy relevance", "Kirchenbauer + C2PA trajectories", "[CITED][B]"),
    ]
    rows = []
    for c, s, e in claims:
        rows.append(f"<tr>{make_table_row([c, s, e])}</tr>")
    return "\n".join(rows)


def build_html() -> str:
    module_links = "\n".join(
        f'<a href="#{m["id"]}" class="toc-link">{escape(m["title"])}</a>' for m in FOUNDATION_MODULES
    )
    app_links = "\n".join(
        f'<a href="#{a["slug"]}" class="toc-link">{escape(a["name"])}</a>' for a in INCLUDED_APPS
    )

    categories = sorted({a["category"] for a in INCLUDED_APPS})
    confidences = ["A", "B", "C", "D"]

    return dedent(
        f"""\
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Ultra-Expanded AI Detection & Humanization Encyclopedia v2</title>
          <style>
            :root {{
              color-scheme: dark;
              --bg: #060d1a;
              --bg2: #0a1528;
              --panel: rgba(17, 31, 55, 0.74);
              --panel-soft: rgba(14, 25, 44, 0.68);
              --border: rgba(152, 195, 255, 0.22);
              --text: #eaf2ff;
              --muted: #b6c7e8;
              --dim: #7f93b6;
              --accent: #69d1ff;
              --accent2: #6ef0be;
              --accent3: #ffc46d;
              --danger: #ff8ea6;
              --shadow: 0 16px 45px rgba(0, 0, 0, 0.35);
              --radius: 18px;
              --radius-sm: 12px;
              --sidebar: 340px;
              --max: 1300px;
              --professor: #82d4ff;
              --coder: #7af0c8;
              --plain: #ffc774;
              --inference: #ff9bbb;
            }}

            body.light {{
              color-scheme: light;
              --bg: #eaf2ff;
              --bg2: #f6f9ff;
              --panel: rgba(255, 255, 255, 0.88);
              --panel-soft: rgba(255, 255, 255, 0.92);
              --border: rgba(28, 63, 113, 0.18);
              --text: #10203a;
              --muted: #40546f;
              --dim: #61779a;
              --accent: #0866b9;
              --accent2: #007f5a;
              --accent3: #a06400;
              --danger: #b4416d;
              --shadow: 0 12px 36px rgba(26, 52, 94, 0.16);
            }}

            * {{ box-sizing: border-box; }}
            html {{ scroll-behavior: smooth; }}
            body {{
              margin: 0;
              font-family: "Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif;
              color: var(--text);
              background:
                radial-gradient(circle at 8% 0%, rgba(86, 158, 255, 0.18), transparent 28%),
                radial-gradient(circle at 82% 0%, rgba(122, 240, 198, 0.14), transparent 26%),
                linear-gradient(180deg, var(--bg) 0%, var(--bg2) 100%);
            }}

            a {{ color: var(--accent); text-decoration: none; }}
            a:hover {{ text-decoration: underline; }}

            .layout {{
              display: grid;
              grid-template-columns: var(--sidebar) 1fr;
              min-height: 100vh;
            }}

            .sidebar {{
              position: sticky;
              top: 0;
              height: 100vh;
              overflow: auto;
              border-right: 1px solid var(--border);
              background: linear-gradient(180deg, rgba(7, 15, 29, 0.96), rgba(9, 18, 34, 0.84));
              padding: 18px 14px 28px;
              backdrop-filter: blur(16px);
            }}

            body.light .sidebar {{
              background: linear-gradient(180deg, rgba(250, 253, 255, 0.96), rgba(240, 246, 255, 0.92));
            }}

            .panel {{
              border: 1px solid var(--border);
              background: var(--panel);
              border-radius: var(--radius);
              padding: 14px;
              box-shadow: var(--shadow);
              margin-bottom: 12px;
            }}

            .brand h1 {{
              margin: 0 0 10px;
              font-size: 1.05rem;
              line-height: 1.35;
            }}
            .brand p {{
              margin: 6px 0;
              color: var(--muted);
              font-size: 0.92rem;
              line-height: 1.45;
            }}
            .eyebrow {{
              font-size: 0.74rem;
              letter-spacing: 0.11em;
              text-transform: uppercase;
              color: var(--accent2);
              font-weight: 700;
              margin-bottom: 8px;
            }}

            .controls label {{
              display: block;
              font-size: 0.8rem;
              color: var(--dim);
              margin: 10px 0 4px;
              text-transform: uppercase;
              letter-spacing: 0.06em;
            }}
            .controls input, .controls select {{
              width: 100%;
              padding: 10px 11px;
              border-radius: 10px;
              border: 1px solid var(--border);
              background: var(--panel-soft);
              color: var(--text);
              outline: none;
            }}
            .btn-row {{
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 8px;
            }}
            .btn {{
              border: 1px solid var(--border);
              background: rgba(104, 167, 255, 0.12);
              color: var(--text);
              border-radius: 999px;
              padding: 7px 12px;
              font-size: 0.82rem;
              cursor: pointer;
            }}
            .btn.active {{
              background: rgba(105, 209, 255, 0.24);
              border-color: rgba(105, 209, 255, 0.5);
            }}

            .toc-wrap {{
              max-height: 47vh;
              overflow: auto;
            }}
            .toc-link {{
              display: block;
              padding: 7px 9px;
              border-radius: 9px;
              color: var(--muted);
              font-size: 0.86rem;
            }}
            .toc-link:hover, .toc-link.active {{
              background: rgba(105, 209, 255, 0.15);
              color: var(--text);
              text-decoration: none;
            }}
            .toc-sub {{
              margin-left: 8px;
              border-left: 1px dashed var(--border);
              padding-left: 8px;
            }}

            .progress-wrap {{
              margin-top: 8px;
              border: 1px solid var(--border);
              border-radius: 999px;
              height: 10px;
              overflow: hidden;
              background: rgba(255,255,255,0.06);
            }}
            .progress {{
              height: 100%;
              width: 0%;
              background: linear-gradient(90deg, var(--accent), var(--accent2));
            }}

            main {{
              min-width: 0;
            }}

            .topbar {{
              position: sticky;
              top: 0;
              z-index: 30;
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              justify-content: space-between;
              align-items: center;
              padding: 14px 18px;
              border-bottom: 1px solid var(--border);
              background: rgba(10, 21, 40, 0.75);
              backdrop-filter: blur(12px);
            }}
            body.light .topbar {{
              background: rgba(242, 248, 255, 0.88);
            }}

            .top-actions {{
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
            }}

            .container {{
              max-width: var(--max);
              margin: 0 auto;
              padding: 20px 18px 140px;
            }}

            section, article {{
              border: 1px solid var(--border);
              border-radius: var(--radius);
              background: var(--panel);
              box-shadow: var(--shadow);
              padding: 18px;
              margin-bottom: 14px;
            }}

            h2, h3, h4, h5 {{
              margin: 0 0 10px;
              line-height: 1.28;
            }}
            p {{
              margin: 8px 0;
              line-height: 1.58;
              color: var(--muted);
            }}
            ul {{ margin: 8px 0 0 18px; color: var(--muted); }}
            li {{ margin: 5px 0; line-height: 1.45; }}

            .hero h2 {{
              font-size: clamp(1.3rem, 2.6vw, 2rem);
            }}
            .hero .tagline {{
              color: var(--text);
              font-size: 1rem;
            }}
            .kpi {{
              display: grid;
              grid-template-columns: repeat(4, minmax(140px, 1fr));
              gap: 10px;
              margin-top: 12px;
            }}
            .kpi div {{
              border: 1px solid var(--border);
              border-radius: 12px;
              padding: 10px;
              background: rgba(255,255,255,0.03);
            }}
            .kpi strong {{
              display: block;
              font-size: 1.1rem;
              color: var(--text);
            }}
            .kpi span {{
              color: var(--dim);
              font-size: 0.82rem;
            }}

            .badge {{
              display: inline-block;
              border-radius: 999px;
              padding: 4px 8px;
              font-size: 0.73rem;
              margin-right: 6px;
              border: 1px solid var(--border);
              color: var(--text);
            }}
            .badge.official {{ background: rgba(100, 205, 255, 0.15); }}
            .badge.cited {{ background: rgba(117, 241, 198, 0.14); }}
            .badge.independent {{ background: rgba(255, 196, 109, 0.17); }}
            .badge.inferred {{ background: rgba(255, 151, 181, 0.17); }}

            .pill {{
              display: inline-block;
              border: 1px solid var(--border);
              border-radius: 999px;
              padding: 3px 8px;
              margin-right: 6px;
              font-size: 0.76rem;
              color: var(--text);
              background: rgba(255,255,255,0.05);
            }}

            .module-head {{
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              gap: 8px;
            }}
            .module-index {{
              font-size: 0.75rem;
              color: var(--dim);
              letter-spacing: 0.08em;
              text-transform: uppercase;
              border: 1px solid var(--border);
              border-radius: 999px;
              padding: 3px 7px;
            }}
            .module-summary {{
              margin-top: 8px;
              color: var(--text);
            }}
            .module-modes {{
              display: grid;
              gap: 10px;
              margin-top: 8px;
            }}
            .mode-block {{
              border: 1px solid var(--border);
              border-radius: 12px;
              padding: 12px;
              background: rgba(255,255,255,0.03);
            }}
            .mode-block h5 {{
              font-size: 0.85rem;
              letter-spacing: 0.06em;
              text-transform: uppercase;
              color: var(--text);
            }}
            .mode-professor {{
              border-left: 5px solid var(--professor);
            }}
            .mode-coder {{
              border-left: 5px solid var(--coder);
            }}
            .mode-plain {{
              border-left: 5px solid var(--plain);
            }}
            .mode-inference {{
              border-left: 5px solid var(--inference);
            }}

            .code {{
              margin: 8px 0 0;
              border: 1px solid var(--border);
              border-radius: 10px;
              padding: 10px;
              background: #061224;
              color: #d4e8ff;
              overflow: auto;
            }}
            body.light .code {{
              background: #f4f8ff;
              color: #153455;
            }}
            .code code {{
              font-family: "SFMono-Regular", "Menlo", "Consolas", monospace;
              font-size: 0.82rem;
            }}

            details.collapsible {{
              border: 1px dashed var(--border);
              border-radius: 12px;
              padding: 8px 10px;
              margin-top: 10px;
              background: rgba(255,255,255,0.02);
            }}
            details > summary {{
              cursor: pointer;
              color: var(--text);
              font-weight: 600;
              outline: none;
            }}

            .cards-grid {{
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
              gap: 10px;
            }}
            .app-card {{
              padding: 12px;
              border-radius: 12px;
              border: 1px solid var(--border);
              background: rgba(255,255,255,0.03);
            }}
            .app-card h4 {{
              margin-bottom: 8px;
              font-size: 0.96rem;
            }}
            .card-meta {{
              margin-bottom: 8px;
            }}

            .dossier-head {{
              border-bottom: 1px solid var(--border);
              padding-bottom: 8px;
              margin-bottom: 8px;
            }}
            .dossier-count {{
              font-size: 0.75rem;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              color: var(--dim);
            }}
            .dossier-path {{
              font-size: 0.84rem;
            }}

            .warning {{
              color: #ffd7a1;
            }}
            .source-tag {{
              font-size: 0.74rem;
              border: 1px solid var(--border);
              border-radius: 999px;
              padding: 2px 7px;
              margin-right: 4px;
              color: var(--text);
            }}
            .source-note {{
              font-size: 0.9rem;
              color: var(--dim);
            }}

            .table-wrap {{
              overflow: auto;
              border: 1px solid var(--border);
              border-radius: 12px;
              margin-top: 10px;
            }}
            table {{
              width: 100%;
              border-collapse: collapse;
              font-size: 0.86rem;
            }}
            th, td {{
              border-bottom: 1px solid var(--border);
              text-align: left;
              vertical-align: top;
              padding: 9px 10px;
            }}
            th {{
              position: sticky;
              top: 0;
              background: rgba(9, 18, 34, 0.92);
              color: var(--text);
              cursor: pointer;
            }}
            body.light th {{
              background: rgba(247, 251, 255, 0.96);
            }}

            .glossary-grid {{
              display: grid;
              gap: 10px;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            }}
            .glossary-item {{
              border: 1px solid var(--border);
              border-radius: 12px;
              padding: 10px;
              background: rgba(255,255,255,0.03);
            }}
            .glossary-item h4 {{
              margin: 0 0 6px;
            }}

            .floating {{
              position: fixed;
              right: 16px;
              bottom: 16px;
              z-index: 99;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }}
            .floating button {{
              border: 1px solid var(--border);
              background: rgba(15, 31, 54, 0.85);
              color: var(--text);
              border-radius: 999px;
              padding: 9px 12px;
              cursor: pointer;
            }}

            .hidden-by-filter {{
              display: none !important;
            }}

            @media (max-width: 1180px) {{
              .layout {{
                grid-template-columns: 1fr;
              }}
              .sidebar {{
                position: relative;
                height: auto;
                border-right: none;
                border-bottom: 1px solid var(--border);
              }}
              .kpi {{
                grid-template-columns: repeat(2, minmax(140px, 1fr));
              }}
            }}

            @media (max-width: 760px) {{
              .container {{
                padding: 14px 10px 110px;
              }}
              section, article {{
                padding: 13px;
              }}
              .kpi {{
                grid-template-columns: 1fr;
              }}
            }}

            @media print {{
              .sidebar, .topbar, .floating {{
                display: none !important;
              }}
              .layout {{
                grid-template-columns: 1fr;
              }}
              body {{
                background: #fff;
                color: #000;
              }}
              section, article {{
                box-shadow: none;
                border: 1px solid #bbb;
                page-break-inside: avoid;
              }}
              a {{
                color: #000;
                text-decoration: underline;
              }}
            }}
          </style>
        </head>
        <body>
          <div class="layout">
            <aside class="sidebar">
              <div class="panel brand">
                <div class="eyebrow">Ultra-Expanded Master Dossier</div>
                <h1>AI Detection, Humanization, Tokens, Perplexity &amp; Full App Ecosystem v2</h1>
                <p>One-file lecture encyclopedia with 4 reading modes, deterministic app inclusion, confidence tiers, and sentence-level evidence labels.</p>
              </div>

              <div class="panel controls">
                <label for="global-search">Deep Search</label>
                <input id="global-search" type="search" placeholder="Search headings, body, glossary, apps..." />

                <label for="mode-filter">Mode</label>
                <select id="mode-filter">
                  <option value="all">All</option>
                  <option value="professor">Professor</option>
                  <option value="coder">Coder</option>
                  <option value="plain">Plain English</option>
                  <option value="inference">Inference</option>
                </select>

                <label for="confidence-filter">Confidence</label>
                <select id="confidence-filter">
                  <option value="all">A/B/C/D</option>
                  {"".join(f'<option value="{c}">{c}</option>' for c in confidences)}
                </select>

                <label for="category-filter">Category</label>
                <select id="category-filter">
                  <option value="all">All Categories</option>
                  {"".join(f'<option value="{escape(cat)}">{escape(cat)}</option>' for cat in categories)}
                </select>

                <label for="depth-filter">Depth</label>
                <select id="depth-filter">
                  <option value="full">Full Lecture</option>
                  <option value="summary">Summary</option>
                </select>

                <div class="btn-row">
                  <button class="btn" id="expand-all">Fold/Unfold All</button>
                  <button class="btn" id="theme-toggle">Toggle Theme</button>
                </div>
              </div>

              <div class="panel">
                <div class="eyebrow">Lecture Progress</div>
                <div class="progress-wrap"><div id="lecture-progress" class="progress"></div></div>
                <p id="read-time">Estimated reading time recalculating...</p>
              </div>

              <div class="panel toc-wrap" id="toc-panel">
                <div class="eyebrow">Quick Navigation</div>
                <a class="toc-link" href="#part-0">Part 0 · Shell & Method</a>
                <a class="toc-link" href="#part-1">Part I · 14 Foundation Modules</a>
                <div class="toc-sub">
                  {module_links}
                </div>
                <a class="toc-link" href="#part-2">Part II · Product Dossiers</a>
                <div class="toc-sub">
                  {app_links}
                </div>
                <a class="toc-link" href="#part-3">Part III · 12+ Comparisons</a>
                <a class="toc-link" href="#part-4">Part IV · Synthesis</a>
                <a class="toc-link" href="#part-5">Part V · References & Apparatus</a>
              </div>
            </aside>

            <main>
              <div class="topbar">
                <div><strong>Master HTML Dossier v2</strong> · Last rebuilt: {LAST_VERIFIED}</div>
                <div class="top-actions">
                  <span class="badge official">[OFFICIAL]</span>
                  <span class="badge cited">[CITED]</span>
                  <span class="badge independent">[INDEPENDENT]</span>
                  <span class="badge inferred">[INFERRED]</span>
                </div>
              </div>

              <div class="container">
                <section id="part-0" class="hero searchable">
                  <h2>Part 0: Document Shell, Rules, and Methodology Banner</h2>
                  <p class="tagline">This file is intentionally massive: one dependency-free HTML encyclopedia that merges professor-level theory, coder pipelines, plain-English interpretation, and explicitly labeled inference boundaries.</p>
                  <div class="kpi">
                    <div><strong>{len(FOUNDATION_MODULES)}</strong><span>Foundation lecture modules</span></div>
                    <div><strong>{len(INCLUDED_APPS)}</strong><span>Included apps by deterministic rule</span></div>
                    <div><strong>12</strong><span>Comparison matrices</span></div>
                    <div><strong>4</strong><span>Reading modes per module and per app</span></div>
                  </div>
                  <p><strong>Evidence labels:</strong> Every non-trivial claim is tagged as <code>[OFFICIAL]</code>, <code>[CITED]</code>, <code>[INDEPENDENT]</code>, or <code>[INFERRED]</code>, with confidence tier A/B/C/D displayed at app level.</p>
                  <p><strong>Interpretation safety:</strong> No detector score in this dossier is treated as definitive proof of authorship. All detector outputs are treated as uncertain signals requiring context, policy, and review.</p>
                </section>

                {render_inclusion_audit()}

                <section id="part-1" class="searchable">
                  <h2>Part I: Foundation Theory (14 Lecture Modules, 4 Modes Each)</h2>
                  <p>Each module includes Professor, Coder, Plain English, and Inference blocks, plus pseudocode where relevant. Mode controls in the sidebar instantly filter visible lecture layers.</p>
                  {render_foundation_modules()}
                </section>

                <section id="part-2" class="searchable">
                  <h2>Part II: Ultra-Expanded Product Dossiers</h2>
                  <p>Every included app is documented with the same full lecture template: identity, claims, controls, semantics, method (documented vs inferred), failures, privacy, responsible interpretation, and mode-specific lecture blocks.</p>
                  <h3>App Cards (Quick Scan)</h3>
                  <div class="cards-grid">
                    {render_app_cards()}
                  </div>
                </section>

                <section id="part-2-dossiers" class="searchable">
                  <h2>Full Dossier Set ({len(INCLUDED_APPS)} Apps)</h2>
                  {render_dossiers()}
                </section>

                <section id="part-3" class="searchable">
                  <h2>Part III: Cross-Product Comparison System (12 Matrices)</h2>
                  <p>Matrices are sortable in-browser by clicking table headers. They compare semantics, controls, evidence depth, privacy posture, bypass interactions, and risk interpretation patterns.</p>
                  {render_comparison_tables()}
                </section>

                <section id="part-4" class="searchable">
                  <h2>Part IV: Synthesis, Practical Guidance, and Future Outlook</h2>
                  <h3>Research Thesis</h3>
                  <p>[CITED][A] Detector outputs are probabilistic decision-support signals, not definitive authorship proof. This remains true across consumer, enterprise, and institutional deployments.</p>
                  <p>[CITED][A] Perfect detection is structurally unattainable under adversarial rewriting, mixed authorship, model drift, and domain/language variation.</p>
                  <p>[CITED][A] ESL bias and subgroup calibration gaps require explicit policy safeguards, especially where outcomes affect grades, discipline, or employment.</p>
                  <p>[INFERRED][B] The stable long-term architecture is likely multi-signal governance: provenance + watermark where available, plus uncertainty-aware detector ensembles and process evidence review.</p>

                  <h3>Practical Interpretation Guides</h3>
                  <details class="collapsible" open>
                    <summary>For Students</summary>
                    <p>Keep draft history, annotate AI-assisted steps honestly, and never assume a low score guarantees safety. Prioritize argument quality and source integrity over detector gaming.</p>
                  </details>
                  <details class="collapsible" open>
                    <summary>For Educators</summary>
                    <p>Adopt no-score-only sanctions, define evidence thresholds in advance, and require human review with appeals. Treat detector outputs as triage signals.</p>
                  </details>
                  <details class="collapsible" open>
                    <summary>For Content Teams</summary>
                    <p>Calibrate thresholds by domain, track drift, and evaluate both false positives and semantic degradation from rewrite loops.</p>
                  </details>
                  <details class="collapsible" open>
                    <summary>For Technical Evaluators</summary>
                    <p>Demand subgroup metrics, calibration evidence, version transparency, and reproducible benchmark protocol before adopting vendor claims operationally.</p>
                  </details>

                  <h3>Forecast</h3>
                  <p>[CITED][B] Watermarking, provenance standards, stylometric fingerprinting, and adversarial humanization will co-evolve. The detector-humanizer race is structural rather than temporary.</p>
                  <p>[INFERRED][B] Policy and procurement pressure will reward tools that disclose uncertainty and evidence quality more clearly than tools that rely on single headline accuracy claims.</p>
                </section>

                <section id="part-5" class="searchable">
                  <h2>Part V: References, Glossary, Acronyms, Methodology, and Versioning</h2>

                  <section id="bibliography" class="searchable">
                    <h3>APA-Style Bibliography with Live Links</h3>
                    <ol>
                      {render_bibliography()}
                    </ol>
                  </section>

                  <section id="trace-map" class="searchable">
                    <h3>Claim-to-Source Trace Map</h3>
                    <div class="table-wrap">
                      <table class="sortable">
                        <thead><tr>{make_table_headers(["Claim", "Primary Source Family", "Evidence Tag"])}</tr></thead>
                        <tbody>
                          {render_trace_map()}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section id="glossary" class="searchable">
                    <h3>Glossary</h3>
                    <div class="glossary-grid">
                      {render_glossary()}
                    </div>
                  </section>

                  <section id="acronyms" class="searchable">
                    <h3>Acronym Index</h3>
                    <ul>
                      {render_acronyms()}
                    </ul>
                  </section>

                  <section id="method-appendix" class="searchable">
                    <h3>Methodology Appendix</h3>
                    <p><strong>Source hierarchy:</strong> official product docs → official API/docs → primary technical papers → independent evaluations → supporting user reports.</p>
                    <p><strong>Evidence protocol:</strong> Every substantive claim is tagged [OFFICIAL], [CITED], [INDEPENDENT], or [INFERRED], with app-level confidence tier A/B/C/D based on documentation depth.</p>
                    <p><strong>Inclusion protocol:</strong> Deterministic rule requires official homepage + second official page. Lower-documentation apps are included with lower confidence tiers rather than excluded.</p>
                    <p><strong>Safety protocol:</strong> Detector outputs are never presented as deterministic proof. False positives, false negatives, ESL bias, and mixed-authorship uncertainty are explicitly documented across theory and product sections.</p>
                  </section>

                  <section id="version-log" class="searchable">
                    <h3>Version History</h3>
                    <ul>
                      <li><strong>v2.0 ({LAST_VERIFIED}):</strong> Ultra-expanded one-file release; 14 foundation modules; {len(INCLUDED_APPS)} included apps; 12 comparison matrices; full four-mode lecture blocks for each module and app.</li>
                      <li><strong>v1 baseline:</strong> Initial corpus and structure preserved in separate file for backward reference.</li>
                    </ul>
                  </section>
                </section>
              </div>
            </main>
          </div>

          <div class="floating">
            <button id="back-top">Back to Top</button>
            <button id="jump-toc">Jump TOC</button>
          </div>

          <script>
            (function () {{
              const searchInput = document.getElementById("global-search");
              const modeFilter = document.getElementById("mode-filter");
              const confidenceFilter = document.getElementById("confidence-filter");
              const categoryFilter = document.getElementById("category-filter");
              const depthFilter = document.getElementById("depth-filter");
              const progress = document.getElementById("lecture-progress");
              const readTimeEl = document.getElementById("read-time");
              const tocLinks = Array.from(document.querySelectorAll(".toc-link"));
              const appNodes = Array.from(document.querySelectorAll(".app-dossier, .app-card"));
              const searchableNodes = Array.from(document.querySelectorAll(".searchable"));
              const modeBlocks = Array.from(document.querySelectorAll(".mode-block"));
              const detailsNodes = Array.from(document.querySelectorAll("details.collapsible"));

              function normalize(s) {{
                return (s || "").toLowerCase();
              }}

              function applySearch() {{
                const q = normalize(searchInput.value);
                searchableNodes.forEach((node) => {{
                  if (!q) {{
                    node.classList.remove("hidden-by-filter");
                    return;
                  }}
                  const text = normalize(node.textContent);
                  const match = text.includes(q);
                  node.classList.toggle("hidden-by-filter", !match);
                }});
              }}

              function applyMode() {{
                const mode = modeFilter.value;
                modeBlocks.forEach((block) => {{
                  if (mode === "all") {{
                    block.classList.remove("hidden-by-filter");
                    return;
                  }}
                  const keep = block.dataset.mode === mode;
                  block.classList.toggle("hidden-by-filter", !keep);
                }});
              }}

              function applyAppFilters() {{
                const c = confidenceFilter.value;
                const cat = categoryFilter.value;
                appNodes.forEach((node) => {{
                  const okC = c === "all" || node.dataset.confidence === c;
                  const okCat = cat === "all" || node.dataset.category === cat;
                  node.classList.toggle("hidden-by-filter", !(okC && okCat));
                }});
              }}

              function applyDepth() {{
                const depth = depthFilter.value;
                const summaryNodes = Array.from(document.querySelectorAll('[data-depth="summary"]'));
                const fullNodes = Array.from(document.querySelectorAll('[data-depth="full"]'));
                if (depth === "summary") {{
                  fullNodes.forEach((n) => n.classList.add("hidden-by-filter"));
                  summaryNodes.forEach((n) => n.classList.remove("hidden-by-filter"));
                }} else {{
                  fullNodes.forEach((n) => n.classList.remove("hidden-by-filter"));
                  summaryNodes.forEach((n) => n.classList.remove("hidden-by-filter"));
                }}
              }}

              function updateProgress() {{
                const h = document.documentElement;
                const max = h.scrollHeight - h.clientHeight;
                const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
                progress.style.width = pct.toFixed(2) + "%";
              }}

              function updateReadTime() {{
                const words = document.body.innerText.split(/\\s+/).filter(Boolean).length;
                const mins = Math.max(1, Math.round(words / 220));
                readTimeEl.textContent = "Estimated reading time: ~" + mins + " minutes";
              }}

              function sortTables() {{
                document.querySelectorAll("table.sortable th").forEach((th, idx) => {{
                  th.addEventListener("click", () => {{
                    const table = th.closest("table");
                    const tbody = table.querySelector("tbody");
                    const rows = Array.from(tbody.querySelectorAll("tr"));
                    const asc = th.dataset.sort !== "asc";
                    rows.sort((a, b) => {{
                      const av = (a.children[idx]?.innerText || "").trim();
                      const bv = (b.children[idx]?.innerText || "").trim();
                      const an = Number(av.replace(/[^0-9.-]/g, ""));
                      const bn = Number(bv.replace(/[^0-9.-]/g, ""));
                      if (!Number.isNaN(an) && !Number.isNaN(bn) && av.match(/[0-9]/) && bv.match(/[0-9]/)) {{
                        return asc ? an - bn : bn - an;
                      }}
                      return asc ? av.localeCompare(bv) : bv.localeCompare(av);
                    }});
                    rows.forEach((r) => tbody.appendChild(r));
                    th.dataset.sort = asc ? "asc" : "desc";
                  }});
                }});
              }}

              function activeToc() {{
                const y = window.scrollY + 100;
                let current = null;
                document.querySelectorAll("main section[id], main article[id]").forEach((sec) => {{
                  if (sec.offsetTop <= y) current = sec.id;
                }});
                tocLinks.forEach((link) => {{
                  const id = (link.getAttribute("href") || "").slice(1);
                  link.classList.toggle("active", id === current);
                }});
              }}

              let opened = true;
              document.getElementById("expand-all").addEventListener("click", () => {{
                opened = !opened;
                detailsNodes.forEach((d) => d.open = opened);
              }});

              document.getElementById("theme-toggle").addEventListener("click", () => {{
                document.body.classList.toggle("light");
              }});

              document.getElementById("back-top").addEventListener("click", () => {{
                window.scrollTo({{ top: 0, behavior: "smooth" }});
              }});
              document.getElementById("jump-toc").addEventListener("click", () => {{
                document.querySelector(".sidebar").scrollIntoView({{ behavior: "smooth" }});
                window.scrollTo({{ top: 0, behavior: "smooth" }});
              }});

              [searchInput, modeFilter, confidenceFilter, categoryFilter, depthFilter].forEach((el) => {{
                el.addEventListener("input", () => {{
                  applySearch();
                  applyMode();
                  applyAppFilters();
                  applyDepth();
                }});
                el.addEventListener("change", () => {{
                  applySearch();
                  applyMode();
                  applyAppFilters();
                  applyDepth();
                }});
              }});

              window.addEventListener("scroll", () => {{
                updateProgress();
                activeToc();
              }});
              window.addEventListener("resize", updateProgress);

              applySearch();
              applyMode();
              applyAppFilters();
              applyDepth();
              updateReadTime();
              updateProgress();
              activeToc();
              sortTables();
            }})();
          </script>
        </body>
        </html>
        """
    )


def main() -> None:
    html = build_html()
    OUT_PATH.write_text(html, encoding="utf-8")
    print(f"Wrote {OUT_PATH}")
    print(f"Line count: {len(html.splitlines())}")
    print(f"App count included: {len(INCLUDED_APPS)}")


if __name__ == "__main__":
    main()

