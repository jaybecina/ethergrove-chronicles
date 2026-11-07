# ACE-Step reads only about 200 tokens of the caption

- **Status:** verified · **Date:** 2026-11-06 · **Evidence:** `acestep/core/generation/handler/conditioning_text.py`
  (`max_length=256`, `SFT_GEN_PROMPT`) in the ACE-Step 1.5 checkout at `../ai-audio/ACE-Step-1.5`; token counts with its
  own tokenizer (`../ai-audio/pilot/round3/make_briefs.py`)

## Symptom

The long, careful prompts of the cinematic orchestral spec ([[decisions/0025-ai-generated-audio-may-ship]]) were written
for any text-to-music tool, and the "shared style + prompt + No … list" caption is 416–440 tokens.

## Cause

The DiT text encoder tokenizes `# Instruction … # Caption … # Metas …` and truncates it to **256 tokens**. The template
and metas (bpm, time signature, key, duration) take 55 of them and come _after_ the caption, so a long caption loses
its tail first, then the metas. About 200 caption tokens get through: the 146-token shared style plus roughly the first
55 tokens of the cue prompt. The arc, the rhythm paragraph and the whole "No …" list never reach the DiT. Lyrics get
2048 tokens (that is where section tags belong), and the 5Hz LM context is 2048–4096 tokens, so the LM still sees the
full caption (**inferred**: not tested on the output).

## How to apply

- For ACE-Step, write a short form of each cue: ≤ about 190 caption tokens, counted with `make_briefs.py`. Put the arc
  and instrument roles in the `lyrics` section tags.
- Put "no …" words in `lm_negative_prompt` (a real `GenerationParams` field, LM guidance `lm_cfg_scale` 2.0), not at the end
  of the caption; the DiT never sees the tail.
- Other tools have other limits; the sheet's long prompts stay as the source text.
