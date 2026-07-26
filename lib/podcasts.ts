import { generateSpeech } from "ai";
import { openai } from "@ai-sdk/openai";
import type { RetrievedChunk } from "@/lib/ai/rag";
import { resolveStoragePath, saveBuffer } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import type { PodcastSettings, VoiceAssignment, VoiceName } from "@/app/actions/podcasts";

const openAiVoiceByName: Record<VoiceName, string> = {
  Atlas: "onyx",
  Orion: "echo",
  Nova: "nova",
  Luna: "shimmer",
};

function logPodcastAudioGeneration(details: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console.info("[podcast-audio:generation]", details);
}

export function getSpeakerNames(speakers: number) {
  if (speakers === 1) return ["Narrator"];
  if (speakers === 2) return ["Host", "Guest"];
  return ["Host", "Expert", "Student"];
}

export function defaultVoiceAssignments(speakers: number): VoiceAssignment[] {
  const voices: VoiceName[] = ["Atlas", "Nova", "Luna"];
  return getSpeakerNames(speakers).map((speaker, index) => ({ speaker, voice: voices[index] ?? "Orion" }));
}

export function normalizeVoiceAssignments(speakers: number, assignments: VoiceAssignment[]) {
  const defaults = defaultVoiceAssignments(speakers);
  return defaults.map((fallback) => {
    const matching = assignments.find((assignment) => assignment.speaker === fallback.speaker);
    return { speaker: fallback.speaker, voice: matching?.voice ?? fallback.voice };
  });
}

export function buildPodcastPrompt(
  chunks: RetrievedChunk[],
  prompt: string,
  duration: number,
  speakers: number,
  settings: PodcastSettings,
  voiceAssignments: VoiceAssignment[]
) {
  const context = chunks.map((chunk) => `[${chunk.title}]\n${chunk.text}`).join("\n\n---\n\n");
  const speakerNames = getSpeakerNames(speakers);
  const speakerInstructions = speakerNames.map((name) => `${name}:`).join("\n");
  const voiceLine = voiceAssignments.map((assignment) => `${assignment.speaker}: ${assignment.voice}`).join("\n");

  const toneGuide: Record<PodcastSettings["tone"], string> = {
    conversational: "casual, friendly, curious, and natural",
    professor: "authoritative, clear, academic, and precise",
    beginner_friendly: "simple, encouraging, jargon-light, and analogy-rich",
    interview_prep: "direct, practical, question-driven, and revision-focused",
    storytelling: "narrative, vivid, paced, and memorable",
  };

  const genreGuide: Record<PodcastSettings["genre"], string> = {
    educational: "a teaching episode with explanations, examples, and transitions",
    interview: "a Q&A conversation where questions unlock useful detail",
    debate: "a respectful exchange of perspectives grounded in the sources",
    news_style: "a concise, factual briefing with clear segment transitions",
    casual_conversation: "an organic conversation with reactions and follow-up questions",
  };

  const audienceGuide: Record<PodcastSettings["targetAudience"], string> = {
    beginner: "define terms and build from first principles",
    intermediate: "assume basic familiarity and deepen connections",
    advanced: "focus on nuance, edge cases, and implications",
  };

  const wordCount = duration * 145;

  return `Create a natural ${duration}-minute podcast script grounded ONLY in the notebook sources below.

SOURCE MATERIAL:
${context}

USER TOPIC:
${prompt}

REQUIREMENTS:
- Approximate length: ${wordCount} words.
- Speakers: ${speakerNames.join(", ")}.
- Voice assignments for downstream TTS:
${voiceLine}
- Tone: ${toneGuide[settings.tone]}.
- Genre: ${genreGuide[settings.genre]}.
- Audience: ${audienceGuide[settings.targetAudience]}.
- Use only facts supported by SOURCE MATERIAL.
- If sources are thin, say so naturally instead of inventing details.
- Make it sound like people talking, not a report chopped into lines.

FORMAT:
First line must be: TITLE: <short episode title>
Then write dialogue using EXACTLY these speaker labels and no others:
${speakerInstructions}

Do not include markdown, stage directions, citations, notes, or metadata beyond the title line.`;
}

export function parsePodcastTitleAndTranscript(text: string, fallbackTitle: string) {
  const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() || fallbackTitle;
  const transcript = titleMatch ? text.replace(/^TITLE:\s*.+\n*/m, "").trim() : text.trim();
  return { title, transcript };
}

export function parseSpeakerTurns(transcript: string, assignments: VoiceAssignment[]) {
  const labels = assignments.map((assignment) => assignment.speaker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = new RegExp(`^(${labels.join("|")}):\\s*(.*)$`);
  const turns: Array<{ speaker: string; text: string }> = [];

  for (const line of transcript.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(labelPattern);
    if (match) {
      turns.push({ speaker: match[1], text: match[2].trim() });
    } else if (turns.length) {
      turns[turns.length - 1].text = `${turns[turns.length - 1].text} ${trimmed}`.trim();
    }
  }

  return turns.length ? turns : [{ speaker: assignments[0]?.speaker ?? "Narrator", text: transcript }];
}

export async function generatePodcastAudio(transcript: string, assignments: VoiceAssignment[], podcastId: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured, so audio could not be generated.");

  const turns = parseSpeakerTurns(transcript, assignments).filter((turn) => turn.text.length > 0);
  if (!turns.length) throw new Error("The generated script did not contain speakable dialogue.");

  const segments: Buffer[] = [];
  for (const turn of turns) {
    const assignment = assignments.find((item) => item.speaker === turn.speaker) ?? assignments[0];
    const voice = openAiVoiceByName[assignment?.voice ?? "Nova"];
    const result = await generateSpeech({
      model: openai.speech(process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts"),
      text: turn.text,
      voice,
      outputFormat: "mp3",
      instructions: `Speak as ${turn.speaker} in a natural podcast conversation. Keep pacing warm and clear.`,
    });
    segments.push(Buffer.from(result.audio.uint8Array));
  }

  const audioBuffer = Buffer.concat(segments);
  const stored = await saveBuffer(audioBuffer, `podcasts/${podcastId}`, ".mp3");
  const audioUrl = `/api/podcasts/${podcastId}/audio?path=${encodeURIComponent(stored.path)}`;

  await prisma.podcast.update({
    where: { id: podcastId },
    data: { audioData: audioBuffer },
  });

  logPodcastAudioGeneration({
    podcastId,
    absoluteFilePath: resolveStoragePath(stored.path),
    relativePathSavedToDatabase: stored.path,
    finalAudioUrlSaved: audioUrl,
  });
  return audioUrl;
}
