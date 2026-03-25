"""
Generates a ~2 minute test audio file of a clinician-patient mental health session.
Uses edge-tts with two different voices and pydub to combine into a single webm file.

Output: test_session.webm (in the same directory)
"""

import asyncio
import os
import tempfile

import edge_tts
from pydub import AudioSegment

CLINICIAN_VOICE = "en-AU-WilliamNeural"   # male, Australian
PATIENT_VOICE = "en-AU-NatashaNeural"      # female, Australian

SCRIPT = [
    ("clinician", "Hi, thanks for coming in today. I'm Dr. Chen. Before we start, just to let you know this session may be recorded for clinical notes — is that okay with you?"),
    ("patient",   "Yeah, that's fine."),
    ("clinician", "Great. So, what's brought you in today?"),
    ("patient",   "I've just been feeling really low lately. Like, for the past few months I guess. I don't really want to do anything anymore."),
    ("clinician", "I'm sorry to hear that. When you say feeling low — can you tell me a bit more about what that looks like for you day to day?"),
    ("patient",   "I just... I wake up and I don't really see the point. I used to go to the gym, catch up with friends. I haven't done any of that in like two months. I call in sick to work a lot."),
    ("clinician", "That sounds really exhausting. Has anything in particular happened around the time this started, or did it kind of creep up on you?"),
    ("patient",   "It sort of crept up. I mean, my relationship ended back in November, but I thought I was handling it okay. Then around Christmas it just hit me."),
    ("clinician", "That makes sense. Breakups can hit us in delayed waves. How have you been sleeping?"),
    ("patient",   "Terribly. I either can't get to sleep at all, or I sleep for like twelve hours and still feel exhausted. There's no in between."),
    ("clinician", "And appetite?"),
    ("patient",   "Not great. I've lost a bit of weight. Food just doesn't really appeal to me."),
    ("clinician", "I want to ask you something a bit harder — have you had any thoughts of harming yourself, or not wanting to be here?"),
    ("patient",   "Not like... actively. But sometimes I think it would be easier if I just didn't wake up. I haven't done anything. I just think about it sometimes."),
    ("clinician", "Thank you for telling me that — I know that's not easy to say. Those kinds of thoughts are important for us to know about. Are they becoming more frequent?"),
    ("patient",   "Maybe a bit. Mostly when I've had a really bad day at work or when I'm alone at night."),
    ("clinician", "Okay. Have you had any support around you — family, friends, anyone you've been able to talk to?"),
    ("patient",   "My mum knows something's wrong but I haven't really told her how bad it is. I don't want to worry her. My friends have tried to reach out but I just don't respond."),
    ("clinician", "That isolation can make everything feel heavier. Have you seen anyone else for support recently — a GP, a counsellor?"),
    ("patient",   "I went to my GP about six weeks ago. She referred me here. I wasn't on any medication before but she mentioned it might be worth discussing."),
    ("clinician", "That's good that you followed through on that referral. What are you hoping to get out of coming here today?"),
    ("patient",   "I guess I just want to feel normal again. Like myself. I don't even remember what that feels like anymore."),
    ("clinician", "That's a really meaningful goal. Based on what you've shared today, it sounds like you're experiencing a significant depressive episode. The sleep disruption, low motivation, withdrawal, and those passive thoughts are all things we want to take seriously and work through together."),
    ("patient",   "So what happens next?"),
    ("clinician", "We'll put together a care plan for you. That might include talking therapy here, and we'll revisit the question of medication with your GP. I also want to make sure we have a safety plan in place given what you shared about those nighttime thoughts. How does that sound?"),
    ("patient",   "Yeah. Yeah that sounds okay. I think I need the help."),
    ("clinician", "You've done a really brave thing coming in today. We'll take this one step at a time."),
]

PAUSE_BETWEEN_MS = 600


async def synthesise(text: str, voice: str, output_path: str) -> None:
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


async def build_audio() -> str:
    combined = AudioSegment.empty()
    silence = AudioSegment.silent(duration=PAUSE_BETWEEN_MS)

    with tempfile.TemporaryDirectory() as tmp:
        for i, (speaker, text) in enumerate(SCRIPT):
            voice = CLINICIAN_VOICE if speaker == "clinician" else PATIENT_VOICE
            mp3_path = os.path.join(tmp, f"line_{i:03d}.mp3")
            print(f"  [{i+1}/{len(SCRIPT)}] {speaker}: {text[:60]}...")
            await synthesise(text, voice, mp3_path)
            seg = AudioSegment.from_mp3(mp3_path)
            combined += seg + silence

    out_path = os.path.join(os.path.dirname(__file__), "test_session.webm")
    combined.export(out_path, format="webm", codec="libopus")
    duration_s = len(combined) / 1000
    print(f"\nSaved: {out_path}")
    print(f"Duration: {duration_s:.1f}s ({duration_s/60:.1f} min)")
    return out_path


if __name__ == "__main__":
    print("Generating test audio session...\n")
    asyncio.run(build_audio())
